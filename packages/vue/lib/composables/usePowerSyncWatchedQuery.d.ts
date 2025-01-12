import { SQLWatchOptions } from '@powersync/common';
import { MaybeRef, Ref } from 'vue';
export type WatchedQueryResult<T> = {
    data: Ref<T[]>;
    /**
     * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
     */
    loading: Ref<boolean>;
    /**
     * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
     */
    fetching: Ref<boolean>;
    error: Ref<Error>;
};
/**
 * @deprecated use {@link useQuery} instead.
 *
 * A composable to access the results of a watched query.
 */
export declare const usePowerSyncWatchedQuery: <T = any>(sqlStatement: MaybeRef<string>, sqlParameters?: MaybeRef<any[]>, options?: Omit<SQLWatchOptions, "signal">) => WatchedQueryResult<T>;
