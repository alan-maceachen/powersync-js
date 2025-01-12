var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BaseObserver } from '@powersync/common';
import * as Comlink from 'comlink';
import Logger from 'js-logger';
import { _openDB } from '../../../shared/open-db';
import { getWorkerDatabaseOpener } from '../../../worker/db/open-worker-database';
/**
 * Adapter for WA-SQLite SQLite connections.
 */
export class WASQLiteDBAdapter extends BaseObserver {
    constructor(options) {
        var _a;
        super();
        this.options = options;
        /**
         * Wraps the worker execute function, awaiting for it to be available
         */
        this._execute = (sql, bindings) => __awaiter(this, void 0, void 0, function* () {
            yield this.initialized;
            const result = yield this.methods.execute(sql, bindings);
            return Object.assign(Object.assign({}, result), { rows: Object.assign(Object.assign({}, result.rows), { item: (idx) => result.rows._array[idx] }) });
        });
        /**
         * Wraps the worker executeBatch function, awaiting for it to be available
         */
        this._executeBatch = (query, params) => __awaiter(this, void 0, void 0, function* () {
            yield this.initialized;
            const result = yield this.methods.executeBatch(query, params);
            return Object.assign(Object.assign({}, result), { rows: undefined });
        });
        this.logger = Logger.get('WASQLite');
        this.dbGetHelpers = null;
        this.methods = null;
        this.debugMode = (_a = options.debugMode) !== null && _a !== void 0 ? _a : false;
        if (this.debugMode) {
            const originalExecute = this._execute.bind(this);
            this._execute = (sql, bindings) => __awaiter(this, void 0, void 0, function* () {
                const start = performance.now();
                try {
                    const r = yield originalExecute(sql, bindings);
                    performance.measure(`[SQL] ${sql}`, { start });
                    return r;
                }
                catch (e) {
                    performance.measure(`[SQL] [ERROR: ${e.message}] ${sql}`, { start });
                    throw e;
                }
            });
        }
        this.initialized = this.init();
        this.dbGetHelpers = this.generateDBHelpers({
            execute: (query, params) => this.acquireLock(() => this._execute(query, params))
        });
    }
    get name() {
        return this.options.dbFilename;
    }
    get flags() {
        var _a;
        return (_a = this.options.flags) !== null && _a !== void 0 ? _a : {};
    }
    getWorker() { }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const { enableMultiTabs, useWebWorker } = this.flags;
            if (!enableMultiTabs) {
                this.logger.warn('Multiple tabs are not enabled in this browser');
            }
            if (useWebWorker) {
                const dbOpener = this.options.workerPort
                    ? Comlink.wrap(this.options.workerPort)
                    : getWorkerDatabaseOpener(this.options.dbFilename, enableMultiTabs);
                this.methods = yield dbOpener(this.options.dbFilename);
                this.methods.registerOnTableChange(Comlink.proxy((opType, tableName, rowId) => {
                    this.iterateListeners((cb) => { var _a; return (_a = cb.tablesUpdated) === null || _a === void 0 ? void 0 : _a.call(cb, { opType, table: tableName, rowId }); });
                }));
                return;
            }
            this.methods = yield _openDB(this.options.dbFilename, { useWebWorker: false });
            this.methods.registerOnTableChange((opType, tableName, rowId) => {
                this.iterateListeners((cb) => { var _a; return (_a = cb.tablesUpdated) === null || _a === void 0 ? void 0 : _a.call(cb, { opType, table: tableName, rowId }); });
            });
        });
    }
    execute(query, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeLock((ctx) => ctx.execute(query, params));
        });
    }
    executeBatch(query, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeLock((ctx) => this._executeBatch(query, params));
        });
    }
    /**
     * Attempts to close the connection.
     * Shared workers might not actually close the connection if other
     * tabs are still using it.
     */
    close() {
        var _a, _b;
        (_b = (_a = this.methods) === null || _a === void 0 ? void 0 : _a.close) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    getAll(sql, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialized;
            return this.dbGetHelpers.getAll(sql, parameters);
        });
    }
    getOptional(sql, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialized;
            return this.dbGetHelpers.getOptional(sql, parameters);
        });
    }
    get(sql, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialized;
            return this.dbGetHelpers.get(sql, parameters);
        });
    }
    readLock(fn, options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialized;
            return this.acquireLock(() => __awaiter(this, void 0, void 0, function* () { return fn(this.generateDBHelpers({ execute: this._execute })); }));
        });
    }
    writeLock(fn, options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialized;
            return this.acquireLock(() => __awaiter(this, void 0, void 0, function* () { return fn(this.generateDBHelpers({ execute: this._execute })); }));
        });
    }
    acquireLock(callback) {
        return navigator.locks.request(`db-lock-${this.options.dbFilename}`, callback);
    }
    readTransaction(fn, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.readLock(this.wrapTransaction(fn));
        });
    }
    writeTransaction(fn, options) {
        return this.writeLock(this.wrapTransaction(fn));
    }
    /**
     * Wraps a lock context into a transaction context
     */
    wrapTransaction(cb) {
        return (tx) => __awaiter(this, void 0, void 0, function* () {
            yield this._execute('BEGIN TRANSACTION');
            let finalized = false;
            const commit = () => __awaiter(this, void 0, void 0, function* () {
                if (finalized) {
                    return { rowsAffected: 0 };
                }
                finalized = true;
                return this._execute('COMMIT');
            });
            const rollback = () => {
                finalized = true;
                return this._execute('ROLLBACK');
            };
            try {
                const result = yield cb(Object.assign(Object.assign({}, tx), { commit,
                    rollback }));
                if (!finalized) {
                    yield commit();
                }
                return result;
            }
            catch (ex) {
                this.logger.debug('Caught ex in transaction', ex);
                try {
                    yield rollback();
                }
                catch (ex2) {
                    // In rare cases, a rollback may fail.
                    // Safe to ignore.
                }
                throw ex;
            }
        });
    }
    generateDBHelpers(tx) {
        return Object.assign(Object.assign({}, tx), { 
            /**
             *  Execute a read-only query and return results
             */
            getAll(sql, parameters) {
                return __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    const res = yield tx.execute(sql, parameters);
                    return (_b = (_a = res.rows) === null || _a === void 0 ? void 0 : _a._array) !== null && _b !== void 0 ? _b : [];
                });
            },
            /**
             * Execute a read-only query and return the first result, or null if the ResultSet is empty.
             */
            getOptional(sql, parameters) {
                return __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    const res = yield tx.execute(sql, parameters);
                    return (_b = (_a = res.rows) === null || _a === void 0 ? void 0 : _a.item(0)) !== null && _b !== void 0 ? _b : null;
                });
            },
            /**
             * Execute a read-only query and return the first result, error if the ResultSet is empty.
             */
            get(sql, parameters) {
                return __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const res = yield tx.execute(sql, parameters);
                    const first = (_a = res.rows) === null || _a === void 0 ? void 0 : _a.item(0);
                    if (!first) {
                        throw new Error('Result set is empty');
                    }
                    return first;
                });
            } });
    }
}
//# sourceMappingURL=WASQLiteDBAdapter.js.map