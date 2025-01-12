import { AbstractPowerSyncDatabase, SqliteBucketStorage } from '@powersync/common';
import { ReactNativeRemote } from '../sync/stream/ReactNativeRemote';
import { ReactNativeStreamingSyncImplementation } from '../sync/stream/ReactNativeStreamingSyncImplementation';
import { ReactNativeQuickSqliteOpenFactory } from './adapters/react-native-quick-sqlite/ReactNativeQuickSQLiteOpenFactory';
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
    async _initialize() { }
    /**
     * Opens a DBAdapter using React Native Quick SQLite as the
     * default SQLite open factory.
     */
    openDBAdapter(options) {
        const defaultFactory = new ReactNativeQuickSqliteOpenFactory(options);
        return defaultFactory.openDB();
    }
    generateBucketStorageAdapter() {
        return new SqliteBucketStorage(this.database, AbstractPowerSyncDatabase.transactionMutex);
    }
    generateSyncStreamImplementation(connector) {
        const remote = new ReactNativeRemote(connector);
        return new ReactNativeStreamingSyncImplementation({
            adapter: this.bucketStorageAdapter,
            remote,
            uploadCrud: async () => {
                await this.waitForReady();
                await connector.uploadData(this);
            },
            retryDelayMs: this.options.retryDelay,
            crudUploadThrottleMs: this.options.crudUploadThrottleMs,
            identifier: this.database.name
        });
    }
}
//# sourceMappingURL=PowerSyncDatabase.js.map