var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { OpType, OpTypeEnum, OplogEntry, Schema, SqliteBucketStorage, SyncDataBatch, SyncDataBucket } from '@powersync/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PowerSyncDatabase, WASQLitePowerSyncDatabaseOpenFactory } from '@powersync/web';
import { Mutex } from 'async-mutex';
import { testSchema } from './utils/testDb';
const putAsset1_1 = OplogEntry.fromRow({
    op_id: '1',
    op: new OpType(OpTypeEnum.PUT).toJSON(),
    object_type: 'assets',
    object_id: 'O1',
    data: '{"description": "bar"}',
    checksum: 1
});
const putAsset2_2 = OplogEntry.fromRow({
    op_id: '2',
    op: new OpType(OpTypeEnum.PUT).toJSON(),
    object_type: 'assets',
    object_id: 'O2',
    data: '{"description": "bar"}',
    checksum: 2
});
const putAsset1_3 = OplogEntry.fromRow({
    op_id: '3',
    op: new OpType(OpTypeEnum.PUT).toJSON(),
    object_type: 'assets',
    object_id: 'O1',
    data: '{"description": "bard"}',
    checksum: 3
});
const removeAsset1_4 = OplogEntry.fromRow({
    op_id: '4',
    op: new OpType(OpTypeEnum.REMOVE).toJSON(),
    object_type: 'assets',
    object_id: 'O1',
    checksum: 4
});
const removeAsset1_5 = OplogEntry.fromRow({
    op_id: '5',
    op: new OpType(OpTypeEnum.REMOVE).toJSON(),
    object_type: 'assets',
    object_id: 'O1',
    checksum: 5
});
describe('Bucket Storage', () => {
    let db;
    let bucketStorage;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        db = new PowerSyncDatabase({
            database: {
                dbFilename: 'test-bucket-storage.db'
            },
            flags: {
                enableMultiTabs: false
            },
            schema: testSchema
        });
        yield db.waitForReady();
        bucketStorage = new SqliteBucketStorage(db.database, new Mutex());
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield db.disconnectAndClear();
        yield db.close();
    }));
    function syncLocalChecked(checkpoint) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield bucketStorage.syncLocalDatabase(checkpoint);
            expect(result).deep.equals({ ready: true, checkpointValid: true });
        });
    }
    function expectAsset1_3() {
        return __awaiter(this, arguments, void 0, function* (database = db) {
            expect(yield database.getAll("SELECT id, description, make FROM assets WHERE id = 'O1'")).deep.equals([
                { id: 'O1', description: 'bard', make: null }
            ]);
        });
    }
    function expectNoAsset1() {
        return __awaiter(this, void 0, void 0, function* () {
            expect(yield db.getAll("SELECT id, description, make FROM assets WHERE id = 'O1'")).deep.equals([]);
        });
    }
    function expectNoAssets() {
        return __awaiter(this, void 0, void 0, function* () {
            expect(yield db.getAll('SELECT id, description, make FROM assets')).deep.equals([]);
        });
    }
    it('Basic Setup', () => __awaiter(void 0, void 0, void 0, function* () {
        yield db.waitForReady();
        expect(yield bucketStorage.getBucketStates()).empty;
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)]));
        const bucketStates = yield bucketStorage.getBucketStates();
        expect(bucketStates).deep.equals([
            {
                bucket: 'bucket1',
                op_id: '3'
            }
        ]);
        yield syncLocalChecked({
            last_op_id: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        yield expectAsset1_3();
    }));
    it('should get an object from multiple buckets', () => __awaiter(void 0, void 0, void 0, function* () {
        yield bucketStorage.saveSyncData(new SyncDataBatch([
            new SyncDataBucket('bucket1', [putAsset1_3], false),
            new SyncDataBucket('bucket2', [putAsset1_3], false)
        ]));
        yield syncLocalChecked({
            last_op_id: '3',
            buckets: [
                { bucket: 'bucket1', checksum: 3 },
                { bucket: 'bucket2', checksum: 3 }
            ]
        });
        yield expectAsset1_3();
    }));
    it('should prioritize later updates', () => __awaiter(void 0, void 0, void 0, function* () {
        // Test behaviour when the same object is present in multiple buckets.
        // In this case, there are two different versions in the different buckets.
        // While we should not get this with our server implementation, the client still specifies this behaviour:
        // The largest op_id wins.
        yield bucketStorage.saveSyncData(new SyncDataBatch([
            new SyncDataBucket('bucket1', [putAsset1_3], false),
            new SyncDataBucket('bucket2', [putAsset1_1], false)
        ]));
        yield syncLocalChecked({
            last_op_id: '3',
            buckets: [
                { bucket: 'bucket1', checksum: 3 },
                { bucket: 'bucket2', checksum: 1 }
            ]
        });
        yield expectAsset1_3();
    }));
    it('should ignore a remove from one bucket', () => __awaiter(void 0, void 0, void 0, function* () {
        // When we have 1 PUT and 1 REMOVE, the object must be kept.
        yield bucketStorage.saveSyncData(new SyncDataBatch([
            new SyncDataBucket('bucket1', [putAsset1_3], false),
            new SyncDataBucket('bucket2', [putAsset1_3, removeAsset1_4], false)
        ]));
        yield syncLocalChecked({
            last_op_id: '4',
            buckets: [
                { bucket: 'bucket1', checksum: 3 },
                { bucket: 'bucket2', checksum: 7 }
            ]
        });
        yield expectAsset1_3();
    }));
    it('should remove when removed from all buckets', () => __awaiter(void 0, void 0, void 0, function* () {
        // When we only have REMOVE left for an object, it must be deleted.
        yield bucketStorage.saveSyncData(new SyncDataBatch([
            new SyncDataBucket('bucket1', [putAsset1_3, removeAsset1_5], false),
            new SyncDataBucket('bucket2', [putAsset1_3, removeAsset1_4], false)
        ]));
        yield syncLocalChecked({
            last_op_id: '5',
            buckets: [
                { bucket: 'bucket1', checksum: 8 },
                { bucket: 'bucket2', checksum: 7 }
            ]
        });
        yield expectNoAssets();
    }));
    it('should use subkeys', () => __awaiter(void 0, void 0, void 0, function* () {
        // subkeys cause this to be treated as a separate entity in the oplog,
        // but same entity in the local db.
        const put4 = OplogEntry.fromRow({
            op_id: '4',
            op: new OpType(OpTypeEnum.PUT).toJSON(),
            subkey: 'b',
            object_type: 'assets',
            object_id: 'O1',
            data: '{"description": "B"}',
            checksum: 4
        });
        const remove5 = OplogEntry.fromRow({
            op_id: '5',
            op: new OpType(OpTypeEnum.REMOVE).toJSON(),
            subkey: 'b',
            object_type: 'assets',
            object_id: 'O1',
            checksum: 5
        });
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset1_3, put4], false)]));
        yield syncLocalChecked({
            last_op_id: '4',
            buckets: [{ bucket: 'bucket1', checksum: 8 }]
        });
        expect(yield db.getAll("SELECT id, description, make FROM assets WHERE id = 'O1'")).deep.equals([
            { id: 'O1', description: 'B', make: null }
        ]);
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [remove5], false)]));
        yield syncLocalChecked({
            last_op_id: '5',
            buckets: [{ bucket: 'bucket1', checksum: 13 }]
        });
        yield expectAsset1_3();
    }));
    it('should fail checksum validation', () => __awaiter(void 0, void 0, void 0, function* () {
        // Simple checksum validation
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)]));
        const result = yield bucketStorage.syncLocalDatabase({
            last_op_id: '3',
            buckets: [
                { bucket: 'bucket1', checksum: 10 },
                { bucket: 'bucket2', checksum: 1 }
            ]
        });
        expect(result).deep.equals({
            ready: false,
            checkpointValid: false,
            checkpointFailures: ['bucket1', 'bucket2']
        });
        yield expectNoAssets();
    }));
    it('should delete buckets', () => __awaiter(void 0, void 0, void 0, function* () {
        yield bucketStorage.saveSyncData(new SyncDataBatch([
            new SyncDataBucket('bucket1', [putAsset1_3], false),
            new SyncDataBucket('bucket2', [putAsset1_3], false)
        ]));
        yield bucketStorage.removeBuckets(['bucket2']);
        // The delete only takes effect after syncLocal.
        yield syncLocalChecked({
            last_op_id: '3',
            buckets: [{ bucket: 'bucket1', checksum: 3 }]
        });
        // Bucket is deleted, but object is still present in other buckets.
        yield expectAsset1_3();
        yield bucketStorage.removeBuckets(['bucket1']);
        yield syncLocalChecked({ last_op_id: '3', buckets: [] });
        // Both buckets deleted - object removed.
        yield expectNoAssets();
    }));
    it('should delete and re-create buckets', () => __awaiter(void 0, void 0, void 0, function* () {
        // Save some data
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1], false)]));
        // Delete the bucket
        yield bucketStorage.removeBuckets(['bucket1']);
        // Save some data again
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset1_3], false)]));
        // Delete again
        yield bucketStorage.removeBuckets(['bucket1']);
        // Final save of data
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset1_3], false)]));
        // Check that the data is there
        yield syncLocalChecked({
            last_op_id: '3',
            buckets: [{ bucket: 'bucket1', checksum: 4 }]
        });
        yield expectAsset1_3();
        // Now final delete
        yield bucketStorage.removeBuckets(['bucket1']);
        yield syncLocalChecked({ last_op_id: '3', buckets: [] });
        yield expectNoAssets();
    }));
    it('should handle MOVE', () => __awaiter(void 0, void 0, void 0, function* () {
        yield bucketStorage.saveSyncData(new SyncDataBatch([
            new SyncDataBucket('bucket1', [
                OplogEntry.fromRow({
                    op_id: '1',
                    op: new OpType(OpTypeEnum.MOVE).toJSON(),
                    checksum: 1,
                    data: '{"target": "3"}'
                })
            ], false)
        ]));
        // At this point, we have target: 3, but don't have that op yet, so we cannot sync.
        const result = yield bucketStorage.syncLocalDatabase({
            last_op_id: '2',
            buckets: [{ bucket: 'bucket1', checksum: 1 }]
        });
        // Checksum passes, but we don't have a complete checkpoint
        expect(result).deep.equals({ ready: false, checkpointValid: true });
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_3], false)]));
        yield syncLocalChecked({
            last_op_id: '3',
            buckets: [{ bucket: 'bucket1', checksum: 4 }]
        });
        yield expectAsset1_3();
    }));
    it('should handle CLEAR', () => __awaiter(void 0, void 0, void 0, function* () {
        // Save some data
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1], false)]));
        yield syncLocalChecked({
            last_op_id: '1',
            buckets: [{ bucket: 'bucket1', checksum: 1 }]
        });
        // CLEAR, then save new data
        yield bucketStorage.saveSyncData(new SyncDataBatch([
            new SyncDataBucket('bucket1', [
                OplogEntry.fromRow({
                    op_id: '2',
                    op: new OpType(OpTypeEnum.CLEAR).toJSON(),
                    checksum: 2
                }),
                OplogEntry.fromRow({
                    op_id: '3',
                    op: new OpType(OpTypeEnum.PUT).toJSON(),
                    checksum: 3,
                    data: putAsset2_2.data,
                    object_id: putAsset2_2.object_id,
                    object_type: putAsset2_2.object_type
                })
            ], false)
        ]));
        yield syncLocalChecked({
            last_op_id: '3',
            // 2 + 3. 1 is replaced with 2.
            buckets: [{ bucket: 'bucket1', checksum: 5 }]
        });
        yield expectNoAsset1();
        console.log(yield db.getAll(`SELECT id, description FROM assets WHERE id = 'O2'`));
        expect(yield db.get("SELECT id, description FROM assets WHERE id = 'O2'")).deep.equals({
            id: 'O2',
            description: 'bar'
        });
    }));
    it('update with new types', () => __awaiter(void 0, void 0, void 0, function* () {
        const dbName = `test-bucket-storage-new-types.db`;
        // Test case where a type is added to the schema after we already have the data.
        const factory = new WASQLitePowerSyncDatabaseOpenFactory({
            dbFilename: dbName,
            flags: {
                enableMultiTabs: false
            },
            schema: new Schema([])
        });
        let powersync = factory.getInstance();
        yield powersync.waitForReady();
        bucketStorage = new SqliteBucketStorage(powersync.database, new Mutex());
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)]));
        yield syncLocalChecked({
            last_op_id: '4',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        yield expect(powersync.getAll('SELECT * FROM assets')).rejects.toThrow('no such table');
        yield powersync.close();
        // Now open another instance with new schema
        const factory2 = new WASQLitePowerSyncDatabaseOpenFactory({
            dbFilename: dbName,
            flags: {
                enableMultiTabs: false
            },
            schema: testSchema
        });
        powersync = factory2.getInstance();
        yield expectAsset1_3(powersync);
        yield powersync.disconnectAndClear();
        yield powersync.close();
    }));
    it('should remove types', () => __awaiter(void 0, void 0, void 0, function* () {
        const dbName = `test-bucket-storage-remove-types.db`;
        // Test case where a type is added to the schema after we already have the data.
        const factory = new WASQLitePowerSyncDatabaseOpenFactory({
            dbFilename: dbName,
            flags: {
                enableMultiTabs: false
            },
            schema: testSchema
        });
        let powersync = factory.getInstance();
        yield powersync.waitForReady();
        bucketStorage = new SqliteBucketStorage(powersync.database, new Mutex());
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)]));
        yield syncLocalChecked({
            last_op_id: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        yield expectAsset1_3(powersync);
        yield powersync.close();
        // Now open another instance with new schema
        const factory2 = new WASQLitePowerSyncDatabaseOpenFactory({
            dbFilename: dbName,
            flags: {
                enableMultiTabs: false
            },
            schema: new Schema([])
        });
        powersync = factory2.getInstance();
        yield expect(powersync.execute('SELECT * FROM assets')).rejects.toThrowError('no such table');
        yield powersync.close();
        // Add schema again
        powersync = factory.getInstance();
        yield expectAsset1_3(powersync);
        yield powersync.disconnectAndClear();
        yield powersync.close();
    }));
    it('should compact', () => __awaiter(void 0, void 0, void 0, function* () {
        // Test compacting behaviour.
        // This test relies heavily on internals, and will have to be updated when the compact implementation is updated.
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, removeAsset1_4], false)]));
        yield syncLocalChecked({
            last_op_id: '4',
            write_checkpoint: '4',
            buckets: [{ bucket: 'bucket1', checksum: 7 }]
        });
        yield bucketStorage.forceCompact();
        yield syncLocalChecked({
            last_op_id: '4',
            write_checkpoint: '4',
            buckets: [{ bucket: 'bucket1', checksum: 7 }]
        });
        const stats = yield db.getAll('SELECT row_type as type, row_id as id, count(*) as count FROM ps_oplog GROUP BY row_type, row_id ORDER BY row_type, row_id');
        expect(stats).deep.equals([{ type: 'assets', id: 'O2', count: 1 }]);
    }));
    it('should not sync local db with pending crud - server removed', () => __awaiter(void 0, void 0, void 0, function* () {
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)]));
        yield syncLocalChecked({
            last_op_id: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        // Local save
        yield db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);
        expect(yield db.getAll("SELECT id FROM assets WHERE id = 'O3'")).deep.equals([{ id: 'O3' }]);
        // At this point, we have data in the crud table, and are not able to sync the local db.
        const result = yield bucketStorage.syncLocalDatabase({
            last_op_id: '3',
            write_checkpoint: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        expect(result).deep.equals({ ready: false, checkpointValid: true });
        const batch = yield bucketStorage.getCrudBatch();
        yield batch.complete();
        yield bucketStorage.updateLocalTarget(() => __awaiter(void 0, void 0, void 0, function* () {
            return '4';
        }));
        // At this point, the data has been uploaded, but not synced back yet.
        const result3 = yield bucketStorage.syncLocalDatabase({
            last_op_id: '3',
            write_checkpoint: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        expect(result3).deep.equals({ ready: false, checkpointValid: true });
        // The data must still be present locally.
        expect(yield db.getAll("SELECT id FROM assets WHERE id = 'O3'")).deep.equals([{ id: 'O3' }]);
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [], false)]));
        // Now we have synced the data back (or lack of data in this case),
        // so we can do a local sync.
        yield syncLocalChecked({
            last_op_id: '5',
            write_checkpoint: '5',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        // Since the object was not in the sync response, it is deleted.
        expect(yield db.getAll("SELECT id FROM assets WHERE id = 'O3'")).empty;
    }));
    it('should not sync local db with pending crud when more crud is added (1)', () => __awaiter(void 0, void 0, void 0, function* () {
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)]));
        yield syncLocalChecked({
            last_op_id: '3',
            write_checkpoint: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        // Local save
        yield db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);
        const batch = yield bucketStorage.getCrudBatch();
        yield batch.complete();
        yield bucketStorage.updateLocalTarget(() => __awaiter(void 0, void 0, void 0, function* () {
            return '4';
        }));
        const result3 = yield bucketStorage.syncLocalDatabase({
            last_op_id: '3',
            write_checkpoint: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        expect(result3).deep.equals({ ready: false, checkpointValid: true });
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [], false)]));
        // Add more data before syncLocalDatabase.
        yield db.execute('INSERT INTO assets(id) VALUES(?)', ['O4']);
        const result4 = yield bucketStorage.syncLocalDatabase({
            last_op_id: '5',
            write_checkpoint: '5',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        expect(result4).deep.equals({ ready: false, checkpointValid: true });
    }));
    it('should not sync local db with pending crud when more crud is added (2)', () => __awaiter(void 0, void 0, void 0, function* () {
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)]));
        yield syncLocalChecked({
            last_op_id: '3',
            write_checkpoint: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        // Local save
        yield db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);
        const batch = yield bucketStorage.getCrudBatch();
        // Add more data before the complete() call
        yield db.execute('INSERT INTO assets(id) VALUES(?)', ['O4']);
        yield batch.complete();
        yield bucketStorage.updateLocalTarget(() => __awaiter(void 0, void 0, void 0, function* () {
            return '4';
        }));
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [], false)]));
        const result4 = yield bucketStorage.syncLocalDatabase({
            last_op_id: '5',
            write_checkpoint: '5',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        expect(result4).deep.equals({ ready: false, checkpointValid: true });
    }));
    it('should not sync local db with pending crud - update on server', () => __awaiter(void 0, void 0, void 0, function* () {
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)]));
        yield syncLocalChecked({
            last_op_id: '3',
            write_checkpoint: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        // Local save
        yield db.execute('INSERT INTO assets(id) VALUES(?)', ['O3']);
        const batch = yield bucketStorage.getCrudBatch();
        yield batch.complete();
        yield bucketStorage.updateLocalTarget(() => __awaiter(void 0, void 0, void 0, function* () {
            return '4';
        }));
        yield bucketStorage.saveSyncData(new SyncDataBatch([
            new SyncDataBucket('bucket1', [
                OplogEntry.fromRow({
                    op_id: '5',
                    op: new OpType(OpTypeEnum.PUT).toJSON(),
                    object_type: 'assets',
                    object_id: 'O3',
                    checksum: 5,
                    data: '{"description": "server updated"}'
                })
            ], false)
        ]));
        yield syncLocalChecked({
            last_op_id: '5',
            write_checkpoint: '5',
            buckets: [{ bucket: 'bucket1', checksum: 11 }]
        });
        expect(yield db.getAll("SELECT description FROM assets WHERE id = 'O3'")).deep.equals([
            { description: 'server updated' }
        ]);
    }));
    it('should revert a failing insert', () => __awaiter(void 0, void 0, void 0, function* () {
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)]));
        yield syncLocalChecked({
            last_op_id: '3',
            write_checkpoint: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        // Local insert, later rejected by server
        yield db.execute('INSERT INTO assets(id, description) VALUES(?, ?)', ['O3', 'inserted']);
        const batch = yield bucketStorage.getCrudBatch();
        yield batch.complete();
        yield bucketStorage.updateLocalTarget(() => __awaiter(void 0, void 0, void 0, function* () {
            return '4';
        }));
        expect(yield db.getAll("SELECT description FROM assets WHERE id = 'O3'")).deep.equals([
            { description: 'inserted' }
        ]);
        yield syncLocalChecked({
            last_op_id: '3',
            write_checkpoint: '4',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        expect(yield db.getAll("SELECT description FROM assets WHERE id = 'O3'")).empty;
    }));
    it('should revert a failing delete', () => __awaiter(void 0, void 0, void 0, function* () {
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)]));
        yield syncLocalChecked({
            last_op_id: '3',
            write_checkpoint: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        // Local delete, later rejected by server
        yield db.execute('DELETE FROM assets WHERE id = ?', ['O2']);
        expect(yield db.getAll("SELECT description FROM assets WHERE id = 'O2'")).empty;
        // Simulate a permissions error when uploading - data should be preserved.
        const batch = yield bucketStorage.getCrudBatch();
        yield batch.complete();
        yield bucketStorage.updateLocalTarget(() => __awaiter(void 0, void 0, void 0, function* () {
            return '4';
        }));
        yield syncLocalChecked({
            last_op_id: '3',
            write_checkpoint: '4',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        expect(yield db.getAll("SELECT description FROM assets WHERE id = 'O2'")).deep.equals([{ description: 'bar' }]);
    }));
    it('should revert a failing update', () => __awaiter(void 0, void 0, void 0, function* () {
        yield bucketStorage.saveSyncData(new SyncDataBatch([new SyncDataBucket('bucket1', [putAsset1_1, putAsset2_2, putAsset1_3], false)]));
        yield syncLocalChecked({
            last_op_id: '3',
            write_checkpoint: '3',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        // Local update, later rejected by server
        yield db.execute('UPDATE assets SET description = ? WHERE id = ?', ['updated', 'O2']);
        expect(yield db.getAll(`SELECT description FROM assets WHERE id = 'O2'`)).deep.equals([{ description: 'updated' }]);
        // Simulate a permissions error when uploading - data should be preserved.
        const batch = yield bucketStorage.getCrudBatch();
        yield batch.complete();
        yield bucketStorage.updateLocalTarget(() => __awaiter(void 0, void 0, void 0, function* () {
            return '4';
        }));
        yield syncLocalChecked({
            last_op_id: '3',
            write_checkpoint: '4',
            buckets: [{ bucket: 'bucket1', checksum: 6 }]
        });
        expect(yield db.getAll("SELECT description FROM assets WHERE id = 'O2'")).deep.equals([{ description: 'bar' }]);
    }));
});
//# sourceMappingURL=bucket_storage.test.js.map