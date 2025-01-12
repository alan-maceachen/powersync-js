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
import { Column, ColumnType, CrudEntry, Schema, Table, UpdateType } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { generateTestDb } from './utils/testDb';
import pDefer from 'p-defer';
const testId = '2290de4f-0488-4e50-abed-f8e8eb1d0b42';
describe('CRUD Tests', () => {
    let powersync;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        powersync = generateTestDb();
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield powersync.disconnectAndClear();
        yield powersync.close();
    }));
    it('INSERT', () => __awaiter(void 0, void 0, void 0, function* () {
        expect(yield powersync.getAll('SELECT * FROM ps_crud')).empty;
        yield powersync.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test']);
        expect(yield powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
            {
                data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"description":"test"}}`
            }
        ]);
        const tx = (yield powersync.getNextCrudTransaction());
        expect(tx.transactionId).equals(1);
        const expectedCrudEntry = new CrudEntry(1, UpdateType.PUT, 'assets', testId, 1, { description: 'test' });
        expect(tx.crud[0].equals(expectedCrudEntry)).true;
    }));
    it('BATCH INSERT', () => __awaiter(void 0, void 0, void 0, function* () {
        expect(yield powersync.getAll('SELECT * FROM ps_crud')).empty;
        const query = `INSERT INTO assets(id, description) VALUES(?, ?)`;
        yield powersync.executeBatch(query, [
            [testId, 'test'],
            ['mockId', 'test1']
        ]);
        expect(yield powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
            {
                data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"description":"test"}}`
            },
            {
                data: `{"op":"PUT","type":"assets","id":"mockId","data":{"description":"test1"}}`
            }
        ]);
        const crudBatch = (yield powersync.getCrudBatch(2));
        expect(crudBatch.crud.length).equals(2);
        const expectedCrudEntry = new CrudEntry(1, UpdateType.PUT, 'assets', testId, 1, { description: 'test' });
        const expectedCrudEntry2 = new CrudEntry(2, UpdateType.PUT, 'assets', 'mockId', 1, { description: 'test1' });
        expect(crudBatch.crud[0].equals(expectedCrudEntry)).true;
        expect(crudBatch.crud[1].equals(expectedCrudEntry2)).true;
    }));
    it('INSERT OR REPLACE', () => __awaiter(void 0, void 0, void 0, function* () {
        yield powersync.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test']);
        yield powersync.execute('DELETE FROM ps_crud WHERE 1');
        // Replace
        yield powersync.execute('INSERT OR REPLACE INTO assets(id, description) VALUES(?, ?)', [testId, 'test2']);
        // This generates another PUT
        expect(yield powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
            {
                data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"description":"test2"}}`
            }
        ]);
        expect(yield powersync.get('SELECT count(*) AS count FROM assets')).deep.equals({ count: 1 });
        // Make sure uniqueness is enforced
        expect(powersync.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test3'])).rejects.toThrow(/UNIQUE constraint failed/);
    }));
    it('UPDATE', () => __awaiter(void 0, void 0, void 0, function* () {
        yield powersync.execute('INSERT INTO assets(id, description, make) VALUES(?, ?, ?)', [testId, 'test', 'test']);
        yield powersync.execute('DELETE FROM ps_crud WHERE 1');
        yield powersync.execute('UPDATE assets SET description = ? WHERE id = ?', ['test2', testId]);
        expect(yield powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
            {
                data: `{"op":"PATCH","type":"assets","id":"${testId}","data":{"description":"test2"}}`
            }
        ]);
        const tx = (yield powersync.getNextCrudTransaction());
        expect(tx.transactionId).equals(2);
        const expectedCrudEntry = new CrudEntry(2, UpdateType.PATCH, 'assets', testId, 2, { description: 'test2' });
        expect(tx.crud[0].equals(expectedCrudEntry)).true;
    }));
    it('BATCH UPDATE', () => __awaiter(void 0, void 0, void 0, function* () {
        yield powersync.executeBatch('INSERT INTO assets(id, description, make) VALUES(?, ?, ?)', [
            [testId, 'test', 'test'],
            ['mockId', 'test', 'test']
        ]);
        yield powersync.execute('DELETE FROM ps_crud WHERE 1');
        yield powersync.executeBatch('UPDATE assets SET description = ?, make = ?', [['test2', 'make2']]);
        expect(yield powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
            {
                data: `{"op":"PATCH","type":"assets","id":"${testId}","data":{"description":"test2","make":"make2"}}`
            },
            {
                data: `{"op":"PATCH","type":"assets","id":"mockId","data":{"description":"test2","make":"make2"}}`
            }
        ]);
        const crudBatch = (yield powersync.getCrudBatch(2));
        expect(crudBatch.crud.length).equals(2);
        const expectedCrudEntry = new CrudEntry(3, UpdateType.PATCH, 'assets', testId, 2, {
            description: 'test2',
            make: 'make2'
        });
        const expectedCrudEntry2 = new CrudEntry(4, UpdateType.PATCH, 'assets', 'mockId', 2, {
            description: 'test2',
            make: 'make2'
        });
        expect(crudBatch.crud[0].equals(expectedCrudEntry)).true;
        expect(crudBatch.crud[1].equals(expectedCrudEntry2)).true;
    }));
    it('DELETE', () => __awaiter(void 0, void 0, void 0, function* () {
        yield powersync.execute('INSERT INTO assets(id, description, make) VALUES(?, ?, ?)', [testId, 'test', 'test']);
        yield powersync.execute('DELETE FROM ps_crud WHERE 1');
        yield powersync.execute('DELETE FROM assets WHERE id = ?', [testId]);
        expect(yield powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
            { data: `{"op":"DELETE","type":"assets","id":"${testId}"}` }
        ]);
        const tx = (yield powersync.getNextCrudTransaction());
        expect(tx.transactionId).equals(2);
        const expectedCrudEntry = new CrudEntry(2, UpdateType.DELETE, 'assets', testId, 2);
        expect(tx.crud[0].equals(expectedCrudEntry)).true;
    }));
    it('UPSERT not supported', () => __awaiter(void 0, void 0, void 0, function* () {
        // Just shows that we cannot currently do this
        expect(powersync.execute('INSERT INTO assets(id, description) VALUES(?, ?) ON CONFLICT DO UPDATE SET description = ?', [
            testId,
            'test2',
            'test3'
        ])).rejects.toThrowError('cannot UPSERT a view');
    }));
    it('INSERT-only tables', () => __awaiter(void 0, void 0, void 0, function* () {
        yield powersync.disconnectAndClear();
        powersync = new PowerSyncDatabase({
            /**
             * Deleting the IndexDB seems to freeze the test.
             * Use a new DB for each run to keep CRUD counters
             * consistent
             */
            database: {
                dbFilename: 'test.db' + uuid()
            },
            schema: new Schema([
                new Table({
                    name: 'logs',
                    insertOnly: true,
                    columns: [
                        new Column({ name: 'level', type: ColumnType.TEXT }),
                        new Column({ name: 'content', type: ColumnType.TEXT })
                    ]
                })
            ]),
            flags: {
                enableMultiTabs: false
            }
        });
        expect(yield powersync.getAll('SELECT * FROM ps_crud')).empty;
        yield powersync.execute('INSERT INTO logs(id, level, content) VALUES(?, ?, ?)', [testId, 'INFO', 'test log']);
        expect(yield powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
            {
                data: `{"op":"PUT","type":"logs","id":"${testId}","data":{"content":"test log","level":"INFO"}}`
            }
        ]);
        expect(yield powersync.getAll('SELECT * FROM logs')).empty;
        const tx = (yield powersync.getNextCrudTransaction());
        expect(tx.transactionId).equals(1);
        const expectedCrudEntry = new CrudEntry(1, UpdateType.PUT, 'logs', testId, 1, {
            content: 'test log',
            level: 'INFO'
        });
        expect(tx.crud[0].equals(expectedCrudEntry)).true;
    }));
    it('big numbers - integer', () => __awaiter(void 0, void 0, void 0, function* () {
        const bigNumber = 1 << 62;
        yield powersync.execute('INSERT INTO assets(id, quantity) VALUES(?, ?)', [testId, bigNumber]);
        expect(yield powersync.get('SELECT quantity FROM assets WHERE id = ?', [testId])).deep.equals({
            quantity: bigNumber
        });
        expect(yield powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
            {
                data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"quantity":${bigNumber}}}`
            }
        ]);
        const tx = (yield powersync.getNextCrudTransaction());
        expect(tx.transactionId).equals(1);
        expect(tx.crud[0].equals(new CrudEntry(1, UpdateType.PUT, 'assets', testId, 1, { quantity: bigNumber }))).equals(true);
    }));
    it('big numbers - text', () => __awaiter(void 0, void 0, void 0, function* () {
        const bigNumber = 1 << 62;
        yield powersync.execute('INSERT INTO assets(id, quantity) VALUES(?, ?)', [testId, `${bigNumber}`]);
        // Cast as INTEGER when querying
        expect(yield powersync.get('SELECT quantity FROM assets WHERE id = ?', [testId])).deep.equals({
            quantity: bigNumber
        });
        // Not cast as part of crud / persistance
        expect(yield powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
            {
                data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"quantity":"${bigNumber}"}}`
            }
        ]);
        yield powersync.execute('DELETE FROM ps_crud WHERE 1');
        yield powersync.execute('UPDATE assets SET description = ?, quantity = quantity + 1 WHERE id = ?', [
            'updated',
            testId
        ]);
        expect(yield powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
            {
                data: `{"op":"PATCH","type":"assets","id":"${testId}","data":{"description":"updated","quantity":${bigNumber + 1}}}`
            }
        ]);
    }));
    it('Transaction grouping', () => __awaiter(void 0, void 0, void 0, function* () {
        expect(yield powersync.getAll('SELECT * FROM ps_crud')).empty;
        yield powersync.writeTransaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test1']);
            yield tx.execute('INSERT INTO assets(id, description) VALUES(?, ?)', ['test2', 'test2']);
        }));
        yield powersync.writeTransaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.execute('UPDATE assets SET description = ? WHERE id = ?', ['updated', testId]);
        }));
        const tx1 = (yield powersync.getNextCrudTransaction());
        expect(tx1.transactionId).equals(1);
        const expectedCrudEntries = [
            new CrudEntry(1, UpdateType.PUT, 'assets', testId, 1, { description: 'test1' }),
            new CrudEntry(2, UpdateType.PUT, 'assets', 'test2', 1, { description: 'test2' })
        ];
        expect(tx1.crud.map((entry, index) => entry.equals(expectedCrudEntries[index]))).deep.equals([true, true]);
        yield tx1.complete();
        const tx2 = (yield powersync.getNextCrudTransaction());
        expect(tx2.transactionId).equals(2);
        const expectedCrudEntry2 = new CrudEntry(3, UpdateType.PATCH, 'assets', testId, 2, { description: 'updated' });
        expect(tx2.crud[0].equals(expectedCrudEntry2)).true;
        yield tx2.complete();
        expect(yield powersync.getNextCrudTransaction()).equals(null);
    }));
    it('Transaction exclusivity', () => __awaiter(void 0, void 0, void 0, function* () {
        const outside = pDefer();
        const inTx = pDefer();
        const txPromise = powersync.writeTransaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test1']);
            inTx.resolve();
            yield outside.promise;
            yield tx.rollback();
        }));
        yield inTx.promise;
        const r = powersync.getOptional('SELECT * FROM assets WHERE id = ?', [testId]);
        yield new Promise((resolve) => setTimeout(resolve, 10));
        outside.resolve();
        yield txPromise;
        expect(yield r).toEqual(null);
    }));
});
//# sourceMappingURL=crud.test.js.map