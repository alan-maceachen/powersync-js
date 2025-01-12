import { ColumnType } from '../Column';
import { Index } from './Index';
export type BaseColumnType<T extends number | string | null> = {
    type: ColumnType;
};
export declare const column: {
    text: BaseColumnType<string | null>;
    integer: BaseColumnType<number | null>;
    real: BaseColumnType<number | null>;
};
export type ColumnsType = Record<string, BaseColumnType<any>>;
export type ExtractColumnValueType<T extends BaseColumnType<any>> = T extends BaseColumnType<infer R> ? R : unknown;
export type RowType<T extends TableV2<any>> = {
    [K in keyof T['columns']]: ExtractColumnValueType<T['columns'][K]>;
} & {
    id: string;
};
export type IndexShorthand = Record<string, string[]>;
export interface TableV2Options {
    indexes?: IndexShorthand;
    localOnly?: boolean;
    insertOnly?: boolean;
    viewName?: string;
}
export declare class TableV2<Columns extends ColumnsType = ColumnsType> {
    columns: Columns;
    options: TableV2Options;
    indexes: Index[];
    constructor(columns: Columns, options?: TableV2Options);
}
