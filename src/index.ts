export type { ConnectOptions, ConnectedServer } from './client/connect.js';
export type {
  Dimension,
  Severity,
  CheckResult,
  CheckContext,
  CheckPlugin,
} from './checks/types.js';
export type { RunOptions, RunResult } from './checks/runner.js';
export { connectToServer } from './client/connect.js';
export { registry } from './checks/registry.js';
export { runChecks } from './checks/runner.js';
export { DIMENSION_WEIGHTS } from './scoring/weights.js';
export { calculateScores } from './scoring/calculator.js';
