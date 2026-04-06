import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Dimension, CheckResult, CheckContext } from './types.js';
import type { DimensionScores } from '../scoring/calculator.js';
import { registry } from './registry.js';
import { calculateScores } from '../scoring/calculator.js';

// Ensure reliability checks are registered
import './reliability/index.js';

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

export async function runChecks(opts: RunOptions): Promise<RunResult> {
  const start = Date.now();
  const timeout = opts.timeout ?? 10_000;
  const concurrency = opts.concurrency ?? 3;

  // Build the check context
  const capabilities = opts.client.getServerCapabilities() ?? {};
  let tools: CheckContext['tools'] = [];
  try {
    const toolsResult = await opts.client.listTools(undefined, { timeout });
    tools = toolsResult.tools;
  } catch {
    // Server may not support tools — checks will handle empty tools list
  }

  const ctx: CheckContext = {
    client: opts.client,
    capabilities,
    tools,
    timeout,
  };

  // Get checks, filtered by dimension if specified
  let checks = registry.getAll();
  if (opts.dimensions && opts.dimensions.length > 0) {
    const dims = new Set(opts.dimensions);
    checks = checks.filter((c) => dims.has(c.dimension));
  }

  // Group checks by dimension — within a dimension, run sequentially; across dimensions, run in parallel
  const byDimension = new Map<Dimension, typeof checks>();
  for (const check of checks) {
    const arr = byDimension.get(check.dimension) ?? [];
    arr.push(check);
    byDimension.set(check.dimension, arr);
  }

  const allResults: CheckResult[] = [];
  const dimensionEntries = Array.from(byDimension.entries());

  // Run dimensions in parallel, limited by concurrency
  for (let i = 0; i < dimensionEntries.length; i += concurrency) {
    const batch = dimensionEntries.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async ([, dimensionChecks]) => {
        const results: CheckResult[] = [];
        for (const check of dimensionChecks) {
          try {
            const result = await check.run(ctx);
            results.push(result);
          } catch (err: unknown) {
            // Check crashed — score 0
            results.push({
              checkId: check.id,
              title: check.title,
              dimension: check.dimension,
              severity: 'fail',
              score: 0,
              message: `Check crashed: ${err instanceof Error ? err.message : String(err)}`,
              durationMs: 0,
            });
          }
        }
        return results;
      }),
    );
    allResults.push(...batchResults.flat());
  }

  const { dimensions, overall } = calculateScores(allResults);

  const serverVersion = opts.client.getServerVersion();

  return {
    checks: allResults,
    scores: dimensions,
    overall,
    serverInfo: {
      name: serverVersion?.name ?? 'unknown',
      version: serverVersion?.version ?? '0.0.0',
    },
    durationMs: Date.now() - start,
  };
}
