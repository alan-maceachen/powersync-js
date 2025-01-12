import { Kysely, type KyselyConfig } from 'kysely';
import { type AbstractPowerSyncDatabase } from '@powersync/common';
export declare const wrapPowerSyncWithKysely: <T>(db: AbstractPowerSyncDatabase, options?: KyselyConfig) => Kysely<T>;
