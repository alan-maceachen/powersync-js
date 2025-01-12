import { AbstractRemote, DEFAULT_REMOTE_LOGGER, FetchImplementationProvider } from '@powersync/common';
import { Platform } from 'react-native';
// Note docs for React Native https://github.com/mongodb/js-bson?tab=readme-ov-file#react-native
import { BSON } from 'bson';
import { fetch } from 'react-native-fetch-api';
export const STREAMING_POST_TIMEOUT_MS = 30_000;
/**
 * Directly imports fetch implementation from react-native-fetch-api.
 * This removes the requirement for the global `fetch` to be overridden by
 * a polyfill.
 */
class ReactNativeFetchProvider extends FetchImplementationProvider {
    getFetch() {
        return fetch.bind(globalThis);
    }
}
const CommonPolyfills = [
    {
        name: 'TextEncoder',
        test: () => typeof TextEncoder == 'undefined'
    }
];
const SocketPolyfillTests = [
    ...CommonPolyfills,
    {
        name: 'nextTick',
        test: () => typeof process.nextTick == 'undefined'
    },
    {
        name: 'Buffer',
        test: () => typeof global.Buffer == 'undefined'
    }
];
const HttpPolyfillTests = [
    ...CommonPolyfills,
    {
        name: 'TextDecoder',
        test: () => typeof TextDecoder == 'undefined'
    },
    {
        name: 'ReadableStream',
        test: () => typeof ReadableStream == 'undefined'
    }
];
const validatePolyfills = (tests) => {
    const missingPolyfills = tests.filter((t) => t.test()).map((t) => t.name);
    if (missingPolyfills.length) {
        throw new Error(`
Polyfills are undefined. Please ensure React Native polyfills are installed and imported in the app entrypoint.
See package README for detailed instructions.
The following polyfills appear to be missing:
${missingPolyfills.join('\n')}`);
    }
};
export class ReactNativeRemote extends AbstractRemote {
    connector;
    logger;
    constructor(connector, logger = DEFAULT_REMOTE_LOGGER, options) {
        super(connector, logger, {
            ...(options ?? {}),
            fetchImplementation: options?.fetchImplementation ?? new ReactNativeFetchProvider()
        });
        this.connector = connector;
        this.logger = logger;
    }
    async getBSON() {
        return BSON;
    }
    async socketStream(options) {
        validatePolyfills(SocketPolyfillTests);
        return super.socketStream(options);
    }
    async postStream(options) {
        validatePolyfills(HttpPolyfillTests);
        const timeout = Platform.OS == 'android'
            ? setTimeout(() => {
                this.logger.warn(`HTTP Streaming POST is taking longer than ${Math.ceil(STREAMING_POST_TIMEOUT_MS / 1000)} seconds to resolve. If using a debug build, please ensure Flipper Network plugin is disabled.`);
            }, STREAMING_POST_TIMEOUT_MS)
            : null;
        const result = await super.postStream({
            ...options,
            fetchOptions: {
                ...options.fetchOptions,
                /**
                 * The `react-native-fetch-api` polyfill provides streaming support via
                 * this non-standard flag
                 * https://github.com/react-native-community/fetch#enable-text-streaming
                 */
                // @ts-expect-error https://github.com/react-native-community/fetch#enable-text-streaming
                reactNative: { textStreaming: true }
            }
        });
        if (timeout) {
            clearTimeout(timeout);
        }
        return result;
    }
}
//# sourceMappingURL=ReactNativeRemote.js.map