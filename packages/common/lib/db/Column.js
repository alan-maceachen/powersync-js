// https://www.sqlite.org/lang_expr.html#castexpr
export var ColumnType;
(function (ColumnType) {
    ColumnType["TEXT"] = "TEXT";
    ColumnType["INTEGER"] = "INTEGER";
    ColumnType["REAL"] = "REAL";
})(ColumnType || (ColumnType = {}));
export class Column {
    options;
    constructor(options) {
        this.options = options;
    }
    get name() {
        return this.options.name;
    }
    get type() {
        return this.options.type;
    }
    toJSON() {
        return {
            name: this.name,
            type: this.type
        };
    }
}
//# sourceMappingURL=Column.js.map