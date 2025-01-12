import '@journeyapps/wa-sqlite';
import type { DBFunctionsInterface } from './types';
export declare function _openDB(dbFileName: string, options?: {
    useWebWorker: boolean;
}): Promise<DBFunctionsInterface>;
