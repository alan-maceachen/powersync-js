import { parseQuery } from '@powersync/common';
import React from 'react';
import { usePowerSync } from './PowerSyncContext';
/**
 * A hook to access the results of a watched query.
 * @example
 * export const Component = () => {
 * const { data: lists }  = useQuery('SELECT * from lists');
 *
 * return <View>
 *   {lists.map((l) => (
 *     <Text key={l.id}>{JSON.stringify(l)}</Text>
 *   ))}
 * </View>
 * }
 */
export const useQuery = (query, parameters = [], options = { runQueryOnce: false }) => {
    const powerSync = usePowerSync();
    if (!powerSync) {
        return { isLoading: false, isFetching: false, data: [], error: new Error('PowerSync not configured.') };
    }
    let parsedQuery;
    try {
        parsedQuery = parseQuery(query, parameters);
    }
    catch (error) {
        console.error('Failed to parse query:', error);
        return { isLoading: false, isFetching: false, data: [], error };
    }
    const { sqlStatement, parameters: queryParameters } = parsedQuery;
    const [data, setData] = React.useState([]);
    const [error, setError] = React.useState(undefined);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFetching, setIsFetching] = React.useState(true);
    const [tables, setTables] = React.useState([]);
    const memoizedParams = React.useMemo(() => queryParameters, [...queryParameters]);
    const memoizedOptions = React.useMemo(() => options, [JSON.stringify(options)]);
    const abortController = React.useRef(new AbortController());
    const handleResult = (result) => {
        setData(result);
        setIsLoading(false);
        setIsFetching(false);
        setError(undefined);
    };
    const handleError = (e) => {
        setIsLoading(false);
        setData([]);
        setIsFetching(false);
        const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
        wrappedError.cause = e;
        setError(wrappedError);
    };
    const fetchData = async () => {
        setIsFetching(true);
        try {
            const result = await powerSync.getAll(sqlStatement, queryParameters);
            handleResult(result);
        }
        catch (e) {
            console.error('Failed to fetch data:', e);
            handleError(e);
        }
    };
    const fetchTables = async () => {
        try {
            const tables = await powerSync.resolveTables(sqlStatement, memoizedParams, memoizedOptions);
            setTables(tables);
        }
        catch (e) {
            console.error('Failed to fetch tables:', e);
            handleError(e);
        }
    };
    React.useEffect(() => {
        (async () => {
            await fetchTables();
            await fetchData();
        })();
    }, [powerSync, memoizedParams, sqlStatement]);
    React.useEffect(() => {
        // Abort any previous watches
        abortController.current?.abort();
        abortController.current = new AbortController();
        if (!options.runQueryOnce) {
            powerSync.onChangeWithCallback({
                onChange: async () => {
                    await fetchData();
                },
                onError(e) {
                    handleError(e);
                }
            }, {
                ...options,
                signal: abortController.current.signal,
                tables
            });
        }
        return () => {
            abortController.current?.abort();
        };
    }, [powerSync, sqlStatement, memoizedParams, memoizedOptions, tables]);
    return { isLoading, isFetching, data, error, refresh: fetchData };
};
//# sourceMappingURL=useQuery.js.map