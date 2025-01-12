var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SqliteBucketStorage, SyncStatus } from '@powersync/common';
import { PowerSyncDatabase, SharedWebStreamingSyncImplementation, WebRemote } from '@powersync/web';
import { testSchema } from './utils/testDb';
import { TestConnector } from './utils/MockStreamOpenFactory';
import { Mutex } from 'async-mutex';
import Logger from 'js-logger';
describe('Multiple Instances', () => {
    const dbFilename = 'test-multiple-instances.db';
    let db;
    const openDatabase = () => new PowerSyncDatabase({
        database: {
            dbFilename
        },
        schema: testSchema
    });
    beforeEach(() => {
        db = openDatabase();
    });
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield db.disconnectAndClear();
        yield db.close();
    }));
    function createAsset(powersync = db) {
        return powersync.execute('INSERT INTO assets(id, description) VALUES(uuid(), ?)', ['test']);
    }
    it('should share data between instances', () => __awaiter(void 0, void 0, void 0, function* () {
        // Create an asset on the first connection
        yield createAsset();
        // Create a new connection and verify it can read existing assets
        const db2 = openDatabase();
        const assets = yield db2.getAll('SELECT * FROM assets');
        expect(assets.length).equals(1);
        yield db2.close();
    }));
    it('should broadcast logs from shared sync worker', { timeout: 20000 }, () => __awaiter(void 0, void 0, void 0, function* () {
        const logger = Logger.get('test-logger');
        const spiedErrorLogger = vi.spyOn(logger, 'error');
        const spiedDebugLogger = vi.spyOn(logger, 'debug');
        const db = new PowerSyncDatabase({
            schema: testSchema,
            database: {
                dbFilename: 'log-test.sqlite'
            },
            logger
        });
        db.connect({
            fetchCredentials: () => __awaiter(void 0, void 0, void 0, function* () {
                return {
                    endpoint: 'http://localhost/does-not-exist',
                    token: 'none'
                };
            }),
            uploadData: (db) => __awaiter(void 0, void 0, void 0, function* () { })
        });
        // Should log that a connection attempt has been made
        const message = 'Streaming sync iteration started';
        yield vi.waitFor(() => expect(spiedDebugLogger.mock.calls
            .flat(1)
            .find((argument) => typeof argument == 'string' && argument.includes(message))).exist, { timeout: 2000 });
        // The connection should fail with an error
        yield vi.waitFor(() => expect(spiedErrorLogger.mock.calls.length).gt(0), { timeout: 2000 });
        // This test seems to take quite long while waiting for this disconnect call
        yield db.disconnectAndClear();
        yield db.close();
    }));
    it('should maintain DB connections if instances call close', () => __awaiter(void 0, void 0, void 0, function* () {
        /**
         * The shared webworker should use the same DB connection for both instances.
         * The shared connection should only be closed if all PowerSync clients
         * close themselves.
         */
        const db2 = openDatabase();
        yield db2.close();
        // Create an asset on the first connection
        yield createAsset();
    }));
    it('should watch table changes between instances', () => __awaiter(void 0, void 0, void 0, function* () {
        const db2 = openDatabase();
        const watchedPromise = new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            const controller = new AbortController();
            try {
                for (var _d = true, _e = __asyncValues(db2.watch('SELECT * FROM assets')), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const result = _c;
                    resolve();
                    controller.abort();
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }));
        yield createAsset();
        expect(watchedPromise).rejects;
    }));
    it('should share sync updates', () => __awaiter(void 0, void 0, void 0, function* () {
        // Generate the first streaming sync implementation
        const connector1 = new TestConnector();
        // They need to use the same identifier to use the same shared worker.
        const identifier = 'streaming-sync-shared';
        const syncOptions1 = {
            adapter: new SqliteBucketStorage(db.database, new Mutex()),
            remote: new WebRemote(connector1),
            uploadCrud: () => __awaiter(void 0, void 0, void 0, function* () {
                yield connector1.uploadData(db);
            }),
            identifier
        };
        const stream1 = new SharedWebStreamingSyncImplementation(syncOptions1);
        // Generate the second streaming sync implementation
        const connector2 = new TestConnector();
        const syncOptions2 = {
            adapter: new SqliteBucketStorage(db.database, new Mutex()),
            remote: new WebRemote(connector1),
            uploadCrud: () => __awaiter(void 0, void 0, void 0, function* () {
                yield connector2.uploadData(db);
            }),
            identifier
        };
        const stream2 = new SharedWebStreamingSyncImplementation(syncOptions2);
        const stream2UpdatedPromise = new Promise((resolve, reject) => {
            const l = stream2.registerListener({
                statusChanged: (status) => {
                    if (status.connected) {
                        resolve();
                        l();
                    }
                }
            });
        });
        // hack to set the status to a new one for tests
        stream1['_testUpdateStatus'](new SyncStatus({ connected: true }));
        yield stream2UpdatedPromise;
        expect(stream2.isConnected).true;
        yield stream1.dispose();
        yield stream2.dispose();
    }));
    it('should trigger uploads from last connected clients', () => __awaiter(void 0, void 0, void 0, function* () {
        // Generate the first streaming sync implementation
        const connector1 = new TestConnector();
        const spy1 = vi.spyOn(connector1, 'uploadData');
        // They need to use the same identifier to use the same shared worker.
        const identifier = dbFilename;
        // Resolves once the first connector has been called to upload data
        let triggerUpload1;
        const upload1TriggeredPromise = new Promise((resolve) => {
            triggerUpload1 = resolve;
        });
        // Create the first streaming client
        const syncOptions1 = {
            adapter: new SqliteBucketStorage(db.database, new Mutex()),
            remote: new WebRemote(connector1),
            uploadCrud: () => __awaiter(void 0, void 0, void 0, function* () {
                triggerUpload1();
                connector1.uploadData(db);
            }),
            identifier
        };
        const stream1 = new SharedWebStreamingSyncImplementation(syncOptions1);
        // Generate the second streaming sync implementation
        const connector2 = new TestConnector();
        const spy2 = vi.spyOn(connector2, 'uploadData');
        let triggerUpload2;
        const upload2TriggeredPromise = new Promise((resolve) => {
            triggerUpload2 = resolve;
        });
        const syncOptions2 = {
            adapter: new SqliteBucketStorage(db.database, new Mutex()),
            remote: new WebRemote(connector1),
            uploadCrud: () => __awaiter(void 0, void 0, void 0, function* () {
                triggerUpload2();
                connector2.uploadData(db);
            }),
            identifier
        };
        const stream2 = new SharedWebStreamingSyncImplementation(syncOptions2);
        // Waits for the stream to be marked as connected
        const stream2UpdatedPromise = new Promise((resolve, reject) => {
            const l = stream2.registerListener({
                statusChanged: (status) => {
                    if (status.connected) {
                        resolve();
                        l();
                    }
                }
            });
        });
        // hack to set the status to connected for tests
        stream1['_testUpdateStatus'](new SyncStatus({ connected: true }));
        // The status in the second stream client should be updated
        yield stream2UpdatedPromise;
        expect(stream2.isConnected).true;
        // Create something with CRUD in it.
        yield db.execute('INSERT into customers (id, name, email) VALUES (uuid(), ?, ?)', [
            'steven',
            'steven@journeyapps.com'
        ]);
        // Manual trigger since tests don't entirely configure watches for ps_crud
        stream1.triggerCrudUpload();
        // The second connector should be called to upload
        yield upload2TriggeredPromise;
        // It should call the latest connected client
        expect(spy2).toHaveBeenCalledOnce();
        // Close the second client, leaving only the first one
        yield stream2.dispose();
        stream1.triggerCrudUpload();
        // It should now upload from the first client
        yield upload1TriggeredPromise;
        expect(spy1).toHaveBeenCalledOnce();
        yield stream1.dispose();
    }));
});
//# sourceMappingURL=multiple_instances.test.js.map