import { AbstractStreamingSyncImplementation, LockType } from '@powersync/common';
import { Mutex } from 'async-mutex';
export class SSRStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
    constructor(options) {
        super(options);
        this.syncMutex = new Mutex();
        this.crudMutex = new Mutex();
    }
    obtainLock(lockOptions) {
        const mutex = lockOptions.type == LockType.CRUD ? this.crudMutex : this.syncMutex;
        return mutex.runExclusive(lockOptions.callback);
    }
}
//# sourceMappingURL=SSRWebStreamingSyncImplementation.js.map