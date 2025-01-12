import * as Comlink from 'comlink';
import { WebStreamingSyncImplementation, WebStreamingSyncImplementationOptions } from './WebStreamingSyncImplementation';
import { SharedSyncImplementation } from '../../worker/sync/SharedSyncImplementation';
import { AbstractSharedSyncClientProvider } from '../../worker/sync/AbstractSharedSyncClientProvider';
import { PowerSyncConnectionOptions, PowerSyncCredentials, SyncStatusOptions } from '@powersync/common';
/**
 * The shared worker will trigger methods on this side of the message port
 * via this client provider.
 */
declare class SharedSyncClientProvider extends AbstractSharedSyncClientProvider {
    protected options: WebStreamingSyncImplementationOptions;
    statusChanged: (status: SyncStatusOptions) => void;
    constructor(options: WebStreamingSyncImplementationOptions, statusChanged: (status: SyncStatusOptions) => void);
    fetchCredentials(): Promise<PowerSyncCredentials | null>;
    uploadCrud(): Promise<void>;
    get logger(): import("js-logger").ILogger | undefined;
    trace(...x: any[]): void;
    debug(...x: any[]): void;
    info(...x: any[]): void;
    log(...x: any[]): void;
    warn(...x: any[]): void;
    error(...x: any[]): void;
    time(label: string): void;
    timeEnd(label: string): void;
}
export declare class SharedWebStreamingSyncImplementation extends WebStreamingSyncImplementation {
    protected syncManager: Comlink.Remote<SharedSyncImplementation>;
    protected clientProvider: SharedSyncClientProvider;
    protected messagePort: MessagePort;
    protected isInitialized: Promise<void>;
    constructor(options: WebStreamingSyncImplementationOptions);
    /**
     * Starts the sync process, this effectively acts as a call to
     * `connect` if not yet connected.
     */
    connect(options?: PowerSyncConnectionOptions): Promise<void>;
    disconnect(): Promise<void>;
    getWriteCheckpoint(): Promise<string>;
    hasCompletedSync(): Promise<boolean>;
    dispose(): Promise<void>;
    waitForReady(): Promise<void>;
    /**
     * Used in tests to force a connection states
     */
    private _testUpdateStatus;
}
export {};
