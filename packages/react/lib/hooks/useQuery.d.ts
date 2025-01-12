import { type SQLWatchOptions, type CompilableQuery } from '@powersync/common';
export interface AdditionalOptions extends Omit<SQLWatchOptions, 'signal'> {
    runQueryOnce?: boolean;
}
export type QueryResult<T> = {
    data: T[];
    /**
     * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
     */
    isLoading: boolean;
    /**
     * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
     */
    isFetching: boolean;
    error: Error | undefined;
    /**
     * Function used to run the query again.
     */
    refresh?: () => Promise<void>;
};
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
export declare const useQuery: <T = any>(query: string | CompilableQuery<T>, parameters?: any[], options?: AdditionalOptions) => QueryResult<T>;
