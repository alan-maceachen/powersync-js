import { DBAdapter, SQLOpenOptions, SQLOpenFactory } from '@powersync/common';
/**
 * Opens a SQLite connection using React Native Quick SQLite
 */
export declare class ReactNativeQuickSqliteOpenFactory implements SQLOpenFactory {
    protected options: SQLOpenOptions;
    constructor(options: SQLOpenOptions);
    openDB(): DBAdapter;
}
