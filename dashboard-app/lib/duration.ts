export function millisecondsToSeconds(durationMs: number | null | undefined): number | null {
  if (durationMs == null || !Number.isFinite(durationMs)) {
    return null;
  }

  // Legacy manual sync rows were stored in seconds instead of milliseconds.
  if (durationMs > 0 && durationMs < 1000) {
    return Math.max(0, Math.round(durationMs));
  }

  return Math.max(0, Math.round(durationMs / 1000));
}

export function formatDurationFromSeconds(durationSeconds: number | null | undefined): string {
  if (durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return '-';
  }

  const totalSeconds = Math.max(0, Math.round(durationSeconds));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function formatDurationFromMilliseconds(durationMs: number | null | undefined): string {
  return formatDurationFromSeconds(millisecondsToSeconds(durationMs));
}
