import { ILogger } from 'js-logger';
import { fetch } from 'cross-fetch';
import { PowerSyncCredentials } from '../../connection/PowerSyncCredentials';
import { StreamingSyncLine, StreamingSyncRequest } from './streaming-sync-types';
import { DataStream } from '../../../utils/DataStream';
import type { BSON } from 'bson';
export type BSONImplementation = typeof BSON;
export type RemoteConnector = {
    fetchCredentials: () => Promise<PowerSyncCredentials | null>;
};
export declare const DEFAULT_REMOTE_LOGGER: ILogger;
export type SyncStreamOptions = {
    path: string;
    data: StreamingSyncRequest;
    headers?: Record<string, string>;
    abortSignal?: AbortSignal;
    fetchOptions?: Request;
};
export type FetchImplementation = typeof fetch;
/**
 * Class wrapper for providing a fetch implementation.
 * The class wrapper is used to distinguish the fetchImplementation
 * option in [AbstractRemoteOptions] from the general fetch method
 * which is typeof "function"
 */
export declare class FetchImplementationProvider {
    getFetch(): FetchImplementation;
}
export type AbstractRemoteOptions = {
    /**
     * Transforms the PowerSync base URL which might contain
     * `http(s)://` to the corresponding WebSocket variant
     * e.g. `ws(s)://`
     */
    socketUrlTransformer: (url: string) => string;
    /**
     * Optionally provide the fetch implementation to use.
     * Note that this usually needs to be bound to the global scope.
     * Binding should be done before passing here.
     */
    fetchImplementation: FetchImplementation | FetchImplementationProvider;
};
export declare const DEFAULT_REMOTE_OPTIONS: AbstractRemoteOptions;
export declare abstract class AbstractRemote {
    protected connector: RemoteConnector;
    protected logger: ILogger;
    protected credentials: PowerSyncCredentials | null;
    protected options: AbstractRemoteOptions;
    constructor(connector: RemoteConnector, logger?: ILogger, options?: Partial<AbstractRemoteOptions>);
    /**
     * @returns a fetch implementation (function)
     * which can be called to perform fetch requests
     */
    get fetch(): FetchImplementation;
    getCredentials(): Promise<PowerSyncCredentials | null>;
    protected buildRequest(path: string): Promise<{
        url: string;
        headers: {
            'content-type': string;
            Authorization: string;
        };
    }>;
    post(path: string, data: any, headers?: Record<string, string>): Promise<any>;
    get(path: string, headers?: Record<string, string>): Promise<any>;
    postStreaming(path: string, data: any, headers?: Record<string, string>, signal?: AbortSignal): Promise<any>;
    /**
     * Provides a BSON implementation. The import nature of this varies depending on the platform
     */
    abstract getBSON(): Promise<BSONImplementation>;
    /**
     * Connects to the sync/stream websocket endpoint
     */
    socketStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>>;
    /**
     * Connects to the sync/stream http endpoint
     */
    postStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>>;
}
