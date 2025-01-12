import { ref, toValue, watchEffect } from 'vue';
import { usePowerSync } from './powerSync';
/**
 * @deprecated use {@link useQuery} instead.
 *
 * A composable to access the results of a watched query.
 */
export const usePowerSyncWatchedQuery = (sqlStatement, sqlParameters = [], options = {}) => {
    const data = ref([]);
    const error = ref(undefined);
    const loading = ref(true);
    const fetching = ref(true);
    const finishLoading = () => {
        loading.value = false;
        fetching.value = false;
    };
    const powerSync = usePowerSync();
    let abortController = new AbortController();
    watchEffect(async (onCleanup) => {
        // Abort any previous watches when the effect triggers again, or when the component is unmounted
        onCleanup(() => abortController.abort());
        abortController = new AbortController();
        loading.value = true;
        fetching.value = true;
        if (!powerSync) {
            error.value = new Error('PowerSync not configured.');
            return;
        }
        const onResult = (result) => {
            finishLoading();
            data.value = result;
            error.value = undefined;
        };
        const onError = (e) => {
            finishLoading();
            data.value = [];
            const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
            wrappedError.cause = e; // Include the original error as the cause
            error.value = wrappedError;
        };
        const sql = toValue(sqlStatement);
        const parameters = toValue(sqlParameters);
        try {
            const resolvedTables = await powerSync.value.resolveTables(sql, parameters, options);
            // Fetch initial data
            const result = await powerSync.value.getAll(sql, parameters);
            onResult(result);
            powerSync.value.onChangeWithCallback({
                onChange: async () => {
                    fetching.value = true;
                    try {
                        const result = await powerSync.value.getAll(sql, parameters);
                        onResult(result);
                    }
                    catch (error) {
                        onError(error);
                    }
                },
                onError
            }, {
                ...options,
                signal: abortController.signal,
                tables: resolvedTables
            });
        }
        catch (error) {
            onError(error);
        }
    });
    return { data, loading, fetching, error };
};
//# sourceMappingURL=usePowerSyncWatchedQuery.js.map