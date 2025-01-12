import { type AbstractStreamingSyncImplementation, type PowerSyncBackendConnector, type BucketStorageAdapter, type PowerSyncCloseOptions, type PowerSyncConnectionOptions, AbstractPowerSyncDatabase, DBAdapter, SQLOpenOptions, PowerSyncDatabaseOptionsWithDBAdapter, PowerSyncDatabaseOptionsWithOpenFactory, PowerSyncDatabaseOptionsWithSettings, PowerSyncDatabaseOptions } from '@powersync/common';
import { Mutex } from 'async-mutex';
import { WebSQLFlags } from './adapters/web-sql-flags';
export interface WebPowerSyncFlags extends WebSQLFlags {
    /**
     * Externally unload open PowerSync database instances when the window closes.
     * Setting this to `true` requires calling `close` on all open PowerSyncDatabase
     * instances before the window unloads
     */
    externallyUnload?: boolean;
}
type WithWebFlags<Base> = Base & {
    flags?: WebPowerSyncFlags;
};
export type WebPowerSyncDatabaseOptionsWithAdapter = WithWebFlags<PowerSyncDatabaseOptionsWithDBAdapter>;
export type WebPowerSyncDatabaseOptionsWithOpenFactory = WithWebFlags<PowerSyncDatabaseOptionsWithOpenFactory>;
export type WebPowerSyncDatabaseOptionsWithSettings = WithWebFlags<PowerSyncDatabaseOptionsWithSettings>;
export type WebPowerSyncDatabaseOptions = WithWebFlags<PowerSyncDatabaseOptions>;
export declare const DEFAULT_POWERSYNC_FLAGS: Required<WebPowerSyncFlags>;
export declare const resolveWebPowerSyncFlags: (flags?: WebPowerSyncFlags) => WebPowerSyncFlags;
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
export declare class PowerSyncDatabase extends AbstractPowerSyncDatabase {
    protected options: WebPowerSyncDatabaseOptions;
    static SHARED_MUTEX: Mutex;
    protected unloadListener?: () => Promise<void>;
    protected resolvedFlags: WebPowerSyncFlags;
    constructor(options: WebPowerSyncDatabaseOptionsWithAdapter);
    constructor(options: WebPowerSyncDatabaseOptionsWithOpenFactory);
    constructor(options: WebPowerSyncDatabaseOptionsWithSettings);
    constructor(options: WebPowerSyncDatabaseOptions);
    _initialize(): Promise<void>;
    protected openDBAdapter(options: SQLOpenOptions): DBAdapter;
    /**
     * Closes the database connection.
     * By default the sync stream client is only disconnected if
     * multiple tabs are not enabled.
     */
    close(options?: PowerSyncCloseOptions): Promise<void>;
    connect(connector: PowerSyncBackendConnector, options?: PowerSyncConnectionOptions): Promise<void>;
    protected generateBucketStorageAdapter(): BucketStorageAdapter;
    protected runExclusive<T>(cb: () => Promise<T>): Promise<any>;
    protected generateSyncStreamImplementation(connector: PowerSyncBackendConnector): AbstractStreamingSyncImplementation;
}
export {};
