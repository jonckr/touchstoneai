import { registry } from '../registry.js';
import type { CheckContext, CheckResult } from '../types.js';

registry.register({
  id: 'reliability.concurrent-requests',
  title: 'Concurrent Request Handling',
  dimension: 'reliability',
  description: 'Sends multiple simultaneous requests to verify the server handles concurrency without corruption or deadlocks',
  async run(ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now();

    if (ctx.tools.length === 0) {
      return {
        checkId: 'reliability.concurrent-requests',
        title: 'Concurrent Request Handling',
        dimension: 'reliability',
        severity: 'warn',
        score: 50,
        message: 'Server exposes no tools — cannot test concurrent request handling',
        suggestion: 'Expose at least one tool so concurrency can be tested',
        durationMs: Date.now() - start,
      };
    }

    const tool = ctx.tools[0];
    const args: Record<string, unknown> = {};
    if (tool.inputSchema?.required) {
      for (const param of tool.inputSchema.required) {
        const schema = tool.inputSchema.properties?.[param] as { type?: string } | undefined;
        if (schema?.type === 'number' || schema?.type === 'integer') {
          args[param] = 0;
        } else if (schema?.type === 'boolean') {
          args[param] = false;
        } else {
          args[param] = 'test';
        }
      }
    }

    const concurrency = 5;
    const promises: Promise<{ ok: boolean; error?: string }>[] = [];

    for (let i = 0; i < concurrency; i++) {
      promises.push(
        ctx.client
          .callTool({ name: tool.name, arguments: args }, undefined, { timeout: ctx.timeout })
          .then(() => ({ ok: true }))
          .catch((err: Error) => ({ ok: false, error: err.message })),
      );
    }

    const results = await Promise.all(promises);
    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);

    // Score based on success rate
    const score = Math.round((succeeded / concurrency) * 100);
    const severity = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';

    return {
      checkId: 'reliability.concurrent-requests',
      title: 'Concurrent Request Handling',
      dimension: 'reliability',
      severity,
      score,
      message:
        score >= 80
          ? `Server handled ${succeeded}/${concurrency} concurrent requests successfully`
          : `Server failed ${concurrency - succeeded}/${concurrency} concurrent requests`,
      suggestion:
        score < 80
          ? 'Ensure the server can handle multiple simultaneous requests without corruption or deadlocks'
          : undefined,
      evidence: {
        concurrency,
        succeeded,
        failures: failed.map((f) => f.error),
      },
      durationMs: Date.now() - start,
    };
  },
});
