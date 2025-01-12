export declare enum ColumnType {
    TEXT = "TEXT",
    INTEGER = "INTEGER",
    REAL = "REAL"
}
export interface ColumnOptions {
    name: string;
    type?: ColumnType;
}
export declare class Column {
    protected options: ColumnOptions;
    constructor(options: ColumnOptions);
    get name(): string;
    get type(): ColumnType | undefined;
    toJSON(): {
        name: string;
        type: ColumnType | undefined;
    };
}
