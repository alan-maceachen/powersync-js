import { ATTACHMENT_TABLE, AttachmentState } from './Schema';
import { EncodingType } from './StorageAdapter';
export const DEFAULT_ATTACHMENT_QUEUE_OPTIONS = {
    attachmentDirectoryName: 'attachments',
    syncInterval: 30_000,
    cacheLimit: 100,
    performInitialSync: true
};
export class AbstractAttachmentQueue {
    uploading;
    downloading;
    initialSync;
    options;
    downloadQueue;
    constructor(options) {
        this.options = {
            ...DEFAULT_ATTACHMENT_QUEUE_OPTIONS,
            ...options
        };
        this.downloadQueue = new Set();
        this.uploading = false;
        this.downloading = false;
        this.initialSync = this.options.performInitialSync;
    }
    get powersync() {
        return this.options.powersync;
    }
    get storage() {
        return this.options.storage;
    }
    get table() {
        return ATTACHMENT_TABLE;
    }
    async init() {
        // Ensure the directory where attachments are downloaded, exists
        await this.storage.makeDir(this.storageDirectory);
        this.watchAttachmentIds();
        this.watchUploads();
        this.watchDownloads();
        if (this.options.syncInterval > 0) {
            // In addition to watching for changes, we also trigger a sync every few seconds (30 seconds, by default)
            // This will retry any failed uploads/downloads, in particular after the app was offline
            setInterval(() => this.trigger(), this.options.syncInterval);
        }
    }
    trigger() {
        this.uploadRecords();
        this.downloadRecords();
        this.expireCache();
    }
    async watchAttachmentIds() {
        this.onAttachmentIdsChange(async (ids) => {
            const _ids = `${ids.map((id) => `'${id}'`).join(',')}`;
            console.debug(`Queuing for sync, attachment IDs: [${_ids}]`);
            if (this.initialSync) {
                this.initialSync = false;
                // Mark AttachmentIds for sync
                await this.powersync.execute(`UPDATE
                ${this.table}
              SET state = ${AttachmentState.QUEUED_SYNC}
              WHERE
                state < ${AttachmentState.SYNCED}
              AND
               id IN (${_ids})`);
            }
            const attachmentsInDatabase = await this.powersync.getAll(`SELECT * FROM ${this.table} WHERE state < ${AttachmentState.ARCHIVED}`);
            for (const id of ids) {
                const record = attachmentsInDatabase.find((r) => r.id == id);
                // 1. ID is not in the database
                if (!record) {
                    const newRecord = await this.newAttachmentRecord({
                        id: id,
                        state: AttachmentState.QUEUED_SYNC
                    });
                    console.debug(`Attachment (${id}) not found in database, creating new record`);
                    await this.saveToQueue(newRecord);
                }
                else if (record.local_uri == null || !(await this.storage.fileExists(this.getLocalUri(record.local_uri)))) {
                    // 2. Attachment in database but no local file, mark as queued download
                    console.debug(`Attachment (${id}) found in database but no local file, marking as queued download`);
                    await this.update({
                        ...record,
                        state: AttachmentState.QUEUED_DOWNLOAD
                    });
                }
            }
            // 3. Attachment in database and not in AttachmentIds, mark as archived
            await this.powersync.execute(`UPDATE ${this.table}
          SET state = ${AttachmentState.ARCHIVED}
          WHERE
            state < ${AttachmentState.ARCHIVED}
          AND
            id NOT IN (${ids.map((id) => `'${id}'`).join(',')})`);
        });
    }
    async saveToQueue(record) {
        const updatedRecord = {
            ...record,
            timestamp: new Date().getTime()
        };
        await this.powersync.execute(`INSERT OR REPLACE INTO ${this.table} (id, timestamp, filename, local_uri, media_type, size, state) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            updatedRecord.id,
            updatedRecord.timestamp,
            updatedRecord.filename,
            updatedRecord.local_uri || null,
            updatedRecord.media_type || null,
            updatedRecord.size || null,
            updatedRecord.state
        ]);
        return updatedRecord;
    }
    async record(id) {
        return this.powersync.getOptional(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
    }
    async update(record) {
        const timestamp = new Date().getTime();
        await this.powersync.execute(`UPDATE ${this.table}
             SET
                timestamp = ?,
                filename = ?,
                local_uri = ?,
                size = ?,
                media_type = ?,
                state = ?
             WHERE id = ?`, [timestamp, record.filename, record.local_uri || null, record.size, record.media_type, record.state, record.id]);
    }
    async delete(record, tx) {
        const deleteRecord = async (tx) => {
            await tx.execute(`DELETE
             FROM ${this.table}
             WHERE id = ?`, [record.id]);
        };
        if (tx) {
            await deleteRecord(tx);
        }
        else {
            await this.powersync.writeTransaction(deleteRecord);
        }
        const localFilePathUri = this.getLocalUri(record.local_uri || this.getLocalFilePathSuffix(record.filename));
        try {
            // Delete file on storage
            await this.storage.deleteFile(localFilePathUri, {
                filename: record.filename
            });
        }
        catch (e) {
            console.error(e);
        }
    }
    async getNextUploadRecord() {
        return this.powersync.getOptional(`SELECT *
                FROM ${this.table}
                WHERE
                  local_uri IS NOT NULL
                AND
                  (state = ${AttachmentState.QUEUED_UPLOAD}
                OR
                  state = ${AttachmentState.QUEUED_SYNC})
                ORDER BY timestamp ASC`);
    }
    async uploadAttachment(record) {
        if (!record.local_uri) {
            throw new Error(`No local_uri for record ${JSON.stringify(record, null, 2)}`);
        }
        const localFilePathUri = this.getLocalUri(record.local_uri);
        try {
            if (!(await this.storage.fileExists(localFilePathUri))) {
                console.warn(`File for ${record.id} does not exist, skipping upload`);
                await this.update({
                    ...record,
                    state: AttachmentState.QUEUED_DOWNLOAD
                });
                return true;
            }
            const fileBuffer = await this.storage.readFile(localFilePathUri, {
                encoding: EncodingType.Base64,
                mediaType: record.media_type
            });
            await this.storage.uploadFile(record.filename, fileBuffer, {
                mediaType: record.media_type
            });
            // Mark as uploaded
            await this.update({ ...record, state: AttachmentState.SYNCED });
            console.debug(`Uploaded attachment "${record.id}" to Cloud Storage`);
            return true;
        }
        catch (e) {
            if (e.error == 'Duplicate') {
                console.debug(`File already uploaded, marking ${record.id} as synced`);
                await this.update({ ...record, state: AttachmentState.SYNCED });
                return false;
            }
            if (this.options.onUploadError) {
                const { retry } = await this.options.onUploadError(record, e);
                if (!retry) {
                    await this.update({ ...record, state: AttachmentState.ARCHIVED });
                    return true;
                }
            }
            console.error(`UploadAttachment error for record ${JSON.stringify(record, null, 2)}`);
            return false;
        }
    }
    async downloadRecord(record) {
        if (!record.local_uri) {
            record.local_uri = this.getLocalFilePathSuffix(record.filename);
        }
        const localFilePathUri = this.getLocalUri(record.local_uri);
        if (await this.storage.fileExists(localFilePathUri)) {
            console.debug(`Local file already downloaded, marking "${record.id}" as synced`);
            await this.update({ ...record, state: AttachmentState.SYNCED });
            return true;
        }
        try {
            const fileBlob = await this.storage.downloadFile(record.filename);
            // Convert the blob data into a base64 string
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    // remove the header from the result: 'data:*/*;base64,'
                    resolve(reader.result?.toString().replace(/^data:.+;base64,/, '') || '');
                };
                reader.onerror = reject;
                reader.readAsDataURL(fileBlob);
            });
            // Ensure directory exists
            await this.storage.makeDir(localFilePathUri.replace(record.filename, ''));
            // Write the file
            await this.storage.writeFile(localFilePathUri, base64Data, {
                encoding: EncodingType.Base64
            });
            await this.update({
                ...record,
                media_type: fileBlob.type,
                state: AttachmentState.SYNCED
            });
            console.debug(`Downloaded attachment "${record.id}"`);
            return true;
        }
        catch (e) {
            if (this.options.onDownloadError) {
                const { retry } = await this.options.onDownloadError(record, e);
                if (!retry) {
                    await this.update({ ...record, state: AttachmentState.ARCHIVED });
                    return true;
                }
            }
            console.error(`Download attachment error for record ${JSON.stringify(record, null, 2)}`, e);
        }
        return false;
    }
    idsToUpload(onResult) {
        this.powersync.watch(`SELECT id
              FROM ${this.table}
              WHERE
                local_uri IS NOT NULL
              AND
                (state = ${AttachmentState.QUEUED_UPLOAD}
              OR
                state = ${AttachmentState.QUEUED_SYNC})`, [], { onResult: (result) => onResult(result.rows?._array.map((r) => r.id) || []) });
    }
    watchUploads() {
        this.idsToUpload(async (ids) => {
            if (ids.length > 0) {
                await this.uploadRecords();
            }
        });
    }
    /**
     * Returns immediately if another loop is in progress.
     */
    async uploadRecords() {
        if (this.uploading) {
            return;
        }
        this.uploading = true;
        try {
            let record = await this.getNextUploadRecord();
            if (!record) {
                return;
            }
            console.debug(`Uploading attachments...`);
            while (record) {
                const uploaded = await this.uploadAttachment(record);
                if (!uploaded) {
                    // Then attachment failed to upload. We try all uploads when the next trigger() is called
                    break;
                }
                record = await this.getNextUploadRecord();
            }
            console.debug('Finished uploading attachments');
        }
        catch (error) {
            console.error('Upload failed:', error);
        }
        finally {
            this.uploading = false;
        }
    }
    async getIdsToDownload() {
        const res = await this.powersync.getAll(`SELECT id
              FROM ${this.table}
              WHERE
                state = ${AttachmentState.QUEUED_DOWNLOAD}
              OR
                state = ${AttachmentState.QUEUED_SYNC}
              ORDER BY timestamp ASC`);
        return res.map((r) => r.id);
    }
    idsToDownload(onResult) {
        this.powersync.watch(`SELECT id
              FROM ${this.table}
              WHERE
                state = ${AttachmentState.QUEUED_DOWNLOAD}
              OR
                state = ${AttachmentState.QUEUED_SYNC}`, [], { onResult: (result) => onResult(result.rows?._array.map((r) => r.id) || []) });
    }
    watchDownloads() {
        this.idsToDownload(async (ids) => {
            ids.map((id) => this.downloadQueue.add(id));
            // No need to await this, the lock will ensure only one loop is running at a time
            this.downloadRecords();
        });
    }
    async downloadRecords() {
        if (this.downloading) {
            return;
        }
        (await this.getIdsToDownload()).map((id) => this.downloadQueue.add(id));
        if (this.downloadQueue.size == 0) {
            return;
        }
        this.downloading = true;
        try {
            console.debug(`Downloading ${this.downloadQueue.size} attachments...`);
            while (this.downloadQueue.size > 0) {
                const id = this.downloadQueue.values().next().value;
                this.downloadQueue.delete(id);
                const record = await this.record(id);
                if (!record) {
                    continue;
                }
                await this.downloadRecord(record);
            }
            console.debug('Finished downloading attachments');
        }
        catch (e) {
            console.error('Downloads failed:', e);
        }
        finally {
            this.downloading = false;
        }
    }
    /**
     * Returns the local file path for the given filename, used to store in the database.
     * Example: filename: "attachment-1.jpg" returns "attachments/attachment-1.jpg"
     */
    getLocalFilePathSuffix(filename) {
        return `${this.options.attachmentDirectoryName}/${filename}`;
    }
    /**
     * Return users storage directory with the attachmentPath use to load the file.
     * Example: filePath: "attachments/attachment-1.jpg" returns "/var/mobile/Containers/Data/Application/.../Library/attachments/attachment-1.jpg"
     */
    getLocalUri(filePath) {
        return `${this.storage.getUserStorageDirectory()}/${filePath}`;
    }
    /**
     * Returns the directory where attachments are stored on the device, used to make dir
     * Example: "/var/mobile/Containers/Data/Application/.../Library/attachments/"
     */
    get storageDirectory() {
        return `${this.storage.getUserStorageDirectory()}${this.options.attachmentDirectoryName}`;
    }
    async expireCache() {
        const res = await this.powersync.getAll(`SELECT * FROM ${this.table}
          WHERE
           state = ${AttachmentState.SYNCED} OR state = ${AttachmentState.ARCHIVED}
         ORDER BY
           timestamp DESC
         LIMIT 100 OFFSET ${this.options.cacheLimit}`);
        if (res.length == 0) {
            return;
        }
        console.debug(`Deleting ${res.length} attachments from cache...`);
        await this.powersync.writeTransaction(async (tx) => {
            for (const record of res) {
                await this.delete(record, tx);
            }
        });
    }
    async clearQueue() {
        console.debug(`Clearing attachment queue...`);
        await this.powersync.writeTransaction(async (tx) => {
            await tx.execute(`DELETE FROM ${this.table}`);
        });
    }
}
//# sourceMappingURL=AbstractAttachmentQueue.js.map