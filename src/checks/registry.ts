import type { CheckPlugin, Dimension } from './types.js';

export class CheckRegistry {
  private checks: Map<string, CheckPlugin> = new Map();

  register(check: CheckPlugin): void {
    if (this.checks.has(check.id)) {
      throw new Error(`Check already registered: ${check.id}`);
    }
    this.checks.set(check.id, check);
  }

  getByDimension(dim: Dimension): CheckPlugin[] {
    return Array.from(this.checks.values()).filter((c) => c.dimension === dim);
  }

  getAll(): CheckPlugin[] {
    return Array.from(this.checks.values());
  }

  get(id: string): CheckPlugin | undefined {
    return this.checks.get(id);
  }
}

export const registry = new CheckRegistry();
