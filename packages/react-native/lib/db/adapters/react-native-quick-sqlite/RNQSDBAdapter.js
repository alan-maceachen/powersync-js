import { BaseObserver } from '@powersync/common';
/**
 * Adapter for React Native Quick SQLite
 */
export class RNQSDBAdapter extends BaseObserver {
    baseDB;
    name;
    getAll;
    getOptional;
    get;
    constructor(baseDB, name) {
        super();
        this.baseDB = baseDB;
        this.name = name;
        // link table update commands
        baseDB.registerTablesChangedHook((update) => {
            this.iterateListeners((cb) => cb.tablesUpdated?.(update));
        });
        const topLevelUtils = this.generateDBHelpers({
            // Arrow function binds `this` for use in readOnlyExecute
            execute: (sql, params) => this.readOnlyExecute(sql, params)
        });
        // Only assigning get helpers
        this.getAll = topLevelUtils.getAll;
        this.getOptional = topLevelUtils.getOptional;
        this.get = topLevelUtils.get;
    }
    close() {
        return this.baseDB.close();
    }
    readLock(fn, options) {
        return this.baseDB.readLock((dbTx) => fn(this.generateDBHelpers(dbTx)), options);
    }
    readTransaction(fn, options) {
        return this.baseDB.readTransaction((dbTx) => fn(this.generateDBHelpers(dbTx)), options);
    }
    writeLock(fn, options) {
        return this.baseDB.writeLock((dbTx) => fn(this.generateDBHelpers(dbTx)), options);
    }
    writeTransaction(fn, options) {
        return this.baseDB.writeTransaction((dbTx) => fn(this.generateDBHelpers(dbTx)), options);
    }
    execute(query, params) {
        return this.baseDB.execute(query, params);
    }
    async executeBatch(query, params = []) {
        const commands = [];
        for (let i = 0; i < params.length; i++) {
            commands.push([query, params[i]]);
        }
        const result = await this.baseDB.executeBatch(commands);
        return {
            rowsAffected: result.rowsAffected ? result.rowsAffected : 0
        };
    }
    /**
     * This provides a top-level read only execute method which is executed inside a read-lock.
     * This is necessary since the high level `execute` method uses a write-lock under
     * the hood. Helper methods such as `get`, `getAll` and `getOptional` are read only,
     * and should use this method.
     */
    readOnlyExecute(sql, params) {
        return this.baseDB.readLock((ctx) => ctx.execute(sql, params));
    }
    /**
     * Adds DB get utils to lock contexts and transaction contexts
     * @param tx
     * @returns
     */
    generateDBHelpers(tx) {
        return {
            ...tx,
            /**
             *  Execute a read-only query and return results
             */
            getAll: async (sql, parameters) => {
                const res = await tx.execute(sql, parameters);
                return res.rows?._array ?? [];
            },
            /**
             * Execute a read-only query and return the first result, or null if the ResultSet is empty.
             */
            getOptional: async (sql, parameters) => {
                const res = await tx.execute(sql, parameters);
                return res.rows?.item(0) ?? null;
            },
            /**
             * Execute a read-only query and return the first result, error if the ResultSet is empty.
             */
            get: async (sql, parameters) => {
                const res = await tx.execute(sql, parameters);
                const first = res.rows?.item(0);
                if (!first) {
                    throw new Error('Result set is empty');
                }
                return first;
            }
        };
    }
}
//# sourceMappingURL=RNQSDBAdapter.js.map