type CircuitState = "closed" | "open" | "half-open";

type CircuitOptions = {
  failureThreshold: number;
  resetTimeoutMs: number;
};

type CircuitSnapshot = {
  consecutiveFailures: number;
  openedAt: number | null;
  state: CircuitState;
};

const breakers = new Map<string, CircuitSnapshot & { options: CircuitOptions }>();

function getOrCreateBreaker(name: string, options: CircuitOptions) {
  const existing = breakers.get(name);
  if (existing) return existing;

  const fresh = {
    consecutiveFailures: 0,
    openedAt: null,
    options,
    state: "closed" as CircuitState,
  };
  breakers.set(name, fresh);
  return fresh;
}

export function isCircuitOpen(
  name: string,
  options: CircuitOptions = { failureThreshold: 5, resetTimeoutMs: 5 * 60 * 1000 },
): boolean {
  const breaker = getOrCreateBreaker(name, options);

  if (breaker.state === "open" && breaker.openedAt !== null) {
    const elapsed = Date.now() - breaker.openedAt;

    if (elapsed >= breaker.options.resetTimeoutMs) {
      breaker.state = "half-open";
      return false;
    }

    return true;
  }

  return false;
}

export function recordCircuitSuccess(name: string) {
  const breaker = breakers.get(name);
  if (!breaker) return;

  breaker.consecutiveFailures = 0;
  breaker.openedAt = null;
  breaker.state = "closed";
}

export function recordCircuitFailure(
  name: string,
  options: CircuitOptions = { failureThreshold: 5, resetTimeoutMs: 5 * 60 * 1000 },
) {
  const breaker = getOrCreateBreaker(name, options);
  breaker.consecutiveFailures += 1;

  if (breaker.consecutiveFailures >= breaker.options.failureThreshold) {
    breaker.state = "open";
    breaker.openedAt = Date.now();
  }
}

export function getCircuitSnapshot(name: string): CircuitSnapshot | null {
  const breaker = breakers.get(name);
  if (!breaker) return null;
  return {
    consecutiveFailures: breaker.consecutiveFailures,
    openedAt: breaker.openedAt,
    state: breaker.state,
  };
}
