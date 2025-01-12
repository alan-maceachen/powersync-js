import throttle from 'lodash/throttle';
import Logger from 'js-logger';
import { isStreamingKeepalive, isStreamingSyncCheckpoint, isStreamingSyncCheckpointComplete, isStreamingSyncCheckpointDiff, isStreamingSyncData } from './streaming-sync-types';
import { SyncStatus } from '../../../db/crud/SyncStatus';
import { SyncDataBucket } from '../bucket/SyncDataBucket';
import { BaseObserver } from '../../../utils/BaseObserver';
import { AbortOperation } from '../../../utils/AbortOperation';
export var LockType;
(function (LockType) {
    LockType["CRUD"] = "crud";
    LockType["SYNC"] = "sync";
})(LockType || (LockType = {}));
export var SyncStreamConnectionMethod;
(function (SyncStreamConnectionMethod) {
    SyncStreamConnectionMethod["HTTP"] = "http";
    SyncStreamConnectionMethod["WEB_SOCKET"] = "web-socket";
})(SyncStreamConnectionMethod || (SyncStreamConnectionMethod = {}));
export const DEFAULT_CRUD_UPLOAD_THROTTLE_MS = 1000;
export const DEFAULT_STREAMING_SYNC_OPTIONS = {
    retryDelayMs: 5000,
    logger: Logger.get('PowerSyncStream'),
    crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS
};
export const DEFAULT_STREAM_CONNECTION_OPTIONS = {
    connectionMethod: SyncStreamConnectionMethod.HTTP,
    params: {}
};
export class AbstractStreamingSyncImplementation extends BaseObserver {
    _lastSyncedAt;
    options;
    abortController;
    crudUpdateListener;
    streamingSyncPromise;
    syncStatus;
    triggerCrudUpload;
    constructor(options) {
        super();
        this.options = { ...DEFAULT_STREAMING_SYNC_OPTIONS, ...options };
        this.syncStatus = new SyncStatus({
            connected: false,
            lastSyncedAt: undefined,
            dataFlow: {
                uploading: false,
                downloading: false
            }
        });
        this.abortController = null;
        this.triggerCrudUpload = throttle(() => {
            if (!this.syncStatus.connected || this.syncStatus.dataFlowStatus.uploading) {
                return;
            }
            this._uploadAllCrud();
        }, this.options.crudUploadThrottleMs, { trailing: true });
    }
    async waitForReady() { }
    waitForStatus(status) {
        return new Promise((resolve) => {
            const l = this.registerListener({
                statusChanged: (updatedStatus) => {
                    /**
                     * Match only the partial status options provided in the
                     * matching status
                     */
                    const matchPartialObject = (compA, compB) => {
                        return Object.entries(compA).every(([key, value]) => {
                            const comparisonBValue = compB[key];
                            if (typeof value == 'object' && typeof comparisonBValue == 'object') {
                                return matchPartialObject(value, comparisonBValue);
                            }
                            return value == comparisonBValue;
                        });
                    };
                    if (matchPartialObject(status, updatedStatus.toJSON())) {
                        resolve();
                        l?.();
                    }
                }
            });
        });
    }
    get lastSyncedAt() {
        const lastSynced = this.syncStatus.lastSyncedAt;
        return lastSynced && new Date(lastSynced);
    }
    get isConnected() {
        return this.syncStatus.connected;
    }
    get logger() {
        return this.options.logger;
    }
    async dispose() {
        this.crudUpdateListener?.();
        this.crudUpdateListener = undefined;
    }
    async hasCompletedSync() {
        return this.options.adapter.hasCompletedSync();
    }
    async getWriteCheckpoint() {
        const response = await this.options.remote.get('/write-checkpoint2.json');
        return response['data']['write_checkpoint'];
    }
    async _uploadAllCrud() {
        return this.obtainLock({
            type: LockType.CRUD,
            callback: async () => {
                this.updateSyncStatus({
                    dataFlow: {
                        uploading: true
                    }
                });
                while (true) {
                    try {
                        const done = await this.uploadCrudBatch();
                        if (done) {
                            break;
                        }
                    }
                    catch (ex) {
                        this.updateSyncStatus({
                            dataFlow: {
                                uploading: false
                            }
                        });
                        await this.delayRetry();
                        if (!this.isConnected) {
                            // Exit the upload loop if the sync stream is no longer connected
                            break;
                        }
                        this.logger.debug(`Caught exception when uploading. Upload will retry after a delay. Exception: ${ex.message}`);
                    }
                    finally {
                        this.updateSyncStatus({
                            dataFlow: {
                                uploading: false
                            }
                        });
                    }
                }
            }
        });
    }
    async uploadCrudBatch() {
        const hasCrud = await this.options.adapter.hasCrud();
        if (hasCrud) {
            await this.options.uploadCrud();
            return false;
        }
        else {
            await this.options.adapter.updateLocalTarget(() => this.getWriteCheckpoint());
            return true;
        }
    }
    async connect(options) {
        if (this.abortController) {
            await this.disconnect();
        }
        this.abortController = new AbortController();
        this.streamingSyncPromise = this.streamingSync(this.abortController.signal, options);
        // Return a promise that resolves when the connection status is updated
        return new Promise((resolve) => {
            const l = this.registerListener({
                statusUpdated: (update) => {
                    // This is triggered as soon as a connection is read from
                    if (typeof update.connected == 'undefined') {
                        // only concern with connection updates
                        return;
                    }
                    if (update.connected == false) {
                        /**
                         * This function does not reject if initial connect attempt failed
                         */
                        this.logger.warn('Initial connect attempt did not successfully connect to server');
                    }
                    resolve();
                    l();
                }
            });
        });
    }
    async disconnect() {
        if (!this.abortController) {
            return;
        }
        // This might be called multiple times
        if (!this.abortController.signal.aborted) {
            this.abortController.abort(new AbortOperation('Disconnect has been requested'));
        }
        // Await any pending operations before completing the disconnect operation
        try {
            await this.streamingSyncPromise;
        }
        catch (ex) {
            // The operation might have failed, all we care about is if it has completed
            this.logger.warn(ex);
        }
        this.streamingSyncPromise = undefined;
        this.abortController = null;
        this.updateSyncStatus({ connected: false });
    }
    /**
     * @deprecated use [connect instead]
     */
    async streamingSync(signal, options) {
        if (!signal) {
            this.abortController = new AbortController();
            signal = this.abortController.signal;
        }
        /**
         * Listen for CRUD updates and trigger upstream uploads
         */
        this.crudUpdateListener = this.options.adapter.registerListener({
            crudUpdate: () => this.triggerCrudUpload()
        });
        /**
         * Create a new abort controller which aborts items downstream.
         * This is needed to close any previous connections on exception.
         */
        let nestedAbortController = new AbortController();
        signal.addEventListener('abort', () => {
            /**
             * A request for disconnect was received upstream. Relay the request
             * to the nested abort controller.
             */
            nestedAbortController.abort(signal?.reason ?? new AbortOperation('Received command to disconnect from upstream'));
            this.crudUpdateListener?.();
            this.crudUpdateListener = undefined;
            this.updateSyncStatus({
                connected: false,
                dataFlow: {
                    downloading: false
                }
            });
        });
        /**
         * This loops runs until [retry] is false or the abort signal is set to aborted.
         * Aborting the nestedAbortController will:
         *  - Abort any pending fetch requests
         *  - Close any sync stream ReadableStreams (which will also close any established network requests)
         */
        while (true) {
            try {
                if (signal?.aborted) {
                    break;
                }
                const { retry } = await this.streamingSyncIteration(nestedAbortController.signal, options);
                if (!retry) {
                    /**
                     * A sync error ocurred that we cannot recover from here.
                     * This loop must terminate.
                     * The nestedAbortController will close any open network requests and streams below.
                     */
                    break;
                }
                // Continue immediately
            }
            catch (ex) {
                /**
                 * Either:
                 *  - A network request failed with a failed connection or not OKAY response code.
                 *  - There was a sync processing error.
                 * This loop will retry.
                 * The nested abort controller will cleanup any open network requests and streams.
                 * The WebRemote should only abort pending fetch requests or close active Readable streams.
                 */
                if (ex instanceof AbortOperation) {
                    this.logger.warn(ex);
                }
                else {
                    this.logger.error(ex);
                }
                await this.delayRetry();
            }
            finally {
                if (!signal.aborted) {
                    nestedAbortController.abort(new AbortOperation('Closing sync stream network requests before retry.'));
                    nestedAbortController = new AbortController();
                }
                this.updateSyncStatus({
                    connected: false
                });
                // On error, wait a little before retrying
            }
        }
        // Mark as disconnected if here
        this.updateSyncStatus({ connected: false });
    }
    async streamingSyncIteration(signal, options) {
        return await this.obtainLock({
            type: LockType.SYNC,
            signal,
            callback: async () => {
                const resolvedOptions = {
                    ...DEFAULT_STREAM_CONNECTION_OPTIONS,
                    ...(options ?? {})
                };
                this.logger.debug('Streaming sync iteration started');
                this.options.adapter.startSession();
                const bucketEntries = await this.options.adapter.getBucketStates();
                const initialBuckets = new Map();
                bucketEntries.forEach((entry) => {
                    initialBuckets.set(entry.bucket, entry.op_id);
                });
                const req = Array.from(initialBuckets.entries()).map(([bucket, after]) => ({
                    name: bucket,
                    after: after
                }));
                // These are compared by reference
                let targetCheckpoint = null;
                let validatedCheckpoint = null;
                let appliedCheckpoint = null;
                let bucketSet = new Set(initialBuckets.keys());
                this.logger.debug('Requesting stream from server');
                const syncOptions = {
                    path: '/sync/stream',
                    abortSignal: signal,
                    data: {
                        buckets: req,
                        include_checksum: true,
                        raw_data: true,
                        parameters: resolvedOptions.params
                    }
                };
                const stream = resolvedOptions?.connectionMethod == SyncStreamConnectionMethod.HTTP
                    ? await this.options.remote.postStream(syncOptions)
                    : await this.options.remote.socketStream(syncOptions);
                this.logger.debug('Stream established. Processing events');
                while (!stream.closed) {
                    const line = await stream.read();
                    if (!line) {
                        // The stream has closed while waiting
                        return { retry: true };
                    }
                    // A connection is active and messages are being received
                    if (!this.syncStatus.connected) {
                        // There is a connection now
                        Promise.resolve().then(() => this.triggerCrudUpload());
                        this.updateSyncStatus({
                            connected: true
                        });
                    }
                    if (isStreamingSyncCheckpoint(line)) {
                        targetCheckpoint = line.checkpoint;
                        const bucketsToDelete = new Set(bucketSet);
                        const newBuckets = new Set();
                        for (const checksum of line.checkpoint.buckets) {
                            newBuckets.add(checksum.bucket);
                            bucketsToDelete.delete(checksum.bucket);
                        }
                        if (bucketsToDelete.size > 0) {
                            this.logger.debug('Removing buckets', [...bucketsToDelete]);
                        }
                        bucketSet = newBuckets;
                        await this.options.adapter.removeBuckets([...bucketsToDelete]);
                        await this.options.adapter.setTargetCheckpoint(targetCheckpoint);
                    }
                    else if (isStreamingSyncCheckpointComplete(line)) {
                        this.logger.debug('Checkpoint complete', targetCheckpoint);
                        const result = await this.options.adapter.syncLocalDatabase(targetCheckpoint);
                        if (!result.checkpointValid) {
                            // This means checksums failed. Start again with a new checkpoint.
                            // TODO: better back-off
                            await new Promise((resolve) => setTimeout(resolve, 50));
                            return { retry: true };
                        }
                        else if (!result.ready) {
                            // Checksums valid, but need more data for a consistent checkpoint.
                            // Continue waiting.
                            // landing here the whole time
                        }
                        else {
                            appliedCheckpoint = targetCheckpoint;
                            this.logger.debug('validated checkpoint', appliedCheckpoint);
                            this.updateSyncStatus({
                                connected: true,
                                lastSyncedAt: new Date(),
                                dataFlow: {
                                    downloading: false
                                }
                            });
                        }
                        validatedCheckpoint = targetCheckpoint;
                    }
                    else if (isStreamingSyncCheckpointDiff(line)) {
                        // TODO: It may be faster to just keep track of the diff, instead of the entire checkpoint
                        if (targetCheckpoint == null) {
                            throw new Error('Checkpoint diff without previous checkpoint');
                        }
                        const diff = line.checkpoint_diff;
                        const newBuckets = new Map();
                        for (const checksum of targetCheckpoint.buckets) {
                            newBuckets.set(checksum.bucket, checksum);
                        }
                        for (const checksum of diff.updated_buckets) {
                            newBuckets.set(checksum.bucket, checksum);
                        }
                        for (const bucket of diff.removed_buckets) {
                            newBuckets.delete(bucket);
                        }
                        const newCheckpoint = {
                            last_op_id: diff.last_op_id,
                            buckets: [...newBuckets.values()],
                            write_checkpoint: diff.write_checkpoint
                        };
                        targetCheckpoint = newCheckpoint;
                        bucketSet = new Set(newBuckets.keys());
                        const bucketsToDelete = diff.removed_buckets;
                        if (bucketsToDelete.length > 0) {
                            this.logger.debug('Remove buckets', bucketsToDelete);
                        }
                        await this.options.adapter.removeBuckets(bucketsToDelete);
                        await this.options.adapter.setTargetCheckpoint(targetCheckpoint);
                    }
                    else if (isStreamingSyncData(line)) {
                        const { data } = line;
                        this.updateSyncStatus({
                            dataFlow: {
                                downloading: true
                            }
                        });
                        await this.options.adapter.saveSyncData({ buckets: [SyncDataBucket.fromRow(data)] });
                    }
                    else if (isStreamingKeepalive(line)) {
                        const remaining_seconds = line.token_expires_in;
                        if (remaining_seconds == 0) {
                            // Connection would be closed automatically right after this
                            this.logger.debug('Token expiring; reconnect');
                            /**
                             * For a rare case where the backend connector does not update the token
                             * (uses the same one), this should have some delay.
                             */
                            await this.delayRetry();
                            return { retry: true };
                        }
                        this.triggerCrudUpload();
                    }
                    else {
                        this.logger.debug('Sync complete');
                        if (targetCheckpoint === appliedCheckpoint) {
                            this.updateSyncStatus({
                                connected: true,
                                lastSyncedAt: new Date()
                            });
                        }
                        else if (validatedCheckpoint === targetCheckpoint) {
                            const result = await this.options.adapter.syncLocalDatabase(targetCheckpoint);
                            if (!result.checkpointValid) {
                                // This means checksums failed. Start again with a new checkpoint.
                                // TODO: better back-off
                                await new Promise((resolve) => setTimeout(resolve, 50));
                                return { retry: false };
                            }
                            else if (!result.ready) {
                                // Checksums valid, but need more data for a consistent checkpoint.
                                // Continue waiting.
                            }
                            else {
                                appliedCheckpoint = targetCheckpoint;
                                this.updateSyncStatus({
                                    connected: true,
                                    lastSyncedAt: new Date(),
                                    dataFlow: {
                                        downloading: false
                                    }
                                });
                            }
                        }
                    }
                }
                this.logger.debug('Stream input empty');
                // Connection closed. Likely due to auth issue.
                return { retry: true };
            }
        });
    }
    updateSyncStatus(options) {
        const updatedStatus = new SyncStatus({
            connected: options.connected ?? this.syncStatus.connected,
            lastSyncedAt: options.lastSyncedAt ?? this.syncStatus.lastSyncedAt,
            dataFlow: {
                ...this.syncStatus.dataFlowStatus,
                ...options.dataFlow
            }
        });
        if (!this.syncStatus.isEqual(updatedStatus)) {
            this.syncStatus = updatedStatus;
            // Only trigger this is there was a change
            this.iterateListeners((cb) => cb.statusChanged?.(updatedStatus));
        }
        // trigger this for all updates
        this.iterateListeners((cb) => cb.statusUpdated?.(options));
    }
    async delayRetry() {
        return new Promise((resolve) => setTimeout(resolve, this.options.retryDelayMs));
    }
}
//# sourceMappingURL=AbstractStreamingSyncImplementation.js.map