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
import { WebStreamingSyncImplementation } from './WebStreamingSyncImplementation';
import { SharedSyncClientEvent } from '../../worker/sync/SharedSyncImplementation';
import { AbstractSharedSyncClientProvider } from '../../worker/sync/AbstractSharedSyncClientProvider';
import { openWorkerDatabasePort } from '../../worker/db/open-worker-database';
/**
 * The shared worker will trigger methods on this side of the message port
 * via this client provider.
 */
class SharedSyncClientProvider extends AbstractSharedSyncClientProvider {
    constructor(options, statusChanged) {
        super();
        this.options = options;
        this.statusChanged = statusChanged;
    }
    fetchCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            const credentials = yield this.options.remote.getCredentials();
            if (credentials == null) {
                return null;
            }
            /**
             * The credentials need to be serializable.
             * Users might extend [PowerSyncCredentials] to contain
             * items which are not serializable.
             * This returns only the essential fields.
             */
            return {
                endpoint: credentials.endpoint,
                token: credentials.token,
                expiresAt: credentials.expiresAt
            };
        });
    }
    uploadCrud() {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * Don't return anything here, just incase something which is not
             * serializable is returned from the `uploadCrud` function.
             */
            yield this.options.uploadCrud();
        });
    }
    get logger() {
        return this.options.logger;
    }
    trace(...x) {
        var _a;
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.trace(...x);
    }
    debug(...x) {
        var _a;
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.debug(...x);
    }
    info(...x) {
        var _a;
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.info(...x);
    }
    log(...x) {
        var _a;
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.log(...x);
    }
    warn(...x) {
        var _a;
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.warn(...x);
    }
    error(...x) {
        var _a;
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.error(...x);
    }
    time(label) {
        var _a;
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.time(label);
    }
    timeEnd(label) {
        var _a;
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.timeEnd(label);
    }
}
export class SharedWebStreamingSyncImplementation extends WebStreamingSyncImplementation {
    constructor(options) {
        super(options);
        /**
         * Configure or connect to the shared sync worker.
         * This worker will manage all syncing operations remotely.
         */
        const syncWorker = new SharedWorker(new URL('../../worker/sync/SharedSyncImplementation.worker.js', import.meta.url), {
            /* @vite-ignore */
            name: `shared-sync-${this.webOptions.identifier}`,
            type: 'module'
        });
        this.messagePort = syncWorker.port;
        this.syncManager = Comlink.wrap(this.messagePort);
        this.triggerCrudUpload = this.syncManager.triggerCrudUpload;
        /**
         * Opens MessagePort to the existing shared DB worker.
         * The sync worker cannot initiate connections directly to the
         * DB worker, but a port to the DB worker can be transferred to the
         * sync worker.
         */
        const { crudUploadThrottleMs, identifier, retryDelayMs } = this.options;
        const dbOpenerPort = openWorkerDatabasePort(this.options.identifier, true);
        this.isInitialized = this.syncManager.init(Comlink.transfer(dbOpenerPort, [dbOpenerPort]), {
            dbName: this.options.identifier,
            streamOptions: {
                crudUploadThrottleMs,
                identifier,
                retryDelayMs,
                flags: this.webOptions.flags
            }
        });
        /**
         * Pass along any sync status updates to this listener
         */
        this.clientProvider = new SharedSyncClientProvider(this.webOptions, (status) => {
            this.iterateListeners((l) => this.updateSyncStatus(status));
        });
        /**
         * The sync worker will call this client provider when it needs
         * to fetch credentials or upload data.
         * This performs bi-directional method calling.
         */
        Comlink.expose(this.clientProvider, this.messagePort);
    }
    /**
     * Starts the sync process, this effectively acts as a call to
     * `connect` if not yet connected.
     */
    connect(options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForReady();
            return this.syncManager.connect(options);
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForReady();
            return this.syncManager.disconnect();
        });
    }
    getWriteCheckpoint() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForReady();
            return this.syncManager.getWriteCheckpoint();
        });
    }
    hasCompletedSync() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.syncManager.hasCompletedSync();
        });
    }
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForReady();
            // Signal the shared worker that this client is closing its connection to the worker
            const closeMessagePayload = {
                event: SharedSyncClientEvent.CLOSE_CLIENT,
                data: {}
            };
            this.messagePort.postMessage(closeMessagePayload);
            // Release the proxy
            this.syncManager[Comlink.releaseProxy]();
        });
    }
    waitForReady() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.isInitialized;
        });
    }
    /**
     * Used in tests to force a connection states
     */
    _testUpdateStatus(status) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.syncManager['_testUpdateAllStatuses'](status.toJSON());
        });
    }
}
//# sourceMappingURL=SharedWebStreamingSyncImplementation.js.map