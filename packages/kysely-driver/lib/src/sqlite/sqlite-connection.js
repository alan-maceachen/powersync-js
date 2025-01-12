var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var _PowerSyncConnection_db, _PowerSyncConnection_completeTransaction, _PowerSyncConnection_tx;
/**
 * Represent a Kysely connection to the PowerSync database.
 *
 * The actual locks are acquired on-demand when a transaction is started.
 *
 * When not using transactions, we rely on the automatic locks.
 *
 * This allows us to bypass write locks when doing pure select queries outside a transaction.
 */
export class PowerSyncConnection {
    constructor(db) {
        _PowerSyncConnection_db.set(this, void 0);
        _PowerSyncConnection_completeTransaction.set(this, void 0);
        _PowerSyncConnection_tx.set(this, void 0);
        __classPrivateFieldSet(this, _PowerSyncConnection_db, db, "f");
        __classPrivateFieldSet(this, _PowerSyncConnection_tx, null, "f");
        __classPrivateFieldSet(this, _PowerSyncConnection_completeTransaction, null, "f");
    }
    executeQuery(compiledQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const { sql, parameters, query } = compiledQuery;
            const context = (_a = __classPrivateFieldGet(this, _PowerSyncConnection_tx, "f")) !== null && _a !== void 0 ? _a : __classPrivateFieldGet(this, _PowerSyncConnection_db, "f");
            if (query.kind === 'SelectQueryNode') {
                // Optimizaton: use getAll() instead of execute() if it's a select query
                const rows = yield context.getAll(sql, parameters);
                return {
                    rows: rows
                };
            }
            const result = yield context.execute(sql, parameters);
            return {
                insertId: result.insertId ? BigInt(result.insertId) : undefined,
                numAffectedRows: BigInt(result.rowsAffected),
                rows: (_c = (_b = result.rows) === null || _b === void 0 ? void 0 : _b._array) !== null && _c !== void 0 ? _c : []
            };
        });
    }
    streamQuery(compiledQuery) {
        return __asyncGenerator(this, arguments, function* streamQuery_1() {
            // Not actually streamed
            const results = yield __await(this.executeQuery(compiledQuery));
            yield yield __await({
                rows: results.rows
            });
        });
    }
    beginTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Check if there is already an active transaction?
            /**
             * Returns a promise which resolves once a transaction has been started.
             * Rejects if any errors occur in obtaining the lock.
             */
            return new Promise((resolve, reject) => {
                /**
                 * Starts a transaction, resolves the `beginTransaction` promise
                 * once it's started. The transaction waits until the `this.#release`
                 * callback is executed.
                 */
                __classPrivateFieldGet(this, _PowerSyncConnection_db, "f")
                    .writeTransaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    // Set the current active transaction
                    __classPrivateFieldSet(this, _PowerSyncConnection_tx, tx, "f");
                    /**
                     * Wait for this transaction to be completed
                     * Rejecting would cause any uncommitted changes to be
                     * rolled back.
                     */
                    const transactionCompleted = new Promise((resolve) => {
                        __classPrivateFieldSet(this, _PowerSyncConnection_completeTransaction, resolve, "f");
                    });
                    // Allow this transaction to be used externally
                    resolve();
                    yield transactionCompleted;
                }))
                    .catch(reject);
            });
        });
    }
    commitTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!__classPrivateFieldGet(this, _PowerSyncConnection_tx, "f")) {
                throw new Error('Transaction is not defined');
            }
            yield __classPrivateFieldGet(this, _PowerSyncConnection_tx, "f").commit();
            this.releaseTransaction();
        });
    }
    rollbackTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!__classPrivateFieldGet(this, _PowerSyncConnection_tx, "f")) {
                throw new Error('Transaction is not defined');
            }
            yield __classPrivateFieldGet(this, _PowerSyncConnection_tx, "f").rollback();
            this.releaseTransaction();
        });
    }
    releaseConnection() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    releaseTransaction() {
        if (!__classPrivateFieldGet(this, _PowerSyncConnection_completeTransaction, "f")) {
            throw new Error(`Not able to release transaction`);
        }
        __classPrivateFieldGet(this, _PowerSyncConnection_completeTransaction, "f").call(this);
        __classPrivateFieldSet(this, _PowerSyncConnection_completeTransaction, null, "f");
        __classPrivateFieldSet(this, _PowerSyncConnection_tx, null, "f");
    }
}
_PowerSyncConnection_db = new WeakMap(), _PowerSyncConnection_completeTransaction = new WeakMap(), _PowerSyncConnection_tx = new WeakMap();
//# sourceMappingURL=sqlite-connection.js.map