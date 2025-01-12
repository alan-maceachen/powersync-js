var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { AbstractRemote, DataStream } from '@powersync/common';
import { PowerSyncDatabase, WebStreamingSyncImplementation, WASQLitePowerSyncDatabaseOpenFactory } from '@powersync/web';
export class TestConnector {
    fetchCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                endpoint: '',
                token: ''
            };
        });
    }
    uploadData(database) {
        return __awaiter(this, void 0, void 0, function* () {
            const tx = yield database.getNextCrudTransaction();
            yield (tx === null || tx === void 0 ? void 0 : tx.complete());
        });
    }
}
export class MockRemote extends AbstractRemote {
    constructor(connector, onStreamRequested) {
        super(connector);
        this.onStreamRequested = onStreamRequested;
        this.streamController = null;
    }
    getBSON() {
        return __awaiter(this, void 0, void 0, function* () {
            return import('bson');
        });
    }
    post(path, data, headers) {
        throw new Error('Method not implemented.');
    }
    get(path, headers) {
        return __awaiter(this, void 0, void 0, function* () {
            // mock a response for write checkpoint API
            if (path.includes('checkpoint')) {
                return {
                    data: {
                        write_checkpoint: '1000'
                    }
                };
            }
            throw new Error('Not implemented');
        });
    }
    postStreaming(path, data, headers, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = new ReadableStream({
                start: (controller) => {
                    this.streamController = controller;
                    this.onStreamRequested();
                    signal === null || signal === void 0 ? void 0 : signal.addEventListener('abort', () => {
                        try {
                            controller.close();
                        }
                        catch (ex) {
                            // An error might be thrown if the reader has not been read from yet
                        }
                    });
                }
            });
            return new Response(stream).body;
        });
    }
    socketStream(options) {
        throw new Error('Method not implemented.');
    }
    postStream(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const mockResponse = yield this.postStreaming(options.path, options.data, options.headers, options.abortSignal);
            const mockReader = mockResponse.getReader();
            const stream = new DataStream({
                logger: this.logger
            });
            const l = stream.registerListener({
                lowWater: () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const { done, value } = yield mockReader.read();
                        // Exit if we're done
                        if (done) {
                            stream.close();
                            l === null || l === void 0 ? void 0 : l();
                            return;
                        }
                        stream.enqueueData(value);
                    }
                    catch (ex) {
                        stream.close();
                        throw ex;
                    }
                }),
                closed: () => {
                    mockReader.releaseLock();
                    l === null || l === void 0 ? void 0 : l();
                }
            });
            return stream;
        });
    }
}
export class MockedStreamPowerSync extends PowerSyncDatabase {
    constructor(options, remote) {
        super(options);
        this.remote = remote;
    }
    generateSyncStreamImplementation(connector) {
        return new WebStreamingSyncImplementation({
            adapter: this.bucketStorageAdapter,
            remote: this.remote,
            uploadCrud: () => __awaiter(this, void 0, void 0, function* () {
                yield this.waitForReady();
                yield connector.uploadData(this);
            }),
            identifier: this.database.name,
            retryDelayMs: 0
        });
    }
}
export class MockStreamOpenFactory extends WASQLitePowerSyncDatabaseOpenFactory {
    constructor(options, remote) {
        super(options);
        this.remote = remote;
    }
    generateInstance(options) {
        return new MockedStreamPowerSync(Object.assign({}, options), this.remote);
    }
}
//# sourceMappingURL=MockStreamOpenFactory.js.map