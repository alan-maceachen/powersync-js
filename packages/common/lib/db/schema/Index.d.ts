import { IndexedColumn } from './IndexedColumn';
import { Table } from './Table';
export interface IndexOptions {
    name: string;
    columns?: IndexedColumn[];
}
export declare const DEFAULT_INDEX_OPTIONS: Partial<IndexOptions>;
export declare class Index {
    protected options: IndexOptions;
    static createAscending(options: IndexOptions, columnNames: string[]): Index;
    constructor(options: IndexOptions);
    get name(): string;
    get columns(): IndexedColumn[];
    toJSON(table: Table): {
        name: string;
        columns: {
            name: string;
            ascending: boolean | undefined;
            type: import("../Column").ColumnType;
        }[];
    };
}
