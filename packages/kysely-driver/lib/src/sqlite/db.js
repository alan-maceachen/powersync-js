import { PowerSyncDialect } from './sqlite-dialect';
import { Kysely } from 'kysely';
export const wrapPowerSyncWithKysely = (db, options) => {
    return new Kysely(Object.assign({ dialect: new PowerSyncDialect({
            db
        }) }, options));
};
//# sourceMappingURL=db.js.map