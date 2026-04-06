import { registry } from '../registry.js';
import type { CheckContext, CheckResult } from '../types.js';

registry.register({
  id: 'reliability.malformed-input',
  title: 'Malformed Input Handling',
  dimension: 'reliability',
  description: 'Sends edge-case inputs (empty strings, special characters, oversized values) to verify the server handles them without crashing',
  async run(ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now();

    if (ctx.tools.length === 0) {
      return {
        checkId: 'reliability.malformed-input',
        title: 'Malformed Input Handling',
        dimension: 'reliability',
        severity: 'warn',
        score: 50,
        message: 'Server exposes no tools — cannot test malformed input handling',
        suggestion: 'Expose at least one tool so input handling can be validated',
        durationMs: Date.now() - start,
      };
    }

    const tool = ctx.tools[0];
    const paramNames = Object.keys(tool.inputSchema?.properties ?? {});
    const targetParam = paramNames[0];

    // If no params, test with an empty call
    if (!targetParam) {
      try {
        await ctx.client.callTool({ name: tool.name, arguments: {} }, undefined, { timeout: ctx.timeout });
        return {
          checkId: 'reliability.malformed-input',
          title: 'Malformed Input Handling',
          dimension: 'reliability',
          severity: 'pass',
          score: 100,
          message: 'Tool with no parameters handles empty calls correctly',
          durationMs: Date.now() - start,
        };
      } catch {
        return {
          checkId: 'reliability.malformed-input',
          title: 'Malformed Input Handling',
          dimension: 'reliability',
          severity: 'pass',
          score: 80,
          message: 'Tool with no parameters rejects empty calls with an error',
          durationMs: Date.now() - start,
        };
      }
    }

    const edgeCases: { label: string; value: unknown }[] = [
      { label: 'empty string', value: '' },
      { label: 'special characters', value: '<script>alert("xss")</script>\'; DROP TABLE--' },
      { label: 'very long string', value: 'x'.repeat(10_000) },
      { label: 'null value', value: null },
      { label: 'numeric where string expected', value: 99999 },
    ];

    let passed = 0;
    let total = 0;

    for (const { value } of edgeCases) {
      total++;
      try {
        const result = await ctx.client.callTool(
          { name: tool.name, arguments: { [targetParam]: value } },
          undefined,
          { timeout: ctx.timeout },
        );
        // Server didn't crash — that's the baseline. isError is even better.
        if (result && 'isError' in result && result.isError) {
          passed++;
        } else {
          // Didn't crash, processed it somehow — acceptable
          passed++;
        }
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err) {
          // JSON-RPC error — server handled it properly
          passed++;
        }
        // else: crash / disconnect — scored as failure
      }
    }

    const score = total > 0 ? Math.round((passed / total) * 100) : 0;
    const severity = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';

    return {
      checkId: 'reliability.malformed-input',
      title: 'Malformed Input Handling',
      dimension: 'reliability',
      severity,
      score,
      message:
        score >= 80
          ? `Server handled ${passed}/${total} edge-case inputs without crashing`
          : `Server failed on ${total - passed}/${total} edge-case inputs`,
      suggestion:
        score < 80
          ? 'Validate and sanitize all tool inputs — handle empty strings, null, oversized payloads, and special characters gracefully'
          : undefined,
      evidence: { passed, total },
      durationMs: Date.now() - start,
    };
  },
});
