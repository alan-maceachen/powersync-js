import { type AbstractPowerSyncDatabase } from '@powersync/common';
import { CompiledQuery, DatabaseConnection, QueryResult } from 'kysely';
/**
 * Represent a Kysely connection to the PowerSync database.
 *
 * The actual locks are acquired on-demand when a transaction is started.
 *
 * When not using transactions, we rely on the automatic locks.
 *
 * This allows us to bypass write locks when doing pure select queries outside a transaction.
 */
export declare class PowerSyncConnection implements DatabaseConnection {
    #private;
    constructor(db: AbstractPowerSyncDatabase);
    executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>>;
    streamQuery<R>(compiledQuery: CompiledQuery): AsyncIterableIterator<QueryResult<R>>;
    beginTransaction(): Promise<void>;
    commitTransaction(): Promise<void>;
    rollbackTransaction(): Promise<void>;
    releaseConnection(): Promise<void>;
    private releaseTransaction;
}
