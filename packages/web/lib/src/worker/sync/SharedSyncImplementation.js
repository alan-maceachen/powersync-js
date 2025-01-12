var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as Comlink from 'comlink';
import Logger from 'js-logger';
import { BaseObserver, SqliteBucketStorage, SyncStatus, AbortOperation } from '@powersync/common';
import { WebStreamingSyncImplementation } from '../../db/sync/WebStreamingSyncImplementation';
import { Mutex } from 'async-mutex';
import { WebRemote } from '../../db/sync/WebRemote';
import { WASQLiteDBAdapter } from '../../db/adapters/wa-sqlite/WASQLiteDBAdapter';
import { BroadcastLogger } from './BroadcastLogger';
/**
 * Manual message events for shared sync clients
 */
export var SharedSyncClientEvent;
(function (SharedSyncClientEvent) {
    /**
     * This client requests the shared sync manager should
     * close it's connection to the client.
     */
    SharedSyncClientEvent["CLOSE_CLIENT"] = "close-client";
})(SharedSyncClientEvent || (SharedSyncClientEvent = {}));
/**
 * Shared sync implementation which runs inside a shared webworker
 */
export class SharedSyncImplementation extends BaseObserver {
    constructor() {
        super();
        this.ports = [];
        this.isInitialized = new Promise((resolve) => {
            const callback = this.registerListener({
                initialized: () => {
                    resolve();
                    callback === null || callback === void 0 ? void 0 : callback();
                }
            });
        });
        this.syncStatus = new SyncStatus({});
        this.broadCastLogger = new BroadcastLogger(this.ports);
    }
    waitForStatus(status) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForReady();
            return this.syncStreamClient.waitForStatus(status);
        });
    }
    get lastSyncedAt() {
        var _a;
        return (_a = this.syncStreamClient) === null || _a === void 0 ? void 0 : _a.lastSyncedAt;
    }
    get isConnected() {
        var _a, _b;
        return (_b = (_a = this.syncStreamClient) === null || _a === void 0 ? void 0 : _a.isConnected) !== null && _b !== void 0 ? _b : false;
    }
    waitForReady() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.isInitialized;
        });
    }
    /**
     * Configures the DBAdapter connection and a streaming sync client.
     */
    init(dbWorkerPort, params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (this.syncStreamClient) {
                // Cannot modify already existing sync implementation
                return;
            }
            const logger = ((_b = (_a = params.streamOptions) === null || _a === void 0 ? void 0 : _a.flags) === null || _b === void 0 ? void 0 : _b.broadcastLogs) ? this.broadCastLogger : Logger.get('shared-sync');
            self.onerror = (event) => {
                // Share any uncaught events on the broadcast logger
                logger.error('Uncaught exception in PowerSync shared sync worker', event);
            };
            this.syncStreamClient = new WebStreamingSyncImplementation(Object.assign(Object.assign({ adapter: new SqliteBucketStorage(new WASQLiteDBAdapter({
                    dbFilename: params.dbName,
                    workerPort: dbWorkerPort,
                    flags: { enableMultiTabs: true, useWebWorker: true },
                    logger
                }), new Mutex(), logger), remote: new WebRemote({
                    fetchCredentials: () => __awaiter(this, void 0, void 0, function* () {
                        const lastPort = this.ports[this.ports.length - 1];
                        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                            const abortController = new AbortController();
                            this.fetchCredentialsController = {
                                controller: abortController,
                                activePort: lastPort
                            };
                            abortController.signal.onabort = reject;
                            try {
                                resolve(yield lastPort.clientProvider.fetchCredentials());
                            }
                            catch (ex) {
                                reject(ex);
                            }
                            finally {
                                this.fetchCredentialsController = undefined;
                            }
                        }));
                    })
                }), uploadCrud: () => __awaiter(this, void 0, void 0, function* () {
                    const lastPort = this.ports[this.ports.length - 1];
                    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                        const abortController = new AbortController();
                        this.uploadDataController = {
                            controller: abortController,
                            activePort: lastPort
                        };
                        // Resolving will make it retry
                        abortController.signal.onabort = () => resolve();
                        try {
                            resolve(yield lastPort.clientProvider.uploadCrud());
                        }
                        catch (ex) {
                            reject(ex);
                        }
                        finally {
                            this.uploadDataController = undefined;
                        }
                    }));
                }) }, params.streamOptions), { 
                // Logger cannot be transferred just yet
                logger }));
            this.syncStreamClient.registerListener({
                statusChanged: (status) => {
                    this.updateAllStatuses(status.toJSON());
                }
            });
            this.iterateListeners((l) => { var _a; return (_a = l.initialized) === null || _a === void 0 ? void 0 : _a.call(l); });
        });
    }
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            yield this.waitForReady();
            (_a = this.statusListener) === null || _a === void 0 ? void 0 : _a.call(this);
            return (_b = this.syncStreamClient) === null || _b === void 0 ? void 0 : _b.dispose();
        });
    }
    /**
     * Connects to the PowerSync backend instance.
     * Multiple tabs can safely call this in their initialization.
     * The connection will simply be reconnected whenever a new tab
     * connects.
     */
    connect(options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForReady();
            // This effectively queues connect and disconnect calls. Ensuring multiple tabs' requests are synchronized
            return navigator.locks.request('shared-sync-connect', () => { var _a; return (_a = this.syncStreamClient) === null || _a === void 0 ? void 0 : _a.connect(options); });
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForReady();
            // This effectively queues connect and disconnect calls. Ensuring multiple tabs' requests are synchronized
            return navigator.locks.request('shared-sync-connect', () => { var _a; return (_a = this.syncStreamClient) === null || _a === void 0 ? void 0 : _a.disconnect(); });
        });
    }
    /**
     * Adds a new client tab's message port to the list of connected ports
     */
    addPort(port) {
        var _a;
        const portProvider = {
            port,
            clientProvider: Comlink.wrap(port)
        };
        this.ports.push(portProvider);
        // Give the newly connected client the latest status
        const status = (_a = this.syncStreamClient) === null || _a === void 0 ? void 0 : _a.syncStatus;
        if (status) {
            portProvider.clientProvider.statusChanged(status.toJSON());
        }
    }
    /**
     * Removes a message port client from this manager's managed
     * clients.
     */
    removePort(port) {
        const index = this.ports.findIndex((p) => p.port == port);
        if (index < 0) {
            console.warn(`Could not remove port ${port} since it is not present in active ports.`);
            return;
        }
        const trackedPort = this.ports[index];
        // Release proxy
        trackedPort.clientProvider[Comlink.releaseProxy]();
        this.ports.splice(index, 1);
        /**
         * The port might currently be in use. Any active functions might
         * not resolve. Abort them here.
         */
        [this.fetchCredentialsController, this.uploadDataController].forEach((abortController) => {
            if ((abortController === null || abortController === void 0 ? void 0 : abortController.activePort.port) == port) {
                abortController.controller.abort(new AbortOperation('Closing pending requests after client port is removed'));
            }
        });
    }
    triggerCrudUpload() {
        this.waitForReady().then(() => { var _a; return (_a = this.syncStreamClient) === null || _a === void 0 ? void 0 : _a.triggerCrudUpload(); });
    }
    obtainLock(lockOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForReady();
            return this.syncStreamClient.obtainLock(lockOptions);
        });
    }
    hasCompletedSync() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForReady();
            return this.syncStreamClient.hasCompletedSync();
        });
    }
    getWriteCheckpoint() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForReady();
            return this.syncStreamClient.getWriteCheckpoint();
        });
    }
    /**
     * A method to update the all shared statuses for each
     * client.
     */
    updateAllStatuses(status) {
        this.syncStatus = new SyncStatus(status);
        this.ports.forEach((p) => p.clientProvider.statusChanged(status));
    }
    /**
     * A function only used for unit tests which updates the internal
     * sync stream client and all tab client's sync status
     */
    _testUpdateAllStatuses(status) {
        if (!this.syncStreamClient) {
            console.warn('no stream client has been initialized yet');
        }
        // Only assigning, don't call listeners for this test
        this.syncStreamClient.syncStatus = new SyncStatus(status);
        this.updateAllStatuses(status);
    }
}
//# sourceMappingURL=SharedSyncImplementation.js.map