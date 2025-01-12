import { ILogger } from 'js-logger';
import { StreamingSyncRequestParameterType } from './streaming-sync-types';
import { AbstractRemote } from './AbstractRemote';
import { BucketStorageAdapter } from '../bucket/BucketStorageAdapter';
import { SyncStatus, SyncStatusOptions } from '../../../db/crud/SyncStatus';
import { BaseObserver, BaseListener, Disposable } from '../../../utils/BaseObserver';
export declare enum LockType {
    CRUD = "crud",
    SYNC = "sync"
}
export declare enum SyncStreamConnectionMethod {
    HTTP = "http",
    WEB_SOCKET = "web-socket"
}
/**
 * Abstract Lock to be implemented by various JS environments
 */
export interface LockOptions<T> {
    callback: () => Promise<T>;
    type: LockType;
    signal?: AbortSignal;
}
export interface AbstractStreamingSyncImplementationOptions {
    adapter: BucketStorageAdapter;
    uploadCrud: () => Promise<void>;
    crudUploadThrottleMs?: number;
    /**
     * An identifier for which PowerSync DB this sync implementation is
     * linked to. Most commonly DB name, but not restricted to DB name.
     */
    identifier?: string;
    logger?: ILogger;
    remote: AbstractRemote;
    retryDelayMs?: number;
}
export interface StreamingSyncImplementationListener extends BaseListener {
    /**
     * Triggered whenever a status update has been attempted to be made or
     * refreshed.
     */
    statusUpdated?: ((statusUpdate: SyncStatusOptions) => void) | undefined;
    /**
     * Triggers whenever the status' members have changed in value
     */
    statusChanged?: ((status: SyncStatus) => void) | undefined;
}
/**
 * Configurable options to be used when connecting to the PowerSync
 * backend instance.
 */
export interface PowerSyncConnectionOptions {
    /**
     * The connection method to use when streaming updates from
     * the PowerSync backend instance.
     * Defaults to a HTTP streaming connection.
     */
    connectionMethod?: SyncStreamConnectionMethod;
    /**
     * These parameters are passed to the sync rules, and will be available under the`user_parameters` object.
     */
    params?: Record<string, StreamingSyncRequestParameterType>;
}
export interface StreamingSyncImplementation extends BaseObserver<StreamingSyncImplementationListener>, Disposable {
    /**
     * Connects to the sync service
     */
    connect(options?: PowerSyncConnectionOptions): Promise<void>;
    /**
     * Disconnects from the sync services.
     * @throws if not connected or if abort is not controlled internally
     */
    disconnect(): Promise<void>;
    getWriteCheckpoint: () => Promise<string>;
    hasCompletedSync: () => Promise<boolean>;
    isConnected: boolean;
    lastSyncedAt?: Date;
    syncStatus: SyncStatus;
    triggerCrudUpload: () => void;
    waitForReady(): Promise<void>;
    waitForStatus(status: SyncStatusOptions): Promise<void>;
}
export declare const DEFAULT_CRUD_UPLOAD_THROTTLE_MS = 1000;
export declare const DEFAULT_STREAMING_SYNC_OPTIONS: {
    retryDelayMs: number;
    logger: ILogger;
    crudUploadThrottleMs: number;
};
export declare const DEFAULT_STREAM_CONNECTION_OPTIONS: Required<PowerSyncConnectionOptions>;
export declare abstract class AbstractStreamingSyncImplementation extends BaseObserver<StreamingSyncImplementationListener> implements StreamingSyncImplementation {
    protected _lastSyncedAt: Date | null;
    protected options: AbstractStreamingSyncImplementationOptions;
    protected abortController: AbortController | null;
    protected crudUpdateListener?: () => void;
    protected streamingSyncPromise?: Promise<void>;
    syncStatus: SyncStatus;
    triggerCrudUpload: () => void;
    constructor(options: AbstractStreamingSyncImplementationOptions);
    waitForReady(): Promise<void>;
    waitForStatus(status: SyncStatusOptions): Promise<void>;
    get lastSyncedAt(): Date | undefined;
    get isConnected(): boolean;
    protected get logger(): ILogger;
    dispose(): Promise<void>;
    abstract obtainLock<T>(lockOptions: LockOptions<T>): Promise<T>;
    hasCompletedSync(): Promise<boolean>;
    getWriteCheckpoint(): Promise<string>;
    protected _uploadAllCrud(): Promise<void>;
    protected uploadCrudBatch(): Promise<boolean>;
    connect(options?: PowerSyncConnectionOptions): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * @deprecated use [connect instead]
     */
    streamingSync(signal?: AbortSignal, options?: PowerSyncConnectionOptions): Promise<void>;
    protected streamingSyncIteration(signal: AbortSignal, options?: PowerSyncConnectionOptions): Promise<{
        retry?: boolean;
    }>;
    protected updateSyncStatus(options: SyncStatusOptions): void;
    private delayRetry;
}
