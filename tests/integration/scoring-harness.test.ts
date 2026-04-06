/**
 * Scoring harness — validates that simulated check results from each server tier
 * produce overall scores within expected ranges.
 *
 * This uses calculateScores directly with check results that mirror what each
 * mock server quality level would produce. When runChecks (TOU-4) is implemented,
 * these can be upgraded to full end-to-end integration tests.
 */
import { describe, it, expect } from 'vitest';
import { calculateScores } from '../../src/scoring/calculator.js';
import type { CheckResult, Dimension, Severity } from '../../src/checks/types.js';

function makeCheck(
  id: string,
  dimension: Dimension,
  severity: Severity,
  score: number,
): CheckResult {
  return {
    checkId: id,
    title: id,
    dimension,
    severity,
    score,
    message: `Check ${id}: ${severity}`,
    durationMs: 10,
  };
}

/**
 * Simulate check results for a perfect server.
 * All dimensions score high — reliability, performance, security, documentation, standards.
 */
function perfectServerResults(): CheckResult[] {
  return [
    // Reliability: all tools work, proper error handling
    makeCheck('rel.tool-invoke', 'reliability', 'pass', 100),
    makeCheck('rel.error-handling', 'reliability', 'pass', 95),
    makeCheck('rel.graceful-errors', 'reliability', 'pass', 100),
    // Performance: fast responses
    makeCheck('perf.response-time', 'performance', 'pass', 100),
    makeCheck('perf.tool-latency', 'performance', 'pass', 95),
    // Security: proper input validation
    makeCheck('sec.input-validation', 'security', 'pass', 95),
    makeCheck('sec.no-injection', 'security', 'pass', 100),
    // Documentation: all tools documented
    makeCheck('doc.tool-descriptions', 'documentation', 'pass', 100),
    makeCheck('doc.param-descriptions', 'documentation', 'pass', 95),
    makeCheck('doc.schema-completeness', 'documentation', 'pass', 100),
    // Standards: proper MCP compliance
    makeCheck('std.version-format', 'standards', 'pass', 100),
    makeCheck('std.jsonrpc-compliance', 'standards', 'pass', 100),
  ];
}

/**
 * Simulate check results for a mediocre server.
 * Mixed results — some things work, some don't.
 */
function mediocreServerResults(): CheckResult[] {
  return [
    // Reliability: tools work but poor error handling
    makeCheck('rel.tool-invoke', 'reliability', 'pass', 80),
    makeCheck('rel.error-handling', 'reliability', 'warn', 40),
    makeCheck('rel.graceful-errors', 'reliability', 'fail', 20),
    // Performance: slow responses
    makeCheck('perf.response-time', 'performance', 'warn', 50),
    makeCheck('perf.tool-latency', 'performance', 'warn', 45),
    // Security: no validation
    makeCheck('sec.input-validation', 'security', 'warn', 50),
    makeCheck('sec.no-injection', 'security', 'pass', 80),
    // Documentation: poor docs
    makeCheck('doc.tool-descriptions', 'documentation', 'warn', 40),
    makeCheck('doc.param-descriptions', 'documentation', 'fail', 20),
    makeCheck('doc.schema-completeness', 'documentation', 'warn', 60),
    // Standards: mostly compliant
    makeCheck('std.version-format', 'standards', 'pass', 80),
    makeCheck('std.jsonrpc-compliance', 'standards', 'pass', 90),
  ];
}

/**
 * Simulate check results for a broken server.
 * Almost everything fails.
 */
function brokenServerResults(): CheckResult[] {
  return [
    // Reliability: tools crash
    makeCheck('rel.tool-invoke', 'reliability', 'fail', 10),
    makeCheck('rel.error-handling', 'reliability', 'fail', 0),
    makeCheck('rel.graceful-errors', 'reliability', 'fail', 0),
    // Performance: N/A or very slow due to crashes
    makeCheck('perf.response-time', 'performance', 'fail', 15),
    makeCheck('perf.tool-latency', 'performance', 'fail', 10),
    // Security: no validation at all
    makeCheck('sec.input-validation', 'security', 'fail', 5),
    makeCheck('sec.no-injection', 'security', 'fail', 10),
    // Documentation: nothing documented
    makeCheck('doc.tool-descriptions', 'documentation', 'fail', 0),
    makeCheck('doc.param-descriptions', 'documentation', 'fail', 0),
    makeCheck('doc.schema-completeness', 'documentation', 'fail', 5),
    // Standards: non-compliant
    makeCheck('std.version-format', 'standards', 'fail', 10),
    makeCheck('std.jsonrpc-compliance', 'standards', 'fail', 20),
  ];
}

describe('scoring harness — score range validation', () => {
  it('perfect server scores 95–100', () => {
    const results = perfectServerResults();
    const { overall, dimensions } = calculateScores(results);

    expect(overall).toBeGreaterThanOrEqual(95);
    expect(overall).toBeLessThanOrEqual(100);

    // Each dimension should score high
    for (const [, dim] of Object.entries(dimensions)) {
      expect(dim!.score).toBeGreaterThanOrEqual(90);
    }
  });

  it('mediocre server scores 50–70', () => {
    const results = mediocreServerResults();
    const { overall, dimensions } = calculateScores(results);

    expect(overall).toBeGreaterThanOrEqual(50);
    expect(overall).toBeLessThanOrEqual(70);

    // At least one dimension should be below 50
    const dimScores = Object.values(dimensions).map((d) => d!.score);
    expect(dimScores.some((s) => s < 50)).toBe(true);
  });

  it('broken server scores 0–30', () => {
    const results = brokenServerResults();
    const { overall, dimensions } = calculateScores(results);

    expect(overall).toBeGreaterThanOrEqual(0);
    expect(overall).toBeLessThanOrEqual(30);

    // Most dimensions should score very low
    const dimScores = Object.values(dimensions).map((d) => d!.score);
    const lowScoring = dimScores.filter((s) => s <= 20);
    expect(lowScoring.length).toBeGreaterThanOrEqual(3);
  });

  it('score reproducibility within ±2 points', () => {
    // Run the same check results multiple times and ensure identical scores
    const runs = Array.from({ length: 10 }, () => {
      const results = perfectServerResults();
      return calculateScores(results).overall;
    });

    const first = runs[0];
    for (const score of runs) {
      expect(Math.abs(score - first)).toBeLessThanOrEqual(2);
    }
    // In fact, with deterministic input, scores should be exactly equal
    expect(new Set(runs).size).toBe(1);
  });

  it('score ranges do not overlap between tiers', () => {
    const perfect = calculateScores(perfectServerResults()).overall;
    const mediocre = calculateScores(mediocreServerResults()).overall;
    const broken = calculateScores(brokenServerResults()).overall;

    expect(perfect).toBeGreaterThan(mediocre);
    expect(mediocre).toBeGreaterThan(broken);

    // Gap between tiers should be at least 20 points
    expect(perfect - mediocre).toBeGreaterThanOrEqual(20);
    expect(mediocre - broken).toBeGreaterThanOrEqual(20);
  });
});
