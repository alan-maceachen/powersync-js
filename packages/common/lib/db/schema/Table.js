import { Column } from '../Column';
export const DEFAULT_TABLE_OPTIONS = {
    indexes: [],
    insertOnly: false,
    localOnly: false
};
export const InvalidSQLCharacters = /["'%,.#\s[\]]/;
export class Table {
    options;
    static createLocalOnly(options) {
        return new Table({ ...options, localOnly: true, insertOnly: false });
    }
    static createInsertOnly(options) {
        return new Table({ ...options, localOnly: false, insertOnly: true });
    }
    static createTable(name, table) {
        return new Table({
            name,
            columns: Object.entries(table.columns).map(([name, col]) => new Column({ name, type: col.type })),
            indexes: table.indexes,
            localOnly: table.options.localOnly,
            insertOnly: table.options.insertOnly,
            viewName: table.options.viewName
        });
    }
    constructor(options) {
        this.options = { ...DEFAULT_TABLE_OPTIONS, ...options };
    }
    get name() {
        return this.options.name;
    }
    get viewNameOverride() {
        return this.options.viewName;
    }
    get viewName() {
        return this.viewNameOverride ?? this.name;
    }
    get columns() {
        return this.options.columns;
    }
    get indexes() {
        return this.options.indexes ?? [];
    }
    get localOnly() {
        return this.options.localOnly ?? false;
    }
    get insertOnly() {
        return this.options.insertOnly ?? false;
    }
    get internalName() {
        if (this.options.localOnly) {
            return `ps_data_local__${this.name}`;
        }
        return `ps_data__${this.name}`;
    }
    get validName() {
        if (InvalidSQLCharacters.test(this.name)) {
            return false;
        }
        if (this.viewNameOverride != null && InvalidSQLCharacters.test(this.viewNameOverride)) {
            return false;
        }
        return true;
    }
    validate() {
        if (InvalidSQLCharacters.test(this.name)) {
            throw new Error(`Invalid characters in table name: ${this.name}`);
        }
        if (this.viewNameOverride && InvalidSQLCharacters.test(this.viewNameOverride)) {
            throw new Error(`Invalid characters in view name: ${this.viewNameOverride}`);
        }
        const columnNames = new Set();
        columnNames.add('id');
        for (const column of this.columns) {
            const { name: columnName } = column;
            if (column.name == 'id') {
                throw new Error(`${this.name}: id column is automatically added, custom id columns are not supported`);
            }
            if (columnNames.has(columnName)) {
                throw new Error(`Duplicate column ${columnName}`);
            }
            if (InvalidSQLCharacters.test(columnName)) {
                throw new Error(`Invalid characters in column name: $name.${column}`);
            }
            columnNames.add(columnName);
        }
        const indexNames = new Set();
        for (const index of this.indexes) {
            if (indexNames.has(index.name)) {
                throw new Error(`Duplicate index $name.${index}`);
            }
            if (InvalidSQLCharacters.test(index.name)) {
                throw new Error(`Invalid characters in index name: $name.${index}`);
            }
            for (const column of index.columns) {
                if (!columnNames.has(column.name)) {
                    throw new Error(`Column ${column.name} not found for index ${index.name}`);
                }
            }
            indexNames.add(index.name);
        }
    }
    toJSON() {
        return {
            name: this.name,
            view_name: this.viewName,
            local_only: this.localOnly,
            insert_only: this.insertOnly,
            columns: this.columns.map((c) => c.toJSON()),
            indexes: this.indexes.map((e) => e.toJSON(this))
        };
    }
}
//# sourceMappingURL=Table.js.map