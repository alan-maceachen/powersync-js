/**
 * Tests if the input is a {@link SQLOpenOptions}
 */
export const isSQLOpenOptions = (test) => {
    return typeof test == 'object' && 'dbFilename' in test;
};
/**
 * Tests if input is a {@link SQLOpenFactory}
 */
export const isSQLOpenFactory = (test) => {
    return typeof test?.openDB == 'function';
};
/**
 * Tests if input is a {@link DBAdapter}
 */
export const isDBAdapter = (test) => {
    return typeof test?.writeTransaction == 'function';
};
//# sourceMappingURL=SQLOpenFactory.js.map