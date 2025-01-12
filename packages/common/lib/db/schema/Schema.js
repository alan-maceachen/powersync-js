import { Table as ClassicTable } from './Table';
/**
 * A schema is a collection of tables. It is used to define the structure of a database.
 */
export class Schema {
    /*
      Only available when constructing with mapped typed definition columns
    */
    types;
    props;
    tables;
    constructor(tables) {
        if (Array.isArray(tables)) {
            this.tables = tables;
        }
        else {
            this.props = tables;
            this.tables = this.convertToClassicTables(this.props);
        }
    }
    validate() {
        for (const table of this.tables) {
            table.validate();
        }
    }
    toJSON() {
        return {
            tables: this.tables.map((t) => t.toJSON())
        };
    }
    convertToClassicTables(props) {
        return Object.entries(props).map(([name, table]) => {
            return ClassicTable.createTable(name, table);
        });
    }
}
//# sourceMappingURL=Schema.js.map