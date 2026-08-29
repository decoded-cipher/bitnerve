export interface ErrorInfo {
  message: string;
  code?: number | string;
  status?: string;
}

// Detect provider rate-limit / quota exhaustion
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { error?: unknown; message?: unknown; code?: unknown; status?: unknown };

  if (typeof err.status === 'string' && err.status.toUpperCase() === 'RESOURCE_EXHAUSTED') {
    return true;
  }

  if (typeof err.code === 'number' && err.code === 429) {
    return true;
  }

  if (typeof err.code === 'string' && Number.parseInt(err.code, 10) === 429) {
    return true;
  }

  if (err.error && typeof err.error === 'object') {
    const inner = err.error as { status?: unknown; code?: unknown; message?: unknown };
    const status = typeof inner.status === 'string' ? inner.status.toUpperCase() : undefined;
    const code = typeof inner.code === 'number'
      ? inner.code
      : typeof inner.code === 'string'
        ? Number.parseInt(inner.code, 10)
        : undefined;
    const message = typeof inner.message === 'string' ? inner.message.toLowerCase() : undefined;

    if (status === 'RESOURCE_EXHAUSTED') {
      return true;
    }

    if (code === 429) {
      return true;
    }

    if (message && message.includes('resource exhausted')) {
      return true;
    }
  }

  if (typeof err.message === 'string') {
    const message = err.message.toLowerCase();
    if (message.includes('resource exhausted') || message.includes('429')) {
      return true;
    }
  }

  return false;
}

// Flatten a provider error for logging
export function describeError(error: unknown): ErrorInfo {
  if (error && typeof error === 'object') {
    const err = error as { message?: unknown; code?: unknown; status?: unknown; error?: unknown };
    const inner = err.error && typeof err.error === 'object' ? (err.error as Record<string, unknown>) : undefined;

    const message = typeof err.message === 'string'
      ? err.message
      : typeof inner?.message === 'string'
        ? inner.message
        : safeStringify(error);

    const rawCode = typeof err.code === 'number' || typeof err.code === 'string' ? err.code : inner?.code;
    const rawStatus = typeof err.status === 'string' ? err.status : inner?.status;

    return {
      message,
      code: typeof rawCode === 'number' || typeof rawCode === 'string' ? rawCode : undefined,
      status: typeof rawStatus === 'string' ? rawStatus : undefined,
    };
  }

  return {
    message: error instanceof Error ? error.message : safeStringify(error),
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
