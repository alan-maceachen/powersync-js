import { AbstractPowerSyncDatabase, Transaction } from '@powersync/common';
import { AttachmentRecord } from './Schema';
import { StorageAdapter } from './StorageAdapter';
export interface AttachmentQueueOptions {
    powersync: AbstractPowerSyncDatabase;
    storage: StorageAdapter;
    /**
     * How often to check for new attachments to sync, in milliseconds. Set to 0 or undefined to disable.
     */
    syncInterval?: number;
    /**
     * How many attachments to keep in the cache
     */
    cacheLimit?: number;
    /**
     * The name of the directory where attachments are stored on the device, not the full path
     */
    attachmentDirectoryName?: string;
    /**
     * Whether to mark the initial watched attachment IDs to be synced
     */
    performInitialSync?: boolean;
    /**
     * How to handle download errors, return { retry: false } to ignore the download
     */
    onDownloadError?: (attachment: AttachmentRecord, exception: any) => Promise<{
        retry?: boolean;
    }>;
    /**
     * How to handle upload errors, return { retry: false } to ignore the upload
     */
    onUploadError?: (attachment: AttachmentRecord, exception: any) => Promise<{
        retry?: boolean;
    }>;
}
export declare const DEFAULT_ATTACHMENT_QUEUE_OPTIONS: Partial<AttachmentQueueOptions>;
export declare abstract class AbstractAttachmentQueue<T extends AttachmentQueueOptions = AttachmentQueueOptions> {
    uploading: boolean;
    downloading: boolean;
    initialSync: boolean;
    options: T;
    downloadQueue: Set<string>;
    constructor(options: T);
    /**
     * Takes in a callback that gets invoked with attachment IDs that need to be synced.
     * In most cases this will contain a watch query.
     *
     * @example
     * ```javascript
     * onAttachmentIdsChange(onUpdate) {
     *    this.powersync.watch('SELECT photo_id as id FROM todos WHERE photo_id IS NOT NULL', [], {
     *        onResult: (result) => onUpdate(result.rows?._array.map((r) => r.id) ?? [])
     *    });
     * }
     * ```
     */
    abstract onAttachmentIdsChange(onUpdate: (ids: string[]) => void): void;
    /**
     * Create a new AttachmentRecord, this gets called when the attachment id is not found in the database.
     */
    abstract newAttachmentRecord(record?: Partial<AttachmentRecord>): Promise<AttachmentRecord>;
    protected get powersync(): AbstractPowerSyncDatabase;
    protected get storage(): StorageAdapter;
    get table(): string;
    init(): Promise<void>;
    trigger(): void;
    watchAttachmentIds(): Promise<void>;
    saveToQueue(record: Omit<AttachmentRecord, 'timestamp'>): Promise<AttachmentRecord>;
    record(id: string): Promise<AttachmentRecord | null>;
    update(record: Omit<AttachmentRecord, 'timestamp'>): Promise<void>;
    delete(record: AttachmentRecord, tx?: Transaction): Promise<void>;
    getNextUploadRecord(): Promise<AttachmentRecord | null>;
    uploadAttachment(record: AttachmentRecord): Promise<boolean>;
    downloadRecord(record: AttachmentRecord): Promise<boolean>;
    idsToUpload(onResult: (ids: string[]) => void): void;
    watchUploads(): void;
    /**
     * Returns immediately if another loop is in progress.
     */
    private uploadRecords;
    getIdsToDownload(): Promise<string[]>;
    idsToDownload(onResult: (ids: string[]) => void): void;
    watchDownloads(): void;
    private downloadRecords;
    /**
     * Returns the local file path for the given filename, used to store in the database.
     * Example: filename: "attachment-1.jpg" returns "attachments/attachment-1.jpg"
     */
    getLocalFilePathSuffix(filename: string): string;
    /**
     * Return users storage directory with the attachmentPath use to load the file.
     * Example: filePath: "attachments/attachment-1.jpg" returns "/var/mobile/Containers/Data/Application/.../Library/attachments/attachment-1.jpg"
     */
    getLocalUri(filePath: string): string;
    /**
     * Returns the directory where attachments are stored on the device, used to make dir
     * Example: "/var/mobile/Containers/Data/Application/.../Library/attachments/"
     */
    get storageDirectory(): string;
    expireCache(): Promise<void>;
    clearQueue(): Promise<void>;
}
