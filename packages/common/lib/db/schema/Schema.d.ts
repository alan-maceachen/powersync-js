import { Table as ClassicTable } from './Table';
import { RowType, TableV2 } from './TableV2';
type SchemaType = Record<string, TableV2<any>>;
type SchemaTableType<S extends SchemaType> = {
    [K in keyof S]: RowType<S[K]>;
};
/**
 * A schema is a collection of tables. It is used to define the structure of a database.
 */
export declare class Schema<S extends SchemaType = SchemaType> {
    readonly types: SchemaTableType<S>;
    readonly props: S;
    readonly tables: ClassicTable[];
    constructor(tables: ClassicTable[] | S);
    validate(): void;
    toJSON(): {
        tables: {
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
        }[];
    };
    private convertToClassicTables;
}
export {};
