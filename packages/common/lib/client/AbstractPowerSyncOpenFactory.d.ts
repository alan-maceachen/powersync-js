import { DBAdapter } from '../db/DBAdapter';
import { Schema } from '../db/schema/Schema';
import { AbstractPowerSyncDatabase, PowerSyncDatabaseOptions } from './AbstractPowerSyncDatabase';
import { SQLOpenOptions } from './SQLOpenFactory';
export interface PowerSyncOpenFactoryOptions extends Partial<PowerSyncDatabaseOptions>, SQLOpenOptions {
    /** Schema used for the local database. */
    schema: Schema;
}
export declare abstract class AbstractPowerSyncDatabaseOpenFactory {
    protected options: PowerSyncOpenFactoryOptions;
    constructor(options: PowerSyncOpenFactoryOptions);
    /**
     * Schema used for the local database.
     */
    get schema(): Schema<{
        [x: string]: import("..").TableV2<any>;
    }>;
    protected abstract openDB(): DBAdapter;
    generateOptions(): PowerSyncDatabaseOptions;
    abstract generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase;
    getInstance(): AbstractPowerSyncDatabase;
}
