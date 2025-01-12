import { AbstractStreamingSyncImplementation, AbstractStreamingSyncImplementationOptions, LockOptions } from '@powersync/common';
export interface WebStreamingSyncImplementationOptions extends AbstractStreamingSyncImplementationOptions {
    flags?: {
        broadcastLogs?: boolean;
    };
}
export declare class WebStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
    constructor(options: WebStreamingSyncImplementationOptions);
    get webOptions(): WebStreamingSyncImplementationOptions;
    obtainLock<T>(lockOptions: LockOptions<T>): Promise<T>;
}
