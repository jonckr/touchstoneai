#!/usr/bin/env node
import { Command } from 'commander';

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
  .action((_server, _opts) => {
    // TODO: Wire up check runner in TOU-4
    console.log('TouchStone check command — not yet implemented');
    process.exit(0);
  });

program.parse();
