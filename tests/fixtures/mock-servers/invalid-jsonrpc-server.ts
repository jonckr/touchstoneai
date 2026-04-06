/**
 * Edge-case: Server that writes invalid JSON-RPC to stdout.
 *
 * Does NOT use the MCP SDK — manually writes malformed responses
 * to test client resilience against protocol violations.
 */

process.stdout.write('Content-Length: 13\r\n\r\n{not valid!!!');

// Keep process alive briefly so the client has time to read
setTimeout(() => {
  process.stdout.write('this is not json-rpc at all\n');
}, 100);

setTimeout(() => {
  process.exit(1);
}, 2000);
