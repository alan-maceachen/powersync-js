var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import '@journeyapps/wa-sqlite';
import * as Comlink from 'comlink';
import { _openDB } from '../../shared/open-db';
const _self = self;
const DBMap = new Map();
const OPEN_DB_LOCK = 'open-wasqlite-db';
let nextClientId = 1;
const openDB = (dbFileName) => __awaiter(void 0, void 0, void 0, function* () {
    // Prevent multiple simultaneous opens from causing race conditions
    return navigator.locks.request(OPEN_DB_LOCK, () => __awaiter(void 0, void 0, void 0, function* () {
        const clientId = nextClientId++;
        if (!DBMap.has(dbFileName)) {
            const clientIds = new Set();
            const connection = yield _openDB(dbFileName);
            DBMap.set(dbFileName, {
                clientIds,
                db: connection
            });
        }
        const dbEntry = DBMap.get(dbFileName);
        dbEntry.clientIds.add(clientId);
        const { db } = dbEntry;
        const wrappedConnection = Object.assign(Object.assign({}, db), { close: Comlink.proxy(() => {
                var _a;
                const { clientIds } = dbEntry;
                clientIds.delete(clientId);
                if (clientIds.size == 0) {
                    console.debug(`Closing connection to ${dbFileName}.`);
                    DBMap.delete(dbFileName);
                    return (_a = db.close) === null || _a === void 0 ? void 0 : _a.call(db);
                }
                console.debug(`Connection to ${dbFileName} not closed yet due to active clients.`);
            }) });
        return Comlink.proxy(wrappedConnection);
    }));
});
_self.onconnect = function (event) {
    const port = event.ports[0];
    console.debug('Exposing db on port', port);
    Comlink.expose(openDB, port);
};
addEventListener('unload', () => {
    Array.from(DBMap.values()).forEach((dbConnection) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const db = yield dbConnection.db;
        (_a = db.close) === null || _a === void 0 ? void 0 : _a.call(db);
    }));
});
//# sourceMappingURL=SharedWASQLiteDB.worker.js.map