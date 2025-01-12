var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { v4 as uuid } from 'uuid';
import { PowerSyncDatabase } from '@powersync/web';
import { testSchema } from './utils/testDb';
vi.useRealTimers();
/**
 * There seems to be an issue with Vitest browser mode's setTimeout and
 * fake timer functionality.
 * e.g. calling:
 *      await new Promise<void>((resolve) => setTimeout(resolve, 10));
 * waits for 1 second instead of 10ms.
 * Setting this to 1 second as a work around.
 */
const throttleDuration = 1000;
describe('Watch Tests', () => {
    let powersync;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        powersync = new PowerSyncDatabase({
            database: { dbFilename: 'test-watch.db' },
            schema: testSchema,
            flags: {
                enableMultiTabs: false
            }
        });
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield powersync.disconnectAndClear();
        yield powersync.close();
    }));
    it('watch outside throttle limits', () => __awaiter(void 0, void 0, void 0, function* () {
        const abortController = new AbortController();
        const watch = powersync.watch('SELECT count() AS count FROM assets INNER JOIN customers ON customers.id = assets.customer_id', [], { signal: abortController.signal, throttleMs: throttleDuration });
        const updatesCount = 2;
        let receivedUpdatesCount = 0;
        /**
         * Promise which resolves once we received the same amount of update
         * notifications as there are inserts.
         */
        const receivedUpdates = new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            try {
                for (var _d = true, watch_1 = __asyncValues(watch), watch_1_1; watch_1_1 = yield watch_1.next(), _a = watch_1_1.done, !_a; _d = true) {
                    _c = watch_1_1.value;
                    _d = false;
                    const update = _c;
                    receivedUpdatesCount++;
                    if (receivedUpdatesCount == updatesCount) {
                        abortController.abort();
                        resolve();
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = watch_1.return)) yield _b.call(watch_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }));
        for (let updateCount = 0; updateCount < updatesCount; updateCount++) {
            yield powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
            // Wait the throttle duration, ensuring a watch update for each insert
            yield new Promise((resolve) => setTimeout(resolve, throttleDuration));
        }
        yield receivedUpdates;
        expect(receivedUpdatesCount).equals(updatesCount);
    }));
    it('watch outside throttle limits (callback)', () => __awaiter(void 0, void 0, void 0, function* () {
        const abortController = new AbortController();
        const updatesCount = 2;
        let receivedUpdatesCount = 0;
        /**
         * Promise which resolves once we received the same amount of update
         * notifications as there are inserts.
         */
        const receivedUpdates = new Promise((resolve) => {
            const onUpdate = () => {
                receivedUpdatesCount++;
                if (receivedUpdatesCount == updatesCount) {
                    abortController.abort();
                    resolve();
                }
            };
            powersync.watch('SELECT count() AS count FROM assets INNER JOIN customers ON customers.id = assets.customer_id', [], { onResult: onUpdate }, { signal: abortController.signal, throttleMs: throttleDuration });
        });
        for (let updateCount = 0; updateCount < updatesCount; updateCount++) {
            yield powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
            // Wait the throttle duration, ensuring a watch update for each insert
            yield new Promise((resolve) => setTimeout(resolve, throttleDuration));
        }
        yield receivedUpdates;
        expect(receivedUpdatesCount).equals(updatesCount);
    }));
    it('watch inside throttle limits', () => __awaiter(void 0, void 0, void 0, function* () {
        const abortController = new AbortController();
        const watch = powersync.watch('SELECT count() AS count FROM assets INNER JOIN customers ON customers.id = assets.customer_id', [], { signal: abortController.signal, throttleMs: throttleDuration });
        const updatesCount = 5;
        let receivedUpdatesCount = 0;
        // Listen to updates
        (() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, e_2, _b, _c;
            try {
                for (var _d = true, watch_2 = __asyncValues(watch), watch_2_1; watch_2_1 = yield watch_2.next(), _a = watch_2_1.done, !_a; _d = true) {
                    _c = watch_2_1.value;
                    _d = false;
                    const update = _c;
                    receivedUpdatesCount++;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = watch_2.return)) yield _b.call(watch_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }))();
        // Create the inserts as fast as possible
        for (let updateCount = 0; updateCount < updatesCount; updateCount++) {
            yield powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
        }
        yield new Promise((resolve) => setTimeout(resolve, throttleDuration * 2));
        abortController.abort();
        // There should be one initial result plus one throttled result
        expect(receivedUpdatesCount).equals(2);
    }));
    it('watch inside throttle limits (callback)', () => __awaiter(void 0, void 0, void 0, function* () {
        const abortController = new AbortController();
        const updatesCount = 5;
        let receivedUpdatesCount = 0;
        const onUpdate = () => {
            receivedUpdatesCount++;
        };
        powersync.watch('SELECT count() AS count FROM assets INNER JOIN customers ON customers.id = assets.customer_id', [], { onResult: onUpdate }, { signal: abortController.signal, throttleMs: throttleDuration });
        // Create the inserts as fast as possible
        for (let updateCount = 0; updateCount < updatesCount; updateCount++) {
            yield powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
        }
        yield new Promise((resolve) => setTimeout(resolve, throttleDuration * 2));
        abortController.abort();
        // There should be one initial result plus one throttled result
        expect(receivedUpdatesCount).equals(2);
    }));
    it('should only watch tables inside query', () => __awaiter(void 0, void 0, void 0, function* () {
        const assetsAbortController = new AbortController();
        const watchAssets = powersync.watch('SELECT count() AS count FROM assets', [], {
            signal: assetsAbortController.signal
        });
        const customersAbortController = new AbortController();
        const watchCustomers = powersync.watch('SELECT count() AS count FROM customers', [], {
            signal: customersAbortController.signal
        });
        let receivedAssetsUpdatesCount = 0;
        // Listen to assets updates
        (() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, e_3, _b, _c;
            try {
                for (var _d = true, watchAssets_1 = __asyncValues(watchAssets), watchAssets_1_1; watchAssets_1_1 = yield watchAssets_1.next(), _a = watchAssets_1_1.done, !_a; _d = true) {
                    _c = watchAssets_1_1.value;
                    _d = false;
                    const update = _c;
                    receivedAssetsUpdatesCount++;
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = watchAssets_1.return)) yield _b.call(watchAssets_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }))();
        let receivedCustomersUpdatesCount = 0;
        (() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, e_4, _b, _c;
            try {
                for (var _d = true, watchCustomers_1 = __asyncValues(watchCustomers), watchCustomers_1_1; watchCustomers_1_1 = yield watchCustomers_1.next(), _a = watchCustomers_1_1.done, !_a; _d = true) {
                    _c = watchCustomers_1_1.value;
                    _d = false;
                    const update = _c;
                    receivedCustomersUpdatesCount++;
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = watchCustomers_1.return)) yield _b.call(watchCustomers_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }))();
        // Ensures insert doesn't form part of initial result
        yield new Promise((resolve) => setTimeout(resolve, throttleDuration));
        // Create the inserts as fast as possible
        yield powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
        yield new Promise((resolve) => setTimeout(resolve, throttleDuration * 2));
        assetsAbortController.abort();
        customersAbortController.abort();
        // There should be one initial result plus one throttled result
        expect(receivedAssetsUpdatesCount).equals(2);
        // Only the initial result should have yielded.
        expect(receivedCustomersUpdatesCount).equals(1);
    }));
    it('should only watch tables inside query (callback)', () => __awaiter(void 0, void 0, void 0, function* () {
        const assetsAbortController = new AbortController();
        let receivedAssetsUpdatesCount = 0;
        const onWatchAssets = () => {
            receivedAssetsUpdatesCount++;
        };
        powersync.watch('SELECT count() AS count FROM assets', [], { onResult: onWatchAssets }, {
            signal: assetsAbortController.signal
        });
        const customersAbortController = new AbortController();
        let receivedCustomersUpdatesCount = 0;
        const onWatchCustomers = () => {
            receivedCustomersUpdatesCount++;
        };
        powersync.watch('SELECT count() AS count FROM customers', [], { onResult: onWatchCustomers }, {
            signal: customersAbortController.signal
        });
        // Ensures insert doesn't form part of initial result
        yield new Promise((resolve) => setTimeout(resolve, throttleDuration));
        yield powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
        yield new Promise((resolve) => setTimeout(resolve, throttleDuration * 2));
        assetsAbortController.abort();
        customersAbortController.abort();
        // There should be one initial result plus one throttled result
        expect(receivedAssetsUpdatesCount).equals(2);
        // Only the initial result should have yielded.
        expect(receivedCustomersUpdatesCount).equals(1);
    }));
    it('should handle watch onError callback', () => __awaiter(void 0, void 0, void 0, function* () {
        const abortController = new AbortController();
        const onResult = () => { }; // no-op
        let receivedErrorCount = 0;
        const receivedError = new Promise((resolve) => {
            const onError = () => {
                receivedErrorCount++;
                resolve();
            };
            powersync.watch('INVALID SQL QUERY', // Simulate an error with bad SQL
            [], { onResult, onError }, { signal: abortController.signal, throttleMs: throttleDuration });
        });
        abortController.abort();
        yield receivedError;
        expect(receivedErrorCount).equals(1);
    }));
    it('should throttle watch callback overflow', () => __awaiter(void 0, void 0, void 0, function* () {
        const abortController = new AbortController();
        const updatesCount = 25;
        let receivedWithManagedOverflowCount = 0;
        const onResultOverflow = () => {
            receivedWithManagedOverflowCount++;
        };
        const overflowAbortController = new AbortController();
        powersync.watch('SELECT count() AS count FROM assets', [], { onResult: onResultOverflow }, { signal: overflowAbortController.signal, throttleMs: 1 });
        // Allows us to count the number of updates received without the initial trigger
        yield new Promise((resolve) => setTimeout(resolve, 1 * throttleDuration));
        // Perform a large number of inserts to trigger overflow
        for (let i = 0; i < updatesCount; i++) {
            powersync.execute('INSERT INTO assets(id, make, customer_id) VALUES (uuid(), ?, ?)', ['test', uuid()]);
        }
        yield new Promise((resolve) => setTimeout(resolve, 1 * throttleDuration));
        abortController.abort();
        overflowAbortController.abort();
        // Initial onResult plus two left after overflow was throttled for onChange triggers
        expect(receivedWithManagedOverflowCount).toBe(3);
    }));
});
//# sourceMappingURL=watch.test.js.map