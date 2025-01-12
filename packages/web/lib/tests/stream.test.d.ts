import { AbstractPowerSyncDatabase, SyncStatusOptions } from '@powersync/common';
import { MockRemote, MockStreamOpenFactory, TestConnector } from './utils/MockStreamOpenFactory';
export declare function waitForConnectionStatus(db: AbstractPowerSyncDatabase, statusCheck?: SyncStatusOptions): Promise<void>;
export declare function generateConnectedDatabase({ useWebWorker }?: {
    useWebWorker: boolean;
}): Promise<{
    connector: TestConnector;
    connect: () => Promise<void>;
    factory: MockStreamOpenFactory;
    powersync: AbstractPowerSyncDatabase;
    remote: MockRemote;
    uploadSpy: import("vitest").MockInstance<[database: AbstractPowerSyncDatabase], Promise<void>>;
    waitForStream: () => Promise<void>;
}>;
