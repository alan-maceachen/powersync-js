import { SSRDBAdapter } from './SSRDBAdapter';
import { isServerSide, resolveWebSQLFlags } from './web-sql-flags';
export class AbstractWebSQLOpenFactory {
    constructor(options) {
        this.options = options;
        this.resolvedFlags = resolveWebSQLFlags(options.flags);
    }
    /**
     * Opens a {@link DBAdapter} using resolved flags.
     * A SSR implementation is loaded if SSR mode is detected.
     */
    openDB() {
        const isSSR = isServerSide();
        if (isSSR && !this.resolvedFlags.disableSSRWarning) {
            console.warn(`
  Running PowerSync in SSR mode.
  Only empty query results will be returned.
  Disable this warning by setting 'disableSSRWarning: true' in options.`);
        }
        if (!this.resolvedFlags.enableMultiTabs) {
            console.warn('Multiple tab support is not enabled. Using this site across multiple tabs may not function correctly.');
        }
        if (isSSR) {
            return new SSRDBAdapter();
        }
        return this.openAdapter();
    }
}
//# sourceMappingURL=AbstractWebSQLOpenFactory.js.map