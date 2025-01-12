var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import * as SQLite from '@journeyapps/wa-sqlite';
import '@journeyapps/wa-sqlite';
import * as Comlink from 'comlink';
import { Mutex } from 'async-mutex';
let nextId = 1;
export function _openDB(dbFileName_1) {
    return __awaiter(this, arguments, void 0, function* (dbFileName, options = { useWebWorker: true }) {
        const { default: moduleFactory } = yield import('@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs');
        const module = yield moduleFactory();
        const sqlite3 = SQLite.Factory(module);
        const { IDBBatchAtomicVFS } = yield import('@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js');
        const vfs = new IDBBatchAtomicVFS(dbFileName);
        sqlite3.vfs_register(vfs, true);
        const db = yield sqlite3.open_v2(dbFileName);
        const statementMutex = new Mutex();
        /**
         * Listeners are exclusive to the DB connection.
         */
        const listeners = new Map();
        sqlite3.register_table_onchange_hook(db, (opType, tableName, rowId) => {
            Array.from(listeners.values()).forEach((l) => l(opType, tableName, rowId));
        });
        /**
         * This executes single SQL statements inside a requested lock.
         */
        const execute = (sql, bindings) => __awaiter(this, void 0, void 0, function* () {
            // Running multiple statements on the same connection concurrently should not be allowed
            return _acquireExecuteLock(() => __awaiter(this, void 0, void 0, function* () {
                return executeSingleStatement(sql, bindings);
            }));
        });
        /**
         * This requests a lock for executing statements.
         * Should only be used internally.
         */
        const _acquireExecuteLock = (callback) => {
            return statementMutex.runExclusive(callback);
        };
        /**
         * This executes a single statement using SQLite3.
         */
        const executeSingleStatement = (sql, bindings) => __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            const results = [];
            try {
                for (var _d = true, _e = __asyncValues(sqlite3.statements(db, sql)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const stmt = _c;
                    let columns;
                    const wrappedBindings = bindings ? [bindings] : [[]];
                    for (const binding of wrappedBindings) {
                        // TODO not sure why this is needed currently, but booleans break
                        binding.forEach((b, index, arr) => {
                            if (typeof b == 'boolean') {
                                arr[index] = b ? 1 : 0;
                            }
                        });
                        sqlite3.reset(stmt);
                        if (bindings) {
                            sqlite3.bind_collection(stmt, binding);
                        }
                        const rows = [];
                        while ((yield sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
                            const row = sqlite3.row(stmt);
                            rows.push(row);
                        }
                        columns = columns !== null && columns !== void 0 ? columns : sqlite3.column_names(stmt);
                        if (columns.length) {
                            results.push({ columns, rows });
                        }
                    }
                    // When binding parameters, only a single statement is executed.
                    if (bindings) {
                        break;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            const rows = [];
            for (const resultset of results) {
                for (const row of resultset.rows) {
                    const outRow = {};
                    resultset.columns.forEach((key, index) => {
                        outRow[key] = row[index];
                    });
                    rows.push(outRow);
                }
            }
            const result = {
                insertId: sqlite3.last_insert_id(db),
                rowsAffected: sqlite3.changes(db),
                rows: {
                    _array: rows,
                    length: rows.length
                }
            };
            return result;
        });
        /**
         * This executes SQL statements in a batch.
         */
        const executeBatch = (sql, bindings) => __awaiter(this, void 0, void 0, function* () {
            return _acquireExecuteLock(() => __awaiter(this, void 0, void 0, function* () {
                let affectedRows = 0;
                const str = sqlite3.str_new(db, sql);
                const query = sqlite3.str_value(str);
                try {
                    yield executeSingleStatement('BEGIN TRANSACTION');
                    //Prepare statement once
                    const prepared = yield sqlite3.prepare_v2(db, query);
                    if (prepared === null) {
                        return {
                            rowsAffected: 0,
                            rows: { _array: [], length: 0 }
                        };
                    }
                    const wrappedBindings = bindings ? bindings : [];
                    for (const binding of wrappedBindings) {
                        // TODO not sure why this is needed currently, but booleans break
                        for (let i = 0; i < binding.length; i++) {
                            const b = binding[i];
                            if (typeof b == 'boolean') {
                                binding[i] = b ? 1 : 0;
                            }
                        }
                        //Reset bindings
                        sqlite3.reset(prepared.stmt);
                        if (bindings) {
                            sqlite3.bind_collection(prepared.stmt, binding);
                        }
                        const result = yield sqlite3.step(prepared.stmt);
                        if (result === SQLite.SQLITE_DONE) {
                            //The value returned by sqlite3_changes() immediately after an INSERT, UPDATE or DELETE statement run on a view is always zero.
                            affectedRows += sqlite3.changes(db);
                        }
                    }
                    //Finalize prepared statement
                    yield sqlite3.finalize(prepared.stmt);
                    yield executeSingleStatement('COMMIT');
                }
                catch (err) {
                    yield executeSingleStatement('ROLLBACK');
                    return {
                        rowsAffected: 0,
                        rows: { _array: [], length: 0 }
                    };
                }
                finally {
                    sqlite3.str_finish(str);
                }
                const result = {
                    rowsAffected: affectedRows,
                    rows: { _array: [], length: 0 }
                };
                return result;
            }));
        });
        if (options.useWebWorker) {
            const registerOnTableChange = (callback) => {
                const id = nextId++;
                listeners.set(id, callback);
                return Comlink.proxy(() => {
                    listeners.delete(id);
                });
            };
            return {
                execute: Comlink.proxy(execute),
                executeBatch: Comlink.proxy(executeBatch),
                registerOnTableChange: Comlink.proxy(registerOnTableChange),
                close: Comlink.proxy(() => {
                    sqlite3.close(db);
                })
            };
        }
        const registerOnTableChange = (callback) => {
            const id = nextId++;
            listeners.set(id, callback);
            return () => {
                listeners.delete(id);
            };
        };
        return {
            execute: execute,
            executeBatch: executeBatch,
            registerOnTableChange: registerOnTableChange,
            close: () => sqlite3.close(db)
        };
    });
}
//# sourceMappingURL=open-db.js.map