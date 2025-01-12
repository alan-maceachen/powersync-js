import { ILogger } from 'js-logger';
import { AbstractRemote, AbstractRemoteOptions, BSONImplementation, DataStream, RemoteConnector, StreamingSyncLine, SyncStreamOptions } from '@powersync/common';
export declare const STREAMING_POST_TIMEOUT_MS = 30000;
export declare class ReactNativeRemote extends AbstractRemote {
    protected connector: RemoteConnector;
    protected logger: ILogger;
    constructor(connector: RemoteConnector, logger?: ILogger, options?: Partial<AbstractRemoteOptions>);
    getBSON(): Promise<BSONImplementation>;
    socketStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>>;
    postStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>>;
}
