export interface ErrorInfo {
  message: string;
  code?: number | string;
  status?: string;
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
