import { type DBAdapter, type DBAdapterListener, type DBLockOptions, type LockContext, type PowerSyncOpenFactoryOptions, type QueryResult, type Transaction, BaseObserver } from '@powersync/common';
import { WebSQLFlags } from '../web-sql-flags';
/**
 * These flags are the same as {@link WebSQLFlags}.
 * This export is maintained only for API consistency
 */
export type WASQLiteFlags = WebSQLFlags;
export interface WASQLiteDBAdapterOptions extends Omit<PowerSyncOpenFactoryOptions, 'schema'> {
    flags?: WASQLiteFlags;
    /**
     * Use an existing port to an initialized worker.
     * A worker will be initialized if none is provided
     */
    workerPort?: MessagePort;
}
/**
 * Adapter for WA-SQLite SQLite connections.
 */
export declare class WASQLiteDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
    protected options: WASQLiteDBAdapterOptions;
    private initialized;
    private logger;
    private dbGetHelpers;
    private methods;
    private debugMode;
    constructor(options: WASQLiteDBAdapterOptions);
    get name(): string;
    protected get flags(): WASQLiteFlags;
    getWorker(): void;
    protected init(): Promise<void>;
    execute(query: string, params?: any[] | undefined): Promise<QueryResult>;
    executeBatch(query: string, params?: any[][]): Promise<QueryResult>;
    /**
     * Wraps the worker execute function, awaiting for it to be available
     */
    private _execute;
    /**
     * Wraps the worker executeBatch function, awaiting for it to be available
     */
    private _executeBatch;
    /**
     * Attempts to close the connection.
     * Shared workers might not actually close the connection if other
     * tabs are still using it.
     */
    close(): void;
    getAll<T>(sql: string, parameters?: any[] | undefined): Promise<T[]>;
    getOptional<T>(sql: string, parameters?: any[] | undefined): Promise<T | null>;
    get<T>(sql: string, parameters?: any[] | undefined): Promise<T>;
    readLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions | undefined): Promise<T>;
    writeLock<T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions | undefined): Promise<T>;
    protected acquireLock(callback: () => Promise<any>): Promise<any>;
    readTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions | undefined): Promise<T>;
    writeTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions | undefined): Promise<T>;
    /**
     * Wraps a lock context into a transaction context
     */
    private wrapTransaction;
    private generateDBHelpers;
}
