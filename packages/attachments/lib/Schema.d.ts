import { Column, Table, TableOptions } from '@powersync/common';
export declare const ATTACHMENT_TABLE = "attachments";
export interface AttachmentRecord {
    id: string;
    filename: string;
    local_uri?: string;
    size?: number;
    media_type?: string;
    timestamp?: number;
    state: AttachmentState;
}
export declare enum AttachmentState {
    QUEUED_SYNC = 0,// Check if the attachment needs to be uploaded or downloaded
    QUEUED_UPLOAD = 1,// Attachment to be uploaded
    QUEUED_DOWNLOAD = 2,// Attachment to be downloaded
    SYNCED = 3,// Attachment has been synced
    ARCHIVED = 4
}
export interface AttachmentTableOptions extends Omit<TableOptions, 'name' | 'columns'> {
    name?: string;
    additionalColumns?: Column[];
}
export declare class AttachmentTable extends Table {
    constructor(options?: AttachmentTableOptions);
}
