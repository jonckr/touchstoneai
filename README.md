# TouchStone

**The standard for AI tool quality** — score any MCP server 0–100.

TouchStone connects to an [MCP](https://modelcontextprotocol.io/) server and runs automated checks across five dimensions: **Reliability**, **Performance**, **Security**, **Documentation**, and **Standards Compliance**. The result is a weighted score (0–100) with actionable suggestions for improvement.

## Quick Start

```bash
npx touchstoneai check <server>
```

### Examples

```bash
# Score a local stdio server
npx touchstoneai check ./my-server.js

# Score an npx-based server
npx touchstoneai check npx some-mcp-server

# Score a remote HTTP server
npx touchstoneai check http://localhost:3000/mcp

# JSON output for CI
npx touchstoneai check ./server.js --format json --ci --min-score 70
```

## Scoring Dimensions

| Dimension       | Weight | What It Measures                                              |
| --------------- | ------ | ------------------------------------------------------------- |
| Reliability     | 25%    | Error handling, graceful degradation, timeout behavior         |
| Performance     | 20%    | Response latency, throughput, resource efficiency              |
| Security        | 20%    | Input validation, auth patterns, injection resistance          |
| Documentation   | 20%    | Tool descriptions, parameter schemas, examples                 |
| Standards       | 15%    | MCP spec compliance, JSON-RPC correctness                      |

## CLI Options

```
touchstoneai check <server>
  --stdio               Force stdio transport
  --url                 Force HTTP transport
  --format <format>     Output format: terminal (default) | json
  --ci                  CI mode: JSON output + exit code
  --min-score <n>       Minimum passing score (default: 60)
  --dimensions <d,...>  Run only specific dimensions
  --timeout <ms>        Per-check timeout (default: 10000)
  --verbose             Show individual check details
```

## Development

```bash
npm install
npm run build      # Build with tsup
npm run lint       # ESLint
npm run typecheck  # TypeScript type checking
npm run test       # Run tests with vitest
npm run check      # All of the above
```

## License

MIT
