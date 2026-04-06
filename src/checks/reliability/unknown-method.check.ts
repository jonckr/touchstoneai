import { registry } from '../registry.js';
import type { CheckContext, CheckResult } from '../types.js';

registry.register({
  id: 'reliability.unknown-method',
  title: 'Unknown Method Handling',
  dimension: 'reliability',
  description: 'Calls a non-existent tool to verify the server gracefully rejects unknown method calls',
  async run(ctx: CheckContext): Promise<CheckResult> {
    const start = Date.now();
    const fakeTool = `__touchstone_nonexistent_tool_${Date.now()}`;

    let score = 0;
    let message = '';

    try {
      const result = await ctx.client.callTool(
        { name: fakeTool, arguments: {} },
        undefined,
        { timeout: ctx.timeout },
      );

      if (result && 'isError' in result && result.isError) {
        // Server correctly reports an error for unknown tool
        score = 100;
        message = 'Server returns an error response for unknown tool calls';
      } else if (result && 'content' in result && Array.isArray(result.content)) {
        const hasErrorText = result.content.some(
          (c: { type: string; text?: string }) =>
            c.type === 'text' && c.text && /not found|unknown|does not exist|invalid/i.test(c.text),
        );
        if (hasErrorText) {
          score = 75;
          message = 'Server indicates unknown tool in response content but does not set isError flag';
        } else {
          score = 25;
          message = 'Server returns a non-error response for unknown tool calls';
        }
      } else {
        score = 25;
        message = 'Server returned an unexpected response format for unknown tool call';
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        // JSON-RPC error with code — server properly rejected
        score = 100;
        message = 'Server returns a JSON-RPC error for unknown tool calls';
      } else {
        score = 0;
        message = 'Server crashed or disconnected when called with unknown tool';
      }
    }

    const severity = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';

    return {
      checkId: 'reliability.unknown-method',
      title: 'Unknown Method Handling',
      dimension: 'reliability',
      severity,
      score,
      message,
      suggestion:
        score < 80
          ? 'Return a JSON-RPC error (e.g. MethodNotFound -32601) when an unknown tool is called'
          : undefined,
      durationMs: Date.now() - start,
    };
  },
});
