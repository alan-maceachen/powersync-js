import { ColumnType } from '../Column';
import { Index } from './Index';
import { IndexedColumn } from './IndexedColumn';
const text = {
    type: ColumnType.TEXT
};
const integer = {
    type: ColumnType.INTEGER
};
const real = {
    type: ColumnType.REAL
};
export const column = {
    text,
    integer,
    real
};
/*
  Generate a new table from the columns and indexes
*/
export class TableV2 {
    columns;
    options;
    indexes;
    constructor(columns, options = {}) {
        this.columns = columns;
        this.options = options;
        if (options?.indexes) {
            this.indexes = Object.entries(options.indexes).map(([name, columns]) => {
                if (name.startsWith('-')) {
                    return new Index({
                        name: name.substring(1),
                        columns: columns.map((c) => new IndexedColumn({ name: c, ascending: false }))
                    });
                }
                return new Index({
                    name: name,
                    columns: columns.map((c) => new IndexedColumn({ name: c, ascending: true }))
                });
            });
        }
    }
}
//# sourceMappingURL=TableV2.js.map