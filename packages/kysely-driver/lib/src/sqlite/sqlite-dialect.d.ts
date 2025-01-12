import { DatabaseIntrospector, Dialect, DialectAdapter, Driver, Kysely, QueryCompiler } from 'kysely';
import { PowerSyncDialectConfig } from './sqlite-driver';
export declare class PowerSyncDialect implements Dialect {
    #private;
    constructor(config: PowerSyncDialectConfig);
    createDriver(): Driver;
    createQueryCompiler(): QueryCompiler;
    createAdapter(): DialectAdapter;
    createIntrospector(db: Kysely<unknown>): DatabaseIntrospector;
}
