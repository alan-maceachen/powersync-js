var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var _PowerSyncDriver_db;
import { PowerSyncConnection } from './sqlite-connection';
export class PowerSyncDriver {
    constructor(config) {
        _PowerSyncDriver_db.set(this, void 0);
        __classPrivateFieldSet(this, _PowerSyncDriver_db, config.db, "f");
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    acquireConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            return new PowerSyncConnection(__classPrivateFieldGet(this, _PowerSyncDriver_db, "f"));
        });
    }
    beginTransaction(connection) {
        return __awaiter(this, void 0, void 0, function* () {
            yield connection.beginTransaction();
        });
    }
    commitTransaction(connection) {
        return __awaiter(this, void 0, void 0, function* () {
            yield connection.commitTransaction();
        });
    }
    rollbackTransaction(connection) {
        return __awaiter(this, void 0, void 0, function* () {
            yield connection.rollbackTransaction();
        });
    }
    releaseConnection(connection) {
        return __awaiter(this, void 0, void 0, function* () {
            yield connection.releaseConnection();
        });
    }
    /**
      This will do nothing. Instead use PowerSync `disconnectAndClear` function.
     */
    destroy() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
}
_PowerSyncDriver_db = new WeakMap();
//# sourceMappingURL=sqlite-driver.js.map