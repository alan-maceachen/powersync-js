var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { describe, expect, it } from 'vitest';
import { PowerSyncDatabase, WASQLiteDBAdapter, WASQLitePowerSyncDatabaseOpenFactory, WASQLiteOpenFactory } from '@powersync/web';
import { testSchema } from './utils/testDb';
const testId = '2290de4f-0488-4e50-abed-f8e8eb1d0b42';
export const basicTest = (db) => __awaiter(void 0, void 0, void 0, function* () {
    yield db.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test']);
    expect(yield db.getAll('SELECT * FROM assets')).length.gt(0);
    yield db.disconnectAndClear();
    yield db.close();
});
describe('Open Methods', () => {
    it('Should open PowerSync clients from old factory methods', () => __awaiter(void 0, void 0, void 0, function* () {
        const db = new WASQLitePowerSyncDatabaseOpenFactory({
            dbFilename: `test-legacy.db`,
            schema: testSchema
        }).getInstance();
        yield basicTest(db);
    }));
    it('Should open with an existing DBAdapter', () => __awaiter(void 0, void 0, void 0, function* () {
        const adapter = new WASQLiteDBAdapter({ dbFilename: 'adapter-test.db' });
        const db = new PowerSyncDatabase({ database: adapter, schema: testSchema });
        yield basicTest(db);
    }));
    it('Should open with provided factory', () => __awaiter(void 0, void 0, void 0, function* () {
        const factory = new WASQLiteOpenFactory({ dbFilename: 'factory-test.db' });
        const db = new PowerSyncDatabase({ database: factory, schema: testSchema });
        yield basicTest(db);
    }));
    it('Should open with options', () => __awaiter(void 0, void 0, void 0, function* () {
        const db = new PowerSyncDatabase({ database: { dbFilename: 'options-test.db' }, schema: testSchema });
        yield basicTest(db);
    }));
});
//# sourceMappingURL=open.test.js.map