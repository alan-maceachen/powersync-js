import { SyncStatus } from '@powersync/common';
/**
 * @deprecated Use {@link useStatus} instead.
 */
export declare const usePowerSyncStatus: () => import("vue").Ref<{
    readonly connected: boolean;
    readonly lastSyncedAt: {
        toString: () => string;
        toDateString: () => string;
        toTimeString: () => string;
        toLocaleString: {
            (): string;
            (locales?: string | string[], options?: Intl.DateTimeFormatOptions): string;
            (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string;
        };
        toLocaleDateString: {
            (): string;
            (locales?: string | string[], options?: Intl.DateTimeFormatOptions): string;
            (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string;
        };
        toLocaleTimeString: {
            (): string;
            (locales?: string | string[], options?: Intl.DateTimeFormatOptions): string;
            (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions): string;
        };
        valueOf: () => number;
        getTime: () => number;
        getFullYear: () => number;
        getUTCFullYear: () => number;
        getMonth: () => number;
        getUTCMonth: () => number;
        getDate: () => number;
        getUTCDate: () => number;
        getDay: () => number;
        getUTCDay: () => number;
        getHours: () => number;
        getUTCHours: () => number;
        getMinutes: () => number;
        getUTCMinutes: () => number;
        getSeconds: () => number;
        getUTCSeconds: () => number;
        getMilliseconds: () => number;
        getUTCMilliseconds: () => number;
        getTimezoneOffset: () => number;
        setTime: (time: number) => number;
        setMilliseconds: (ms: number) => number;
        setUTCMilliseconds: (ms: number) => number;
        setSeconds: (sec: number, ms?: number) => number;
        setUTCSeconds: (sec: number, ms?: number) => number;
        setMinutes: (min: number, sec?: number, ms?: number) => number;
        setUTCMinutes: (min: number, sec?: number, ms?: number) => number;
        setHours: (hours: number, min?: number, sec?: number, ms?: number) => number;
        setUTCHours: (hours: number, min?: number, sec?: number, ms?: number) => number;
        setDate: (date: number) => number;
        setUTCDate: (date: number) => number;
        setMonth: (month: number, date?: number) => number;
        setUTCMonth: (month: number, date?: number) => number;
        setFullYear: (year: number, month?: number, date?: number) => number;
        setUTCFullYear: (year: number, month?: number, date?: number) => number;
        toUTCString: () => string;
        toISOString: () => string;
        toJSON: (key?: any) => string;
        [Symbol.toPrimitive]: {
            (hint: "default"): string;
            (hint: "string"): string;
            (hint: "number"): number;
            (hint: string): string | number;
        };
    };
    readonly hasSynced: boolean;
    readonly dataFlowStatus: {
        downloading?: boolean;
        uploading?: boolean;
    };
    isEqual: (status: SyncStatus) => boolean;
    getMessage: () => string;
    toJSON: () => import("@powersync/common").SyncStatusOptions;
}>;
