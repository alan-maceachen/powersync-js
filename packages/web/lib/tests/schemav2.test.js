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
import { Schema, TableV2, column } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
const assets = new TableV2({
    created_at: column.text,
    make: column.text,
    model: column.text,
    serial_number: column.text,
    quantity: column.integer,
    user_id: column.text,
    weightColumnName: column.real,
    description: column.text
}, {
    indexes: { makemodel: ['make', 'model'] }
});
const assetsNoIndex = new TableV2({
    created_at: column.text,
    make: column.text,
    model: column.text,
    serial_number: column.text,
    quantity: column.integer,
    user_id: column.text,
    weightColumnName: column.real,
    description: column.text
});
const customers = new TableV2({
    name: column.text,
    email: column.text
});
const logs = new TableV2({
    level: column.text,
    content: column.text
}, { insertOnly: true });
const credentials = new TableV2({
    key: column.text,
    value: column.text
}, { localOnly: true });
const aliased = new TableV2({ name: column.text }, { viewName: 'test1' });
/**
 * The default schema
 */
const schema = new Schema({ assets, customers, logs, credentials, aliased });
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
        // Remove a table
        const schema2 = new Schema({ assets, customers, logs, credentials });
        yield powersync.updateSchema(schema2);
        const versionAfter2 = yield powersync.get('PRAGMA schema_version');
        // Updated
        expect(versionAfter2['schema_version']).greaterThan(versionAfter['schema_version']);
    }));
    it('Indexing', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const results = yield powersync.execute('EXPLAIN QUERY PLAN SELECT * FROM assets WHERE make = ?', ['test']);
        expect((_b = (_a = results.rows) === null || _a === void 0 ? void 0 : _a._array) === null || _b === void 0 ? void 0 : _b[0]['detail']).contains('USING INDEX ps_data__assets__makemodel');
        // Now drop the index
        const schema2 = new Schema({ assetsNoIndex, customers, logs, credentials, aliased });
        yield powersync.updateSchema(schema2);
        // Execute instead of getAll so that we don't get a cached query plan
        // from a different connection
        const results2 = yield powersync.execute('EXPLAIN QUERY PLAN SELECT * FROM assetsNoIndex WHERE make = ?', ['test']);
        expect((_d = (_c = results2.rows) === null || _c === void 0 ? void 0 : _c._array) === null || _d === void 0 ? void 0 : _d[0]['detail']).contains('SCAN');
    }));
    it('Local Only', () => __awaiter(void 0, void 0, void 0, function* () {
        const pscrudBeforeInsert = yield powersync.getAll('SELECT * FROM ps_crud');
        expect(pscrudBeforeInsert.length).toEqual(0);
        yield powersync.execute('INSERT INTO credentials (id, key, value) VALUES(uuid(),?,?)', ['test', 'test']);
        const pscrudAfterInsert = yield powersync.getAll('SELECT * FROM ps_crud');
        expect(pscrudAfterInsert.length).toEqual(0);
    }));
    it('Insert Only', () => __awaiter(void 0, void 0, void 0, function* () {
        const pscrudBeforeInsert = yield powersync.getAll('SELECT * FROM ps_crud');
        expect(pscrudBeforeInsert.length).toEqual(0);
        const logsBeforeInsert = yield powersync.getAll('SELECT * FROM logs');
        expect(logsBeforeInsert.length).toEqual(0);
        yield powersync.execute('INSERT INTO logs (id, level, content) VALUES(uuid(),?,?)', ['test', 'test']);
        const pscrudAfterInsert = yield powersync.getAll('SELECT * FROM ps_crud');
        expect(pscrudAfterInsert.length).toEqual(1);
        const logsAfterInsert = yield powersync.getAll('SELECT * FROM logs');
        expect(logsAfterInsert.length).toEqual(0);
    }));
    it('ViewName', () => __awaiter(void 0, void 0, void 0, function* () {
        const aliasedTable = yield powersync.getAll('SELECT * FROM test1');
        expect(Array.isArray(aliasedTable)).toBe(true);
    }));
});
//# sourceMappingURL=schemav2.test.js.map