import { WASQLiteDBAdapter } from './WASQLiteDBAdapter';
import { AbstractWebSQLOpenFactory } from '../AbstractWebSQLOpenFactory';
/**
 * Opens a SQLite connection using WA-SQLite.
 */
export class WASQLiteOpenFactory extends AbstractWebSQLOpenFactory {
    openAdapter() {
        return new WASQLiteDBAdapter(Object.assign(Object.assign({}, this.options), { flags: this.resolvedFlags }));
    }
}
//# sourceMappingURL=WASQLiteOpenFactory.js.map