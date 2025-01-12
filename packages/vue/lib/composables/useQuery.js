import { parseQuery } from '@powersync/common';
import { ref, toValue, watchEffect } from 'vue';
import { usePowerSync } from './powerSync';
/**
 * A composable to access the results of a watched query.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useQuery } from '@powersync/vue';
 *
 * const { data, isLoading, isFetching, error} = useQuery('SELECT * FROM lists');
 * </script>
 *
 * <template>
 *    <div v-if="isLoading">Loading...</div>
 *    <div v-else-if="isFetching">Updating results...</div>
 *
 *    <div v-if="error">{{ error }}</div>
 *    <ul v-else>
 *        <li v-for="l in data" :key="l.id">{{ l.name }}</li>
 *    </ul>
 * </template>
 * ```
 */
export const useQuery = (query, sqlParameters = [], options = {}) => {
    const data = ref([]);
    const error = ref(undefined);
    const isLoading = ref(true);
    const isFetching = ref(true);
    // Only defined when the query and parameters are successfully parsed and tables are resolved
    let fetchData;
    const powerSync = usePowerSync();
    const finishLoading = () => {
        isLoading.value = false;
        isFetching.value = false;
    };
    if (!powerSync) {
        finishLoading();
        error.value = new Error('PowerSync not configured.');
        return { data, isLoading, isFetching, error };
    }
    const handleResult = (result) => {
        finishLoading();
        data.value = result;
        error.value = undefined;
    };
    const handleError = (e) => {
        fetchData = undefined;
        finishLoading();
        data.value = [];
        const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
        wrappedError.cause = e;
        error.value = wrappedError;
    };
    const _fetchData = async (sql, parameters) => {
        isFetching.value = true;
        try {
            const result = await powerSync.value.getAll(sql, parameters);
            handleResult(result);
        }
        catch (e) {
            console.error('Failed to fetch data:', e);
            handleError(e);
        }
    };
    watchEffect(async (onCleanup) => {
        const abortController = new AbortController();
        // Abort any previous watches when the effect triggers again, or when the component is unmounted
        onCleanup(() => abortController.abort());
        let parsedQuery;
        try {
            parsedQuery = parseQuery(toValue(query), toValue(sqlParameters).map(toValue));
        }
        catch (e) {
            console.error('Failed to parse query:', e);
            handleError(e);
            return;
        }
        const { sqlStatement: sql, parameters } = parsedQuery;
        let resolvedTables = [];
        try {
            resolvedTables = await powerSync.value.resolveTables(sql, parameters, options);
        }
        catch (e) {
            console.error('Failed to fetch tables:', e);
            handleError(e);
            return;
        }
        // Fetch initial data
        fetchData = () => _fetchData(sql, parameters);
        await fetchData();
        if (options.runQueryOnce) {
            return;
        }
        powerSync.value.onChangeWithCallback({
            onChange: async () => {
                await fetchData();
            },
            onError: handleError
        }, {
            ...options,
            signal: abortController.signal,
            tables: resolvedTables
        });
    });
    return {
        data,
        isLoading,
        isFetching,
        error,
        refresh: () => fetchData?.()
    };
};
//# sourceMappingURL=useQuery.js.map