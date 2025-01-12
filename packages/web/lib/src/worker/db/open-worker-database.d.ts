import * as Comlink from 'comlink';
import type { OpenDB } from '../../shared/types';
/**
 * Opens a shared or dedicated worker which exposes opening of database connections
 */
export declare function openWorkerDatabasePort(workerIdentifier: string, multipleTabs?: boolean): MessagePort | Worker;
/**
 * @returns A function which allows for opening database connections inside
 * a worker.
 */
export declare function getWorkerDatabaseOpener(workerIdentifier: string, multipleTabs?: boolean): Comlink.Remote<OpenDB>;
