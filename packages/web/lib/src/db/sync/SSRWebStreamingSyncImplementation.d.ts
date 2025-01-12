import { AbstractStreamingSyncImplementation, AbstractStreamingSyncImplementationOptions, LockOptions } from '@powersync/common';
import { Mutex } from 'async-mutex';
export declare class SSRStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
    syncMutex: Mutex;
    crudMutex: Mutex;
    constructor(options: AbstractStreamingSyncImplementationOptions);
    obtainLock<T>(lockOptions: LockOptions<T>): Promise<T>;
}
