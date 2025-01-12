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
import { Mutex } from 'async-mutex';
const MOCK_QUERY_RESPONSE = {
    rowsAffected: 0
};
/**
 * Implements a Mock DB adapter for use in Server Side Rendering (SSR).
 * This adapter will return empty results for queries, which will allow
 * server rendered views to initially generate scaffolding components
 */
export class SSRDBAdapter extends BaseObserver {
    constructor() {
        super();
        this.name = 'SSR DB';
        this.readMutex = new Mutex();
        this.writeMutex = new Mutex();
    }
    close() { }
    readLock(fn, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.readMutex.runExclusive(() => fn(this));
        });
    }
    readTransaction(fn, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.readLock(() => fn(this.generateMockTransactionContext()));
        });
    }
    writeLock(fn, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeMutex.runExclusive(() => fn(this));
        });
    }
    writeTransaction(fn, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeLock(() => fn(this.generateMockTransactionContext()));
        });
    }
    execute(query, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeMutex.runExclusive(() => __awaiter(this, void 0, void 0, function* () { return MOCK_QUERY_RESPONSE; }));
        });
    }
    executeBatch(query, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.writeMutex.runExclusive(() => __awaiter(this, void 0, void 0, function* () { return MOCK_QUERY_RESPONSE; }));
        });
    }
    getAll(sql, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            return [];
        });
    }
    getOptional(sql, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            return null;
        });
    }
    get(sql, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`No values are returned in SSR mode`);
        });
    }
    /**
     * Generates a mock context for use in read/write transactions.
     * `this` already mocks most of the API, commit and rollback mocks
     *  are added here
     */
    generateMockTransactionContext() {
        return Object.assign(Object.assign({}, this), { commit: () => __awaiter(this, void 0, void 0, function* () {
                return MOCK_QUERY_RESPONSE;
            }), rollback: () => __awaiter(this, void 0, void 0, function* () {
                return MOCK_QUERY_RESPONSE;
            }) });
    }
}
//# sourceMappingURL=SSRDBAdapter.js.map