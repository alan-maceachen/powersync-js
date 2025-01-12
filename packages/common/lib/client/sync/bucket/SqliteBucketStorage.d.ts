import { Mutex } from 'async-mutex';
import { DBAdapter, Transaction } from '../../../db/DBAdapter';
import { BucketState, BucketStorageAdapter, BucketStorageListener, Checkpoint, SyncLocalDatabaseResult } from './BucketStorageAdapter';
import { CrudBatch } from './CrudBatch';
import { SyncDataBatch } from './SyncDataBatch';
import { ILogger } from 'js-logger';
import { BaseObserver } from '../../../utils/BaseObserver';
export declare class SqliteBucketStorage extends BaseObserver<BucketStorageListener> implements BucketStorageAdapter {
    private db;
    private mutex;
    private logger;
    static MAX_OP_ID: string;
    tableNames: Set<string>;
    private pendingBucketDeletes;
    private _hasCompletedSync;
    private updateListener;
    /**
     * Count up, and do a compact on startup.
     */
    private compactCounter;
    constructor(db: DBAdapter, mutex: Mutex, logger?: ILogger);
    init(): Promise<void>;
    dispose(): Promise<void>;
    getMaxOpId(): string;
    /**
     * Reset any caches.
     */
    startSession(): void;
    getBucketStates(): Promise<BucketState[]>;
    saveSyncData(batch: SyncDataBatch): Promise<void>;
    removeBuckets(buckets: string[]): Promise<void>;
    /**
     * Mark a bucket for deletion.
     */
    private deleteBucket;
    hasCompletedSync(): Promise<boolean>;
    syncLocalDatabase(checkpoint: Checkpoint): Promise<SyncLocalDatabaseResult>;
    /**
     * Atomically update the local state to the current checkpoint.
     *
     * This includes creating new tables, dropping old tables, and copying data over from the oplog.
     */
    private updateObjectsFromBuckets;
    validateChecksums(checkpoint: Checkpoint): Promise<SyncLocalDatabaseResult>;
    /**
     * Force a compact, for tests.
     */
    forceCompact(): Promise<void>;
    autoCompact(): Promise<void>;
    private deletePendingBuckets;
    private clearRemoveOps;
    updateLocalTarget(cb: () => Promise<string>): Promise<boolean>;
    hasCrud(): Promise<boolean>;
    /**
     * Get a batch of objects to send to the server.
     * When the objects are successfully sent to the server, call .complete()
     */
    getCrudBatch(limit?: number): Promise<CrudBatch | null>;
    writeTransaction<T>(callback: (tx: Transaction) => Promise<T>, options?: {
        timeoutMs: number;
    }): Promise<T>;
    /**
     * Set a target checkpoint.
     */
    setTargetCheckpoint(checkpoint: Checkpoint): Promise<void>;
}
