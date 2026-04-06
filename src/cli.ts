#!/usr/bin/env node
import { Command } from 'commander';
import { connectToServer } from './client/connect.js';
import { runChecks } from './checks/runner.js';
import { renderJson } from './output/json.js';
import type { Dimension } from './checks/types.js';

const program = new Command();

program
  .name('touchstoneai')
  .description('The standard for AI tool quality — score any MCP server 0-100')
  .version('0.1.0');

program
  .command('check <server>')
  .description('Score an MCP server')
  .option('--stdio', 'Force stdio transport')
  .option('--url', 'Force HTTP transport')
  .option('--format <format>', 'Output format (terminal|json)', 'terminal')
  .option('--ci', 'CI mode: JSON output + exit code')
  .option('--min-score <n>', 'Minimum passing score for CI mode', '60')
  .option('--dimensions <dims>', 'Run only specific dimensions (comma-separated)')
  .option('--timeout <ms>', 'Per-check timeout in ms', '10000')
  .option('--verbose', 'Show individual check details')
  .action(async (server: string, opts) => {
    try {
      const transport = opts.stdio ? 'stdio' : opts.url ? 'http' : undefined;
      const timeout = parseInt(opts.timeout, 10);

      const connected = await connectToServer({
        target: server,
        transport: transport as 'stdio' | 'http' | undefined,
        timeout: 30_000,
      });

      const dimensions = opts.dimensions
        ? (opts.dimensions.split(',') as Dimension[])
        : undefined;

      const result = await runChecks({
        client: connected.client,
        dimensions,
        timeout,
      });

      // Attach server info from connection
      result.serverInfo = connected.serverInfo;

      const format = opts.ci ? 'json' : opts.format;

      if (format === 'json') {
        console.log(renderJson(result));
      } else {
        // Terminal output
        console.log(`\nTouchStone Score: ${result.overall}/100`);
        console.log(`${result.serverInfo.name} v${result.serverInfo.version}\n`);

        for (const [dim, data] of Object.entries(result.scores)) {
          if (data) {
            const bar = '█'.repeat(Math.round(data.score / 10)) + '░'.repeat(10 - Math.round(data.score / 10));
            const padded = dim.padEnd(16);
            console.log(`  ${padded} ${bar}  ${data.score}/100  (${data.checkCount} checks)`);
          }
        }

        const suggestions = result.checks
          .filter((c) => c.suggestion)
          .map((c) => c.suggestion!);

        if (suggestions.length > 0) {
          console.log(`\n  ${suggestions.length} suggestion(s) to improve your score:`);
          suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
        }

        if (opts.verbose) {
          console.log('\n  Individual checks:');
          for (const check of result.checks) {
            const icon = check.severity === 'pass' ? '+' : check.severity === 'warn' ? '!' : 'x';
            console.log(`  [${icon}] ${check.title}: ${check.score}/100 — ${check.message}`);
          }
        }

        console.log('');
      }

      await connected.disconnect();

      if (opts.ci) {
        const minScore = parseInt(opts.minScore, 10);
        process.exit(result.overall >= minScore ? 0 : 1);
      }
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
