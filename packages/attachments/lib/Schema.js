import { Column, ColumnType, Table } from '@powersync/common';
export const ATTACHMENT_TABLE = 'attachments';
export var AttachmentState;
(function (AttachmentState) {
    AttachmentState[AttachmentState["QUEUED_SYNC"] = 0] = "QUEUED_SYNC";
    AttachmentState[AttachmentState["QUEUED_UPLOAD"] = 1] = "QUEUED_UPLOAD";
    AttachmentState[AttachmentState["QUEUED_DOWNLOAD"] = 2] = "QUEUED_DOWNLOAD";
    AttachmentState[AttachmentState["SYNCED"] = 3] = "SYNCED";
    AttachmentState[AttachmentState["ARCHIVED"] = 4] = "ARCHIVED"; // Attachment has been orphaned, i.e. the associated record has been deleted
})(AttachmentState || (AttachmentState = {}));
export class AttachmentTable extends Table {
    constructor(options) {
        super({
            ...options,
            name: options?.name ?? ATTACHMENT_TABLE,
            localOnly: true,
            insertOnly: false,
            columns: [
                new Column({ name: 'filename', type: ColumnType.TEXT }),
                new Column({ name: 'local_uri', type: ColumnType.TEXT }),
                new Column({ name: 'timestamp', type: ColumnType.INTEGER }),
                new Column({ name: 'size', type: ColumnType.INTEGER }),
                new Column({ name: 'media_type', type: ColumnType.TEXT }),
                new Column({ name: 'state', type: ColumnType.INTEGER }), // Corresponds to AttachmentState
                ...(options?.additionalColumns ?? [])
            ]
        });
    }
}
//# sourceMappingURL=Schema.js.map