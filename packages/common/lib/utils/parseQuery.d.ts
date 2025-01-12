import type { CompilableQuery } from '../types/types';
export interface ParsedQuery {
    sqlStatement: string;
    parameters: any[];
}
export declare const parseQuery: <T>(query: string | CompilableQuery<T>, parameters: any[]) => ParsedQuery;
