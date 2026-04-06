import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { ServerCapabilities, Tool } from '@modelcontextprotocol/sdk/types.js';

export type Dimension = 'reliability' | 'performance' | 'security' | 'documentation' | 'standards';
export type Severity = 'pass' | 'warn' | 'fail';

export interface CheckResult {
  checkId: string;
  title: string;
  dimension: Dimension;
  severity: Severity;
  score: number;
  message: string;
  suggestion?: string;
  evidence?: unknown;
  durationMs: number;
}

export interface CheckContext {
  client: Client;
  capabilities: ServerCapabilities;
  tools: Tool[];
  timeout: number;
}

export interface CheckPlugin {
  id: string;
  title: string;
  dimension: Dimension;
  description: string;
  run(ctx: CheckContext): Promise<CheckResult>;
}
