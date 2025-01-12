var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _PowerSyncDialect_config;
import { SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from 'kysely';
import { PowerSyncDriver } from './sqlite-driver';
export class PowerSyncDialect {
    constructor(config) {
        _PowerSyncDialect_config.set(this, void 0);
        __classPrivateFieldSet(this, _PowerSyncDialect_config, Object.freeze(Object.assign({}, config)), "f");
    }
    createDriver() {
        return new PowerSyncDriver(__classPrivateFieldGet(this, _PowerSyncDialect_config, "f"));
    }
    createQueryCompiler() {
        return new SqliteQueryCompiler();
    }
    createAdapter() {
        return new SqliteAdapter();
    }
    createIntrospector(db) {
        return new SqliteIntrospector(db);
    }
}
_PowerSyncDialect_config = new WeakMap();
//# sourceMappingURL=sqlite-dialect.js.map