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
describe('Basic', () => {
    const users = new TableV2({
        name: column.text,
        email: column.text
    });
    let db;
    beforeEach(() => {
        db = new PowerSyncDatabase({
            database: { dbFilename: 'test-user.db' },
            flags: {
                enableMultiTabs: false
            },
            schema: new Schema({ users })
        });
    });
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield db.disconnectAndClear();
        yield db.close();
    }));
    // Performance tests for CRUD
    describe('Performance tests', { timeout: 50000 }, () => __awaiter(void 0, void 0, void 0, function* () {
        it('INSERT 1000 records', () => __awaiter(void 0, void 0, void 0, function* () {
            const startTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                yield db.execute('INSERT INTO users (id, name, email) VALUES(uuid(), ?, ?)', ['Test User', 'user@test.com']);
            }
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            console.log(`Total time taken for 1000 inserts: ${totalTime.toFixed(2)} milliseconds`);
            expect(yield db.get('SELECT count(*) as count FROM users')).deep.equals({ count: 1000 });
        }));
        it('INSERT 1000 records in a transaction', () => __awaiter(void 0, void 0, void 0, function* () {
            const startTime = performance.now();
            yield db.writeTransaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
                for (let i = 0; i < 1000; i++) {
                    yield tx.execute('INSERT INTO users(id, name, email) VALUES(uuid(), ?, ?)', [
                        'Test User',
                        'user@example.org'
                    ]);
                }
            }));
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            console.log(`Total time taken for 1000 inserts in transaction: ${totalTime.toFixed(2)} milliseconds`);
            expect(yield db.get('SELECT count(*) as count FROM users')).deep.equals({ count: 1000 });
        }));
        it('INSERT 1000 records in batch', () => __awaiter(void 0, void 0, void 0, function* () {
            const startTime = performance.now();
            const values = [];
            for (let i = 0; i < 1000; i++) {
                values.push(['Test User', 'user@example.org']);
            }
            yield db.executeBatch('INSERT INTO users(id, name, email) VALUES(uuid(), ?, ?)', values);
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            console.log(`Total time taken for 1000 inserts in batch: ${totalTime.toFixed(2)} milliseconds`);
            expect(yield db.get('SELECT count(*) as count FROM users')).deep.equals({ count: 1000 });
        }));
    }));
});
//# sourceMappingURL=performance.test.js.map