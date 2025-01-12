var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import _ from 'lodash';
import Logger from 'js-logger';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { v4 as uuid } from 'uuid';
import { Schema, TableV2, column } from '@powersync/common';
import { MockRemote, MockStreamOpenFactory, TestConnector } from './utils/MockStreamOpenFactory';
const UPLOAD_TIMEOUT_MS = 3000;
export function waitForConnectionStatus(db_1) {
    return __awaiter(this, arguments, void 0, function* (db, statusCheck = { connected: true }) {
        yield new Promise((resolve) => {
            if (db.connected) {
                resolve();
            }
            const l = db.registerListener({
                statusUpdated: (status) => {
                    if (_.every(statusCheck, (value, key) => _.isEqual(status[key], value))) {
                        resolve();
                        l === null || l === void 0 ? void 0 : l();
                    }
                }
            });
        });
    });
}
export function generateConnectedDatabase() {
    return __awaiter(this, arguments, void 0, function* ({ useWebWorker } = { useWebWorker: true }) {
        /**
         * Very basic implementation of a listener pattern.
         * Required since we cannot extend multiple classes.
         */
        const callbacks = new Map();
        const connector = new TestConnector();
        const uploadSpy = vi.spyOn(connector, 'uploadData');
        const remote = new MockRemote(connector, () => callbacks.forEach((c) => c()));
        const users = new TableV2({
            name: column.text
        });
        const schema = new Schema({
            users
        });
        const factory = new MockStreamOpenFactory({
            dbFilename: 'test-stream-connection.db',
            flags: {
                enableMultiTabs: false,
                useWebWorker
            },
            // Makes tests faster
            crudUploadThrottleMs: 0,
            schema
        }, remote);
        const powersync = factory.getInstance();
        const waitForStream = () => new Promise((resolve) => {
            const id = uuid();
            callbacks.set(id, () => {
                resolve();
                callbacks.delete(id);
            });
        });
        const connect = () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const streamOpened = waitForStream();
            const connectedPromise = powersync.connect(connector);
            yield streamOpened;
            (_a = remote.streamController) === null || _a === void 0 ? void 0 : _a.enqueue(new TextEncoder().encode('{"token_expires_in":3426}\n'));
            // Wait for connected to be true
            yield connectedPromise;
        });
        yield connect();
        return {
            connector,
            connect,
            factory,
            powersync,
            remote,
            uploadSpy,
            waitForStream
        };
    });
}
describe('Streaming', () => {
    /**
     * Declares a test to be executed with different generated db functions
     */
    const itWithGenerators = (name, test) => __awaiter(void 0, void 0, void 0, function* () {
        const funcWithWebWorker = generateConnectedDatabase;
        const funcWithoutWebWorker = () => generateConnectedDatabase({ useWebWorker: false });
        it(`${name} - with web worker`, () => test(funcWithWebWorker));
        it(`${name} - without web worker`, () => test(funcWithoutWebWorker));
    });
    beforeAll(() => Logger.useDefaults());
    itWithGenerators('PowerSync reconnect on closed stream', (createConnectedDatabase) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const { powersync, waitForStream, remote } = yield createConnectedDatabase();
        expect(powersync.connected).toBe(true);
        // Close the stream
        const newStream = waitForStream();
        (_a = remote.streamController) === null || _a === void 0 ? void 0 : _a.close();
        // A new stream should be requested
        yield newStream;
        yield powersync.disconnectAndClear();
        yield powersync.close();
    }));
    itWithGenerators('PowerSync reconnect multiple connect calls', (createConnectedDatabase) => __awaiter(void 0, void 0, void 0, function* () {
        // This initially performs a connect call
        const { powersync, waitForStream } = yield createConnectedDatabase();
        expect(powersync.connected).toBe(true);
        // Call connect again, a new stream should be requested
        const newStream = waitForStream();
        powersync.connect(new TestConnector());
        // A new stream should be requested
        yield newStream;
        yield powersync.disconnectAndClear();
        yield powersync.close();
    }));
    itWithGenerators('Should trigger upload connector when connected', (createConnectedDatabase) => __awaiter(void 0, void 0, void 0, function* () {
        const { powersync, uploadSpy } = yield createConnectedDatabase();
        expect(powersync.connected).toBe(true);
        // do something which should trigger an upload
        yield powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);
        // It should try and upload
        yield vi.waitFor(() => {
            // to-have-been-called seems to not work after failing the first check
            expect(uploadSpy.mock.calls.length).equals(1);
        }, {
            timeout: UPLOAD_TIMEOUT_MS
        });
        yield powersync.disconnectAndClear();
        yield powersync.close();
    }));
    itWithGenerators('Should retry failed uploads when connected', (createConnectedDatabase) => __awaiter(void 0, void 0, void 0, function* () {
        const { powersync, uploadSpy } = yield createConnectedDatabase();
        expect(powersync.connected).toBe(true);
        let uploadCounter = 0;
        // This test will throw an exception a few times before uploading
        const throwCounter = 2;
        uploadSpy.mockImplementation((db) => __awaiter(void 0, void 0, void 0, function* () {
            if (uploadCounter++ < throwCounter) {
                throw new Error('No uploads yet');
            }
            // Now actually do the upload
            const tx = yield db.getNextCrudTransaction();
            yield (tx === null || tx === void 0 ? void 0 : tx.complete());
        }));
        // do something which should trigger an upload
        yield powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);
        // It should try and upload
        yield vi.waitFor(() => {
            // to-have-been-called seems to not work after failing a check
            expect(uploadSpy.mock.calls.length).equals(throwCounter + 1);
        }, {
            timeout: UPLOAD_TIMEOUT_MS
        });
        yield powersync.disconnectAndClear();
        yield powersync.close();
    }));
    itWithGenerators('Should upload after reconnecting', (createConnectedDatabase) => __awaiter(void 0, void 0, void 0, function* () {
        const { connect, powersync, uploadSpy } = yield createConnectedDatabase();
        expect(powersync.connected).toBe(true);
        yield powersync.disconnect();
        // do something (offline) which should trigger an upload
        yield powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);
        yield connect();
        // It should try and upload
        yield vi.waitFor(() => {
            // to-have-been-called seems to not work after failing a check
            expect(uploadSpy.mock.calls.length).equals(1);
        }, {
            timeout: UPLOAD_TIMEOUT_MS
        });
        yield powersync.disconnectAndClear();
        yield powersync.close();
    }));
    itWithGenerators('Should update status when uploading', (createConnectedDatabase) => __awaiter(void 0, void 0, void 0, function* () {
        const { powersync, uploadSpy } = yield createConnectedDatabase();
        expect(powersync.connected).toBe(true);
        let uploadStartedPromise = new Promise((resolve) => {
            uploadSpy.mockImplementation((db) => __awaiter(void 0, void 0, void 0, function* () {
                resolve();
                // Now actually do the upload
                const tx = yield db.getNextCrudTransaction();
                yield (tx === null || tx === void 0 ? void 0 : tx.complete());
            }));
        });
        // do something which should trigger an upload
        yield powersync.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['name']);
        yield uploadStartedPromise;
        expect(powersync.currentStatus.dataFlowStatus.uploading).true;
        // Status should update after uploads are completed
        yield vi.waitFor(() => {
            // to-have-been-called seems to not work after failing a check
            expect(powersync.currentStatus.dataFlowStatus.uploading).false;
        }, {
            timeout: UPLOAD_TIMEOUT_MS
        });
        yield powersync.disconnectAndClear();
        yield powersync.close();
    }));
});
//# sourceMappingURL=stream.test.js.map