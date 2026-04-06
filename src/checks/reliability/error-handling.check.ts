import { registry } from '../registry.js';
import type { CheckContext, CheckResult } from '../types.js';

registry.register({
  id: 'reliability.error-handling',
  title: 'Error Response Format',
  dimension: 'reliability',
  description: 'Calls tools with invalid inputs and verifies the server returns proper JSON-RPC error objects with code and message',
  async run(ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now();

    if (ctx.tools.length === 0) {
      return {
        checkId: 'reliability.error-handling',
        title: 'Error Response Format',
        dimension: 'reliability',
        severity: 'warn',
        score: 50,
        message: 'Server exposes no tools — cannot test error handling on tool calls',
        suggestion: 'Expose at least one tool so error handling can be validated',
        durationMs: Date.now() - start,
      };
    }

    const tool = ctx.tools[0];
    let totalScore = 0;
    let tests = 0;

    // Test 1: Call tool with completely wrong argument types
    try {
      const result = await ctx.client.callTool(
        { name: tool.name, arguments: { __invalid_param__: 'not-a-real-param' } },
        undefined,
        { timeout: ctx.timeout },
      );
      tests++;
      // Server should return isError: true or a meaningful error content
      if (result && 'isError' in result && result.isError) {
        totalScore += 100;
      } else if (result && 'content' in result && Array.isArray(result.content)) {
        // Some servers return error info in content without setting isError
        const hasErrorText = result.content.some(
          (c: { type: string; text?: string }) => c.type === 'text' && c.text && /error|invalid|fail/i.test(c.text),
        );
        totalScore += hasErrorText ? 75 : 25;
      } else {
        totalScore += 25;
      }
    } catch (err: unknown) {
      tests++;
      // A proper JSON-RPC error thrown by the SDK is acceptable — it means the server responded with an error code
      if (err && typeof err === 'object' && 'code' in err) {
        totalScore += 100;
      } else {
        // Unexpected crash / transport error
        totalScore += 0;
      }
    }

    // Test 2: Call tool with empty arguments when it expects params
    const hasRequiredParams =
      tool.inputSchema?.required && Array.isArray(tool.inputSchema.required) && tool.inputSchema.required.length > 0;
    if (hasRequiredParams) {
      try {
        const result = await ctx.client.callTool(
          { name: tool.name, arguments: {} },
          undefined,
          { timeout: ctx.timeout },
        );
        tests++;
        if (result && 'isError' in result && result.isError) {
          totalScore += 100;
        } else {
          totalScore += 25;
        }
      } catch (err: unknown) {
        tests++;
        if (err && typeof err === 'object' && 'code' in err) {
          totalScore += 100;
        } else {
          totalScore += 0;
        }
      }
    }

    const score = tests > 0 ? Math.round(totalScore / tests) : 0;
    const severity = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';

    return {
      checkId: 'reliability.error-handling',
      title: 'Error Response Format',
      dimension: 'reliability',
      severity,
      score,
      message:
        score >= 80
          ? 'Server returns proper error responses for invalid tool inputs'
          : score >= 50
            ? 'Server handles some invalid inputs but error responses could be more structured'
            : 'Server does not return proper error responses for invalid inputs',
      suggestion: score < 80 ? 'Return JSON-RPC errors with code and message for invalid tool calls' : undefined,
      durationMs: Date.now() - start,
    };
  },
});
