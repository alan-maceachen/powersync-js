var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { AbstractPowerSyncDatabase, SqliteBucketStorage, DEFAULT_POWERSYNC_CLOSE_OPTIONS } from '@powersync/common';
import { Mutex } from 'async-mutex';
import { WebRemote } from './sync/WebRemote';
import { SharedWebStreamingSyncImplementation } from './sync/SharedWebStreamingSyncImplementation';
import { SSRStreamingSyncImplementation } from './sync/SSRWebStreamingSyncImplementation';
import { WebStreamingSyncImplementation } from './sync/WebStreamingSyncImplementation';
import { WASQLiteOpenFactory } from './adapters/wa-sqlite/WASQLiteOpenFactory';
import { DEFAULT_WEB_SQL_FLAGS, resolveWebSQLFlags } from './adapters/web-sql-flags';
export const DEFAULT_POWERSYNC_FLAGS = Object.assign(Object.assign({}, DEFAULT_WEB_SQL_FLAGS), { externallyUnload: false });
export const resolveWebPowerSyncFlags = (flags) => {
    return Object.assign(Object.assign(Object.assign({}, DEFAULT_POWERSYNC_FLAGS), flags), resolveWebSQLFlags(flags));
};
/**
 * A PowerSync database which provides SQLite functionality
 * which is automatically synced.
 *
 * @example
 * ```typescript
 * export const db = new PowerSyncDatabase({
 *  schema: AppSchema,
 *  database: {
 *    dbFilename: 'example.db'
 *  }
 * });
 * ```
 */
export class PowerSyncDatabase extends AbstractPowerSyncDatabase {
    constructor(options) {
        super(options);
        this.options = options;
        this.resolvedFlags = resolveWebPowerSyncFlags(options.flags);
        if (this.resolvedFlags.enableMultiTabs && !this.resolvedFlags.externallyUnload) {
            this.unloadListener = () => this.close({ disconnect: false });
            window.addEventListener('unload', this.unloadListener);
        }
    }
    _initialize() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    openDBAdapter(options) {
        const defaultFactory = new WASQLiteOpenFactory(Object.assign(Object.assign({}, options), { flags: this.resolvedFlags }));
        return defaultFactory.openDB();
    }
    /**
     * Closes the database connection.
     * By default the sync stream client is only disconnected if
     * multiple tabs are not enabled.
     */
    close(options = DEFAULT_POWERSYNC_CLOSE_OPTIONS) {
        var _a;
        if (this.unloadListener) {
            window.removeEventListener('unload', this.unloadListener);
        }
        return super.close({
            // Don't disconnect by default if multiple tabs are enabled
            disconnect: (_a = options.disconnect) !== null && _a !== void 0 ? _a : !this.resolvedFlags.enableMultiTabs
        });
    }
    connect(connector, options) {
        /**
         * Using React strict mode might cause calls to connect to fire multiple times
         * Connect is wrapped inside a lock in order to prevent race conditions internally between multiple
         * connection attempts.
         */
        return this.runExclusive(() => {
            var _a;
            (_a = this.options.logger) === null || _a === void 0 ? void 0 : _a.debug('Attempting to connect to PowerSync instance');
            return super.connect(connector, options);
        });
    }
    generateBucketStorageAdapter() {
        return new SqliteBucketStorage(this.database, AbstractPowerSyncDatabase.transactionMutex);
    }
    runExclusive(cb) {
        if (this.resolvedFlags.ssrMode) {
            return PowerSyncDatabase.SHARED_MUTEX.runExclusive(cb);
        }
        return navigator.locks.request(`lock-${this.database.name}`, cb);
    }
    generateSyncStreamImplementation(connector) {
        const remote = new WebRemote(connector);
        const syncOptions = Object.assign(Object.assign({}, this.options), { flags: this.resolvedFlags, adapter: this.bucketStorageAdapter, remote, uploadCrud: () => __awaiter(this, void 0, void 0, function* () {
                yield this.waitForReady();
                yield connector.uploadData(this);
            }), identifier: this.database.name });
        switch (true) {
            case this.resolvedFlags.ssrMode:
                return new SSRStreamingSyncImplementation(syncOptions);
            case this.resolvedFlags.enableMultiTabs:
                if (!this.resolvedFlags.broadcastLogs) {
                    const warning = `
            Multiple tabs are enabled, but broadcasting of logs is disabled.
            Logs for shared sync worker will only be available in the shared worker context
          `;
                    const logger = this.options.logger;
                    logger ? logger.warn(warning) : console.warn(warning);
                }
                return new SharedWebStreamingSyncImplementation(syncOptions);
            default:
                return new WebStreamingSyncImplementation(syncOptions);
        }
    }
}
PowerSyncDatabase.SHARED_MUTEX = new Mutex();
//# sourceMappingURL=PowerSyncDatabase.js.map