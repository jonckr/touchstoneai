import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Dimension, CheckResult } from './types.js';
import type { DimensionScores } from '../scoring/calculator.js';

export interface RunOptions {
  client: Client;
  dimensions?: Dimension[];
  timeout?: number;
  concurrency?: number;
}

export interface RunResult {
  checks: CheckResult[];
  scores: DimensionScores;
  overall: number;
  serverInfo: { name: string; version: string };
  durationMs: number;
}

export async function runChecks(_opts: RunOptions): Promise<RunResult> {
  // TODO: Implement check orchestration in TOU-4
  throw new Error('Not yet implemented');
}
