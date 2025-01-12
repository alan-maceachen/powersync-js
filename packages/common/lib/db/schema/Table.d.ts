import { Column } from '../Column';
import type { Index } from './Index';
import { TableV2 } from './TableV2';
export interface TableOptions {
    /**
     * The synced table name, matching sync rules
     */
    name: string;
    columns: Column[];
    indexes?: Index[];
    localOnly?: boolean;
    insertOnly?: boolean;
    viewName?: string;
}
export declare const DEFAULT_TABLE_OPTIONS: Partial<TableOptions>;
export declare const InvalidSQLCharacters: RegExp;
export declare class Table {
    protected options: TableOptions;
    static createLocalOnly(options: TableOptions): Table;
    static createInsertOnly(options: TableOptions): Table;
    static createTable(name: string, table: TableV2): Table;
    constructor(options: TableOptions);
    get name(): string;
    get viewNameOverride(): string | undefined;
    get viewName(): string;
    get columns(): Column[];
    get indexes(): Index[];
    get localOnly(): boolean;
    get insertOnly(): boolean;
    get internalName(): string;
    get validName(): boolean;
    validate(): void;
    toJSON(): {
        name: string;
        view_name: string;
        local_only: boolean;
        insert_only: boolean;
        columns: {
            name: string;
            type: import("../Column").ColumnType | undefined;
        }[];
        indexes: {
            name: string;
            columns: {
                name: string;
                ascending: boolean | undefined;
                type: import("../Column").ColumnType;
            }[];
        }[];
    };
}
