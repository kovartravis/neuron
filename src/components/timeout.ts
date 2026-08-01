/**
 * The timeout primitive.
 *
 * Before this, the only `timeout` in the codebase was SQLite's `busy_timeout`;
 * a hung `generate()` hung its caller forever. ADR 0010 §3 requires every model
 * call to be a bounded wait.
 *
 * It bounds the *wait*, not the work: the underlying ONNX generation cannot be
 * cancelled, so a timed-out call keeps running to completion in the background
 * and its result is discarded. That is acceptable because the process is
 * short-lived — but it means a timeout does not free the CPU it was spending.
 */

export class TimeoutError extends Error {
  constructor(
    public readonly label: string,
    public readonly ms: number
  ) {
    super(`${label} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return work;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
    // Never let a pending timeout be the reason the process stays alive.
    (timer as any).unref?.();
    work.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
