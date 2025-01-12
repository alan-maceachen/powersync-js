import { PowerSyncDatabase, Schema, TableV2 } from '@powersync/web';
export declare const testSchema: Schema<{
    assets: TableV2<{
        created_at: import("@powersync/web").BaseColumnType<string | null>;
        make: import("@powersync/web").BaseColumnType<string | null>;
        model: import("@powersync/web").BaseColumnType<string | null>;
        serial_number: import("@powersync/web").BaseColumnType<string | null>;
        quantity: import("@powersync/web").BaseColumnType<number | null>;
        user_id: import("@powersync/web").BaseColumnType<string | null>;
        customer_id: import("@powersync/web").BaseColumnType<string | null>;
        description: import("@powersync/web").BaseColumnType<string | null>;
    }>;
    customers: TableV2<{
        name: import("@powersync/web").BaseColumnType<string | null>;
        email: import("@powersync/web").BaseColumnType<string | null>;
    }>;
}>;
export declare const generateTestDb: ({ useWebWorker }?: {
    useWebWorker: boolean;
}) => PowerSyncDatabase;
export type TestDatabase = (typeof testSchema)['types'];
