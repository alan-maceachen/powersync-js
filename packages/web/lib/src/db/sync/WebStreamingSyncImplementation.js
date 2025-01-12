import { AbstractStreamingSyncImplementation, LockType } from '@powersync/common';
export class WebStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
    constructor(options) {
        // Super will store and provide default values for options
        super(options);
    }
    get webOptions() {
        return this.options;
    }
    obtainLock(lockOptions) {
        const identifier = `streaming-sync-${lockOptions.type}-${this.webOptions.identifier}`;
        lockOptions.type == LockType.SYNC && console.debug('requesting lock for ', identifier);
        return navigator.locks.request(identifier, { signal: lockOptions.signal }, lockOptions.callback);
    }
}
//# sourceMappingURL=WebStreamingSyncImplementation.js.map