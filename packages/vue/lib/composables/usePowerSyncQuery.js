import { ref, toValue, watch } from 'vue';
import { usePowerSync } from './powerSync';
/**
 * @deprecated use {@link useQuery} instead.
 *
 * A composable to access a single static query.
 * SQL Statement and query Parameters are watched by default.
 * For a result that updates as the source data changes, use {@link usePowerSyncWatchedQuery} instead.
 */
export const usePowerSyncQuery = (sqlStatement, parameters = [], queryOptions = { watchParameters: true, immediate: true }) => {
    const data = ref([]);
    const loading = ref(false);
    const error = ref(undefined);
    const powerSync = usePowerSync();
    const fetchData = async () => {
        if (!powerSync) {
            error.value = new Error('PowerSync not configured.');
            return;
        }
        try {
            error.value = undefined;
            loading.value = true;
            data.value = await powerSync.value.getAll(toValue(sqlStatement), toValue(parameters));
        }
        catch (e) {
            data.value = [];
            const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
            wrappedError.cause = e;
            error.value = wrappedError;
        }
        finally {
            loading.value = false;
        }
    };
    if (queryOptions.watchParameters) {
        watch([powerSync, ref(sqlStatement), ref(parameters)], fetchData);
    }
    if (queryOptions.immediate) {
        fetchData();
    }
    return { data, loading, error, refresh: fetchData };
};
//# sourceMappingURL=usePowerSyncQuery.js.map