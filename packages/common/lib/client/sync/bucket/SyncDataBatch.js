import { SyncDataBucket } from './SyncDataBucket';
// TODO JSON
export class SyncDataBatch {
    buckets;
    static fromJSON(json) {
        return new SyncDataBatch(json.buckets.map((bucket) => SyncDataBucket.fromRow(bucket)));
    }
    constructor(buckets) {
        this.buckets = buckets;
    }
}
//# sourceMappingURL=SyncDataBatch.js.map