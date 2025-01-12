export function quoteString(s) {
    return `'${s.replaceAll("'", "''")}'`;
}
export function quoteJsonPath(path) {
    return quoteString(`$.${path}`);
}
export function quoteIdentifier(s) {
    return `"${s.replaceAll('"', '""')}"`;
}
//# sourceMappingURL=strings.js.map