import * as Comlink from 'comlink';
import { type ILogger } from 'js-logger';
import { type AbstractStreamingSyncImplementation, type StreamingSyncImplementation, type LockOptions, type StreamingSyncImplementationListener, type SyncStatusOptions, type PowerSyncConnectionOptions, BaseObserver, SyncStatus } from '@powersync/common';
import { WebStreamingSyncImplementationOptions } from '../../db/sync/WebStreamingSyncImplementation';
import { AbstractSharedSyncClientProvider } from './AbstractSharedSyncClientProvider';
/**
 * Manual message events for shared sync clients
 */
export declare enum SharedSyncClientEvent {
    /**
     * This client requests the shared sync manager should
     * close it's connection to the client.
     */
    CLOSE_CLIENT = "close-client"
}
export type ManualSharedSyncPayload = {
    event: SharedSyncClientEvent;
    data: any;
};
export type SharedSyncInitOptions = {
    dbName: string;
    streamOptions: Omit<WebStreamingSyncImplementationOptions, 'adapter' | 'uploadCrud' | 'remote'>;
};
export interface SharedSyncImplementationListener extends StreamingSyncImplementationListener {
    initialized: () => void;
}
export type WrappedSyncPort = {
    port: MessagePort;
    clientProvider: Comlink.Remote<AbstractSharedSyncClientProvider>;
};
export type RemoteOperationAbortController = {
    controller: AbortController;
    activePort: WrappedSyncPort;
};
/**
 * Shared sync implementation which runs inside a shared webworker
 */
export declare class SharedSyncImplementation extends BaseObserver<SharedSyncImplementationListener> implements StreamingSyncImplementation {
    protected ports: WrappedSyncPort[];
    protected syncStreamClient?: AbstractStreamingSyncImplementation;
    protected isInitialized: Promise<void>;
    protected statusListener?: () => void;
    protected fetchCredentialsController?: RemoteOperationAbortController;
    protected uploadDataController?: RemoteOperationAbortController;
    syncStatus: SyncStatus;
    broadCastLogger: ILogger;
    constructor();
    waitForStatus(status: SyncStatusOptions): Promise<void>;
    get lastSyncedAt(): Date | undefined;
    get isConnected(): boolean;
    waitForReady(): Promise<void>;
    /**
     * Configures the DBAdapter connection and a streaming sync client.
     */
    init(dbWorkerPort: MessagePort, params: SharedSyncInitOptions): Promise<void>;
    dispose(): Promise<void | undefined>;
    /**
     * Connects to the PowerSync backend instance.
     * Multiple tabs can safely call this in their initialization.
     * The connection will simply be reconnected whenever a new tab
     * connects.
     */
    connect(options?: PowerSyncConnectionOptions): Promise<any>;
    disconnect(): Promise<any>;
    /**
     * Adds a new client tab's message port to the list of connected ports
     */
    addPort(port: MessagePort): void;
    /**
     * Removes a message port client from this manager's managed
     * clients.
     */
    removePort(port: MessagePort): void;
    triggerCrudUpload(): void;
    obtainLock<T>(lockOptions: LockOptions<T>): Promise<T>;
    hasCompletedSync(): Promise<boolean>;
    getWriteCheckpoint(): Promise<string>;
    /**
     * A method to update the all shared statuses for each
     * client.
     */
    private updateAllStatuses;
    /**
     * A function only used for unit tests which updates the internal
     * sync stream client and all tab client's sync status
     */
    private _testUpdateAllStatuses;
}
