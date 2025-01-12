import { type AbstractPowerSyncDatabase } from '@powersync/common';
import { Driver } from 'kysely';
import { PowerSyncConnection } from './sqlite-connection';
export interface PowerSyncDialectConfig {
    db: AbstractPowerSyncDatabase;
}
export declare class PowerSyncDriver implements Driver {
    #private;
    constructor(config: PowerSyncDialectConfig);
    init(): Promise<void>;
    acquireConnection(): Promise<PowerSyncConnection>;
    beginTransaction(connection: PowerSyncConnection): Promise<void>;
    commitTransaction(connection: PowerSyncConnection): Promise<void>;
    rollbackTransaction(connection: PowerSyncConnection): Promise<void>;
    releaseConnection(connection: PowerSyncConnection): Promise<void>;
    /**
      This will do nothing. Instead use PowerSync `disconnectAndClear` function.
     */
    destroy(): Promise<void>;
}
