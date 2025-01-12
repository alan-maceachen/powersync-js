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
import { v4 as uuid } from 'uuid';
import { generateTestDb } from './utils/testDb';
// TODO import tests from a common package
describe('Basic', () => {
    let dbWithoutWebWorker;
    let dbWithWebWorker;
    beforeEach(() => {
        dbWithoutWebWorker = generateTestDb({ useWebWorker: false });
        dbWithWebWorker = generateTestDb();
    });
    /**
     * Declares a test to be executed with multiple DB connections
     */
    const itWithDBs = (name, test) => {
        it(`${name} - with web worker`, () => test(dbWithWebWorker));
        it(`${name} - without web worker`, () => test(dbWithoutWebWorker));
    };
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield dbWithWebWorker.disconnectAndClear();
        yield dbWithWebWorker.close();
        yield dbWithoutWebWorker.disconnectAndClear();
        yield dbWithoutWebWorker.close();
    }));
    describe('executeQuery', () => {
        itWithDBs('should execute a select query using getAll', (db) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield db.getAll('SELECT * FROM customers');
            expect(result.length).toEqual(0);
        }));
        itWithDBs('should allow inserts', (db) => __awaiter(void 0, void 0, void 0, function* () {
            const testName = 'Steven';
            yield db.execute('INSERT INTO customers (id, name) VALUES(?, ?)', [uuid(), testName]);
            const result = yield db.get('SELECT * FROM customers');
            expect(result.name).equals(testName);
        }));
    });
    describe('executeBatchQuery', () => {
        itWithDBs('should execute a select query using getAll', (db) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield db.getAll('SELECT * FROM customers');
            expect(result.length).toEqual(0);
        }));
        itWithDBs('should allow batch inserts', (db) => __awaiter(void 0, void 0, void 0, function* () {
            const testName = 'Mugi';
            yield db.executeBatch('INSERT INTO customers (id, name) VALUES(?, ?)', [
                [uuid(), testName],
                [uuid(), 'Steven'],
                [uuid(), 'Chris']
            ]);
            const result = yield db.getAll('SELECT * FROM customers');
            expect(result.length).equals(3);
            expect(result[0].name).equals(testName);
            expect(result[1].name).equals('Steven');
            expect(result[2].name).equals('Chris');
        }));
    });
});
//# sourceMappingURL=main.test.js.map