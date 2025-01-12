var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Column, ColumnType, Index, IndexedColumn, Schema, Table } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
/**
 * Generates the Asset table with configurable options which
 * will be modified later.
 */
const generateAssetsTable = (weightColumnName = 'weight', includeIndexes = true, indexAscending = true) => new Table({
    name: 'assets',
    columns: [
        new Column({ name: 'created_at', type: ColumnType.TEXT }),
        new Column({ name: 'make', type: ColumnType.TEXT }),
        new Column({ name: 'model', type: ColumnType.TEXT }),
        new Column({ name: 'serial_number', type: ColumnType.TEXT }),
        new Column({ name: 'quantity', type: ColumnType.INTEGER }),
        new Column({ name: 'user_id', type: ColumnType.TEXT }),
        new Column({ name: weightColumnName, type: ColumnType.REAL }),
        new Column({ name: 'description', type: ColumnType.TEXT })
    ],
    indexes: includeIndexes
        ? [
            new Index({
                name: 'makemodel',
                columns: [
                    new IndexedColumn({
                        name: 'make'
                    }),
                    new IndexedColumn({ name: 'model', ascending: indexAscending })
                ]
            })
        ]
        : []
});
/**
 * Generates all the schema tables.
 * Allows for a custom assets table generator to be supplied.
 */
const generateSchemaTables = (assetsTableGenerator = generateAssetsTable) => [
    assetsTableGenerator(),
    new Table({
        name: 'customers',
        columns: [new Column({ name: 'name', type: ColumnType.TEXT }), new Column({ name: 'email', type: ColumnType.TEXT })]
    }),
    new Table({
        name: 'logs',
        insertOnly: true,
        columns: [
            new Column({ name: 'level', type: ColumnType.TEXT }),
            new Column({ name: 'content', type: ColumnType.TEXT })
        ]
    }),
    new Table({
        name: 'credentials',
        localOnly: true,
        columns: [new Column({ name: 'key', type: ColumnType.TEXT }), new Column({ name: 'value', type: ColumnType.TEXT })]
    }),
    new Table({
        name: 'aliased',
        columns: [new Column({ name: 'name', type: ColumnType.TEXT })],
        viewName: 'test1'
    })
];
/**
 * The default schema
 */
const schema = new Schema(generateSchemaTables());
describe('Schema Tests', () => {
    let powersync;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        powersync = new PowerSyncDatabase({
            /**
             * Deleting the IndexDB seems to freeze the test.
             * Use a new DB for each run to keep CRUD counters
             * consistent
             */
            database: { dbFilename: 'test.db' },
            schema,
            flags: {
                enableMultiTabs: false
            }
        });
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield powersync.disconnectAndClear();
        yield powersync.close();
    }));
    it('Schema versioning', () => __awaiter(void 0, void 0, void 0, function* () {
        // Test that powersync_replace_schema() is a no-op when the schema is not
        // modified.
        const versionBefore = yield powersync.get('PRAGMA schema_version');
        yield powersync.updateSchema(schema);
        const versionAfter = yield powersync.get('PRAGMA schema_version');
        // No change
        expect(versionAfter['schema_version']).equals(versionBefore['schema_version']);
        // The `weight` columns is now `weights`
        const schema2 = new Schema(generateSchemaTables(() => generateAssetsTable('weights')));
        yield powersync.updateSchema(schema2);
        const versionAfter2 = yield powersync.get('PRAGMA schema_version');
        // Updated
        expect(versionAfter2['schema_version']).greaterThan(versionAfter['schema_version']);
        // The index is now descending
        const schema3 = new Schema(generateSchemaTables(() => generateAssetsTable('weights', true, false)));
        yield powersync.updateSchema(schema3);
        const versionAfter3 = yield powersync.get('PRAGMA schema_version');
        // Updated
        expect(versionAfter3['schema_version']).greaterThan(versionAfter2['schema_version']);
    }));
    it('Indexing', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const results = yield powersync.execute('EXPLAIN QUERY PLAN SELECT * FROM assets WHERE make = ?', ['test']);
        expect((_b = (_a = results.rows) === null || _a === void 0 ? void 0 : _a._array) === null || _b === void 0 ? void 0 : _b[0]['detail']).contains('USING INDEX ps_data__assets__makemodel');
        // Now drop the index
        const schema2 = new Schema(generateSchemaTables(() => generateAssetsTable('weight', false)));
        yield powersync.updateSchema(schema2);
        // Execute instead of getAll so that we don't get a cached query plan
        // from a different connection
        const results2 = yield powersync.execute('EXPLAIN QUERY PLAN SELECT * FROM assets WHERE make = ?', ['test']);
        expect((_d = (_c = results2.rows) === null || _c === void 0 ? void 0 : _c._array) === null || _d === void 0 ? void 0 : _d[0]['detail']).contains('SCAN');
    }));
});
//# sourceMappingURL=schema.test.js.map