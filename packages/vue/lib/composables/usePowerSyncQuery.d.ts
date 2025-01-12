import { MaybeRef, Ref } from 'vue';
export type QueryOptions = {
    /**
     * Whether to watch the parameters for changes, any detected changes will cause the query to re-execute.
     * Default is true.
     */
    watchParameters: boolean;
    /**
     * Whether to execute the query immediately when the composable is invoked.
     * Default is true.
     */
    immediate: boolean;
};
export type Result<T> = {
    data: Ref<T[]>;
    loading: Ref<boolean>;
    error: Ref<Error>;
    refresh: () => Promise<void>;
};
/**
 * @deprecated use {@link useQuery} instead.
 *
 * A composable to access a single static query.
 * SQL Statement and query Parameters are watched by default.
 * For a result that updates as the source data changes, use {@link usePowerSyncWatchedQuery} instead.
 */
export declare const usePowerSyncQuery: <T = any>(sqlStatement: MaybeRef<string>, parameters?: MaybeRef<any[]>, queryOptions?: QueryOptions) => Result<T>;
