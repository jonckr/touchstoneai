import { registry } from '../registry.js';
import type { CheckContext, CheckResult } from '../types.js';

registry.register({
  id: 'reliability.timeout-behavior',
  title: 'Timeout Behavior',
  dimension: 'reliability',
  description: 'Calls tools and measures response time to verify the server responds within reasonable time bounds',
  async run(ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now();

    if (ctx.tools.length === 0) {
      return {
        checkId: 'reliability.timeout-behavior',
        title: 'Timeout Behavior',
        dimension: 'reliability',
        severity: 'warn',
        score: 50,
        message: 'Server exposes no tools — cannot measure timeout behavior',
        suggestion: 'Expose at least one tool so response times can be measured',
        durationMs: Date.now() - start,
      };
    }

    // Pick the simplest tool (fewest required params)
    const tool = [...ctx.tools].sort((a, b) => {
      const aReq = a.inputSchema?.required?.length ?? 0;
      const bReq = b.inputSchema?.required?.length ?? 0;
      return aReq - bReq;
    })[0];

    // Build minimal valid arguments
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

    // Run 3 calls and take the median response time
    const durations: number[] = [];
    let failures = 0;

    for (let i = 0; i < 3; i++) {
      const callStart = Date.now();
      try {
        await ctx.client.callTool({ name: tool.name, arguments: args }, undefined, { timeout: ctx.timeout });
        durations.push(Date.now() - callStart);
      } catch {
        const elapsed = Date.now() - callStart;
        if (elapsed >= ctx.timeout * 0.9) {
          // Timed out
          failures++;
        } else {
          // Error but responded quickly — that's fine for timeout scoring
          durations.push(elapsed);
        }
      }
    }

    if (durations.length === 0) {
      return {
        checkId: 'reliability.timeout-behavior',
        title: 'Timeout Behavior',
        dimension: 'reliability',
        severity: 'fail',
        score: 0,
        message: `All ${failures} calls timed out (timeout: ${ctx.timeout}ms)`,
        suggestion: 'Ensure tool calls complete within the configured timeout',
        evidence: { failures, timeout: ctx.timeout },
        durationMs: Date.now() - start,
      };
    }

    durations.sort((a, b) => a - b);
    const median = durations[Math.floor(durations.length / 2)];

    // Score: 100 if under 50% of timeout, linear degradation, 0 at timeout
    const ratio = median / ctx.timeout;
    let score: number;
    if (ratio <= 0.5) {
      score = 100;
    } else if (ratio <= 1.0) {
      // Linear from 100 at 50% to 0 at 100%
      score = Math.round(100 * (1 - (ratio - 0.5) / 0.5));
    } else {
      score = 0;
    }

    // Penalize for timeouts in the sample
    if (failures > 0) {
      score = Math.max(0, score - failures * 25);
    }

    const severity = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';

    return {
      checkId: 'reliability.timeout-behavior',
      title: 'Timeout Behavior',
      dimension: 'reliability',
      severity,
      score,
      message:
        score >= 80
          ? `Median response time ${median}ms (timeout: ${ctx.timeout}ms)`
          : `Median response time ${median}ms is slow relative to timeout ${ctx.timeout}ms`,
      suggestion:
        score < 80
          ? 'Optimize tool execution to respond faster, or increase the timeout if processing is legitimately slow'
          : undefined,
      evidence: { medianMs: median, durations, failures, timeout: ctx.timeout },
      durationMs: Date.now() - start,
    };
  },
});
