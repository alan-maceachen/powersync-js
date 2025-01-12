import { BaseObserver, DBAdapter, DBAdapterListener, LockContext as PowerSyncLockContext, Transaction as PowerSyncTransaction, DBLockOptions, QueryResult } from '@powersync/common';
import { QuickSQLiteConnection } from '@journeyapps/react-native-quick-sqlite';
/**
 * Adapter for React Native Quick SQLite
 */
export declare class RNQSDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
    protected baseDB: QuickSQLiteConnection;
    name: string;
    getAll: <T>(sql: string, parameters?: any[]) => Promise<T[]>;
    getOptional: <T>(sql: string, parameters?: any[]) => Promise<T | null>;
    get: <T>(sql: string, parameters?: any[]) => Promise<T>;
    constructor(baseDB: QuickSQLiteConnection, name: string);
    close(): void;
    readLock<T>(fn: (tx: PowerSyncLockContext) => Promise<T>, options?: DBLockOptions): Promise<T>;
    readTransaction<T>(fn: (tx: PowerSyncTransaction) => Promise<T>, options?: DBLockOptions): Promise<T>;
    writeLock<T>(fn: (tx: PowerSyncLockContext) => Promise<T>, options?: DBLockOptions): Promise<T>;
    writeTransaction<T>(fn: (tx: PowerSyncTransaction) => Promise<T>, options?: DBLockOptions): Promise<T>;
    execute(query: string, params?: any[]): Promise<import("@journeyapps/react-native-quick-sqlite").QueryResult>;
    executeBatch(query: string, params?: any[][]): Promise<QueryResult>;
    /**
     * This provides a top-level read only execute method which is executed inside a read-lock.
     * This is necessary since the high level `execute` method uses a write-lock under
     * the hood. Helper methods such as `get`, `getAll` and `getOptional` are read only,
     * and should use this method.
     */
    private readOnlyExecute;
    /**
     * Adds DB get utils to lock contexts and transaction contexts
     * @param tx
     * @returns
     */
    private generateDBHelpers;
}
