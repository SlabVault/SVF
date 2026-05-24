export type OperatorFailure = {
  at: string;
  route: string;
  status: number;
  code: string;
  message: string;
  requestId: string;
  recoveryHint?: string;
};

const MAX_FAILURES = 25;
const recentFailures: OperatorFailure[] = [];

export function recordOperatorFailure(failure: OperatorFailure): void {
  recentFailures.unshift(failure);
  if (recentFailures.length > MAX_FAILURES) {
    recentFailures.length = MAX_FAILURES;
  }
}

export function getRecentOperatorFailures(limit = 8): OperatorFailure[] {
  return recentFailures.slice(0, Math.max(0, limit));
}
