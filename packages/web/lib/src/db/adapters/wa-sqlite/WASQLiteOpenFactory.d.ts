import { DBAdapter } from '@powersync/common';
import { AbstractWebSQLOpenFactory } from '../AbstractWebSQLOpenFactory';
/**
 * Opens a SQLite connection using WA-SQLite.
 */
export declare class WASQLiteOpenFactory extends AbstractWebSQLOpenFactory {
    protected openAdapter(): DBAdapter;
}
