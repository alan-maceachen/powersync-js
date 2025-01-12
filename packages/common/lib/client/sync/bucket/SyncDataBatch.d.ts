import { SyncDataBucket } from './SyncDataBucket';
export declare class SyncDataBatch {
    buckets: SyncDataBucket[];
    static fromJSON(json: any): SyncDataBatch;
    constructor(buckets: SyncDataBucket[]);
}
