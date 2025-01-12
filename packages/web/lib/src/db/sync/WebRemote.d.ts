import { AbstractRemote, BSONImplementation } from '@powersync/common';
export declare class WebRemote extends AbstractRemote {
    private _bson;
    getBSON(): Promise<BSONImplementation>;
}
