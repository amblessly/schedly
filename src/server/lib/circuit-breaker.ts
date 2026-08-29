interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const DEFAULT_CONFIG = {
  threshold: 5,
  resetTimeout: 30000,
  halfOpenAttempts: 3,
};

export function getCircuitBreaker(name: string, config = DEFAULT_CONFIG) {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, {
      failures: 0,
      lastFailure: 0,
      state: "CLOSED",
    });
  }

  const cb = circuitBreakers.get(name)!;

  function isOpen(): boolean {
    if (cb.state === "OPEN") {
      const now = Date.now();
      if (now - cb.lastFailure >= config.resetTimeout) {
        cb.state = "HALF_OPEN";
        cb.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  function recordSuccess(): void {
    cb.failures = 0;
    cb.state = "CLOSED";
  }

  function recordFailure(): void {
    cb.failures++;
    cb.lastFailure = Date.now();
    if (cb.failures >= config.threshold) {
      cb.state = "OPEN";
      console.log(`[CIRCUIT_BREAKER] ${name} opened after ${cb.failures} failures`);
    }
  }

  function getStatus() {
    return {
      name,
      state: cb.state,
      failures: cb.failures,
      lastFailure: new Date(cb.lastFailure).toISOString(),
    };
  }

  function canExecute(): boolean {
    if (cb.state === "CLOSED") return true;
    if (cb.state === "HALF_OPEN") {
      return cb.failures < config.halfOpenAttempts;
    }
    return false;
  }

  return {
    isOpen,
    recordSuccess,
    recordFailure,
    getStatus,
    canExecute,
  };
}

export const geminiCircuitBreaker = getCircuitBreaker("gemini", {
  threshold: 10,
  resetTimeout: 60000,
  halfOpenAttempts: 2,
});

export const openaiCircuitBreaker = getCircuitBreaker("openai", {
  threshold: 10,
  resetTimeout: 60000,
  halfOpenAttempts: 2,
});
