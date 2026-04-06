import type { RunResult } from '../checks/runner.js';

export function renderJson(result: RunResult): string {
  return JSON.stringify(
    {
      version: '1.0',
      server: result.serverInfo,
      overall: result.overall,
      dimensions: result.scores,
      durationMs: result.durationMs,
    },
    null,
    2,
  );
}
