import { AbstractStreamingSyncImplementation, AbstractStreamingSyncImplementationOptions, LockOptions, LockType } from '@powersync/common';
import Lock from 'async-lock';
export declare class ReactNativeStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
    locks: Map<LockType, Lock>;
    constructor(options: AbstractStreamingSyncImplementationOptions);
    /**
     *  Configures global locks on sync process
     */
    initLocks(): void;
    obtainLock<T>(lockOptions: LockOptions<T>): Promise<T>;
}
