import { SQLOpenOptions } from '@powersync/common';
/**
 * Common settings used when creating SQL connections on web.
 */
export interface WebSQLFlags {
    /**
     * Broadcast logs from shared workers, such as the shared sync worker,
     * to individual tabs. This defaults to true.
     */
    broadcastLogs?: boolean;
    /**
     * SQLite operations are currently not supported in SSR mode.
     * A warning will be logged if attempting to use SQLite in SSR.
     * Setting this to `true` will disabled the warning above.
     */
    disableSSRWarning?: boolean;
    /**
     * Enables multi tab support
     */
    enableMultiTabs?: boolean;
    /**
     * The SQLite connection is often executed through a web worker
     * in order to offload computation. This can be used to manually
     * disable the use of web workers in environments where web workers
     * might be unstable.
     */
    useWebWorker?: boolean;
    /**
     * Open in SSR placeholder mode. DB operations and Sync operations will be a No-op
     */
    ssrMode?: boolean;
}
/**
 * Options for opening a Web SQL connection
 */
export interface WebSQLOpenFactoryOptions extends SQLOpenOptions {
    flags?: WebSQLFlags;
}
export declare function isServerSide(): boolean;
export declare const DEFAULT_WEB_SQL_FLAGS: Required<WebSQLFlags>;
export declare function resolveWebSQLFlags(flags?: WebSQLFlags): WebSQLFlags;
