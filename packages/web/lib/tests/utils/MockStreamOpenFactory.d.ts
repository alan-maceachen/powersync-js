import { PowerSyncBackendConnector, PowerSyncCredentials, AbstractPowerSyncDatabase, AbstractRemote, RemoteConnector, AbstractStreamingSyncImplementation, PowerSyncDatabaseOptions, SyncStreamOptions, DataStream, StreamingSyncLine, BSONImplementation } from '@powersync/common';
import { PowerSyncDatabase, WebPowerSyncDatabaseOptions, WASQLitePowerSyncDatabaseOpenFactory, WebPowerSyncOpenFactoryOptions } from '@powersync/web';
export declare class TestConnector implements PowerSyncBackendConnector {
    fetchCredentials(): Promise<PowerSyncCredentials>;
    uploadData(database: AbstractPowerSyncDatabase): Promise<void>;
}
export declare class MockRemote extends AbstractRemote {
    protected onStreamRequested: () => void;
    streamController: ReadableStreamDefaultController | null;
    constructor(connector: RemoteConnector, onStreamRequested: () => void);
    getBSON(): Promise<BSONImplementation>;
    post(path: string, data: any, headers?: Record<string, string> | undefined): Promise<any>;
    get(path: string, headers?: Record<string, string> | undefined): Promise<any>;
    postStreaming(path: string, data: any, headers?: Record<string, string>, signal?: AbortSignal): Promise<ReadableStream>;
    socketStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>>;
    postStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>>;
}
export declare class MockedStreamPowerSync extends PowerSyncDatabase {
    protected remote: AbstractRemote;
    constructor(options: WebPowerSyncDatabaseOptions, remote: AbstractRemote);
    protected generateSyncStreamImplementation(connector: PowerSyncBackendConnector): AbstractStreamingSyncImplementation;
}
export declare class MockStreamOpenFactory extends WASQLitePowerSyncDatabaseOpenFactory {
    protected remote: AbstractRemote;
    constructor(options: WebPowerSyncOpenFactoryOptions, remote: AbstractRemote);
    generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase;
}
