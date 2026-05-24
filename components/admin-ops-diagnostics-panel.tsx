import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyDiagnosticsButton } from "@/components/copy-diagnostics-button";
import type { AdminOpsStatus, OpsCheckStatus } from "@/lib/admin-ops-status";

type Props = {
  status: AdminOpsStatus;
};

function checkTone(state: OpsCheckStatus): string {
  switch (state) {
    case "pass":
      return "text-emerald-300";
    case "warn":
      return "text-amber-200";
    case "fail":
      return "text-rose-200";
    default:
      return "text-slate-200";
  }
}

function overallTone(checks: AdminOpsStatus["checks"]): string {
  const hasFail = checks.some((check) => check.status === "fail");
  const hasWarn = checks.some((check) => check.status === "warn");
  if (hasFail) return "border-rose-500/40 bg-rose-500/10 text-rose-100";
  if (hasWarn) return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

function overallLabel(checks: AdminOpsStatus["checks"]): string {
  const hasFail = checks.some((check) => check.status === "fail");
  const hasWarn = checks.some((check) => check.status === "warn");
  if (hasFail) return "Needs attention";
  if (hasWarn) return "Warnings present";
  return "Healthy";
}

function buildClipboardPayload(status: AdminOpsStatus): string {
  const lines: string[] = [];
  lines.push(`SVF operator diagnostics @ ${status.generatedAt}`);
  lines.push(`Schema severity: ${status.schemaSeverity}`);
  lines.push("");
  lines.push("Checks:");

  for (const check of status.checks) {
    lines.push(`- [${check.status.toUpperCase()}] ${check.label}: ${check.detail}`);
    if (check.remediation) {
      lines.push(`  remediation: ${check.remediation}`);
    }
  }

  lines.push("");
  lines.push("Recent failures:");
  if (status.recentFailures.length === 0) {
    lines.push("- none");
  } else {
    for (const failure of status.recentFailures) {
      lines.push(
        `- ${failure.at} | ${failure.status} ${failure.code} | ${failure.route} | ${failure.message} | requestId=${failure.requestId}`,
      );
      if (failure.recoveryHint) {
        lines.push(`  hint: ${failure.recoveryHint}`);
      }
    }
  }

  lines.push("");
  lines.push("Remediation pointers:");
  for (const pointer of status.remediationPointers) {
    lines.push(`- ${pointer}`);
  }

  return lines.join("\n");
}

export function AdminOpsDiagnosticsPanel({ status }: Props) {
  const clipboardPayload = buildClipboardPayload(status);

  return (
    <Card className="space-y-4 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Operator diagnostics</h2>
          <p className="mt-1 text-sm text-muted">
            Environment posture, live ops checks, and recent failure signals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={overallTone(status.checks)}>
            {overallLabel(status.checks)}
          </Badge>
          <CopyDiagnosticsButton text={clipboardPayload} />
        </div>
      </div>

      <p className="text-xs text-muted">
        Snapshot:{" "}
        <span className="font-mono text-foreground">
          {new Date(status.generatedAt).toLocaleString()}
        </span>
      </p>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Ops checks</h3>
        <ul className="space-y-2">
          {status.checks.map((check) => (
            <li
              key={check.key}
              className="rounded-lg border border-line bg-vault-panel/40 px-3 py-2"
            >
              <p className={`text-sm font-medium ${checkTone(check.status)}`}>
                {check.label}
              </p>
              <p className="mt-1 text-xs text-muted">{check.detail}</p>
              {check.remediation ? (
                <p className="mt-1 text-xs text-muted">
                  Remediation: {check.remediation}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Recent failures</h3>
        {status.recentFailures.length === 0 ? (
          <p className="rounded-lg border border-line bg-vault-panel/30 px-3 py-2 text-xs text-muted">
            No recent API failures captured in this runtime session.
          </p>
        ) : (
          <ul className="space-y-2">
            {status.recentFailures.map((failure) => (
              <li
                key={`${failure.requestId}-${failure.at}`}
                className="rounded-lg border border-line bg-vault-panel/30 px-3 py-2"
              >
                <p className="text-xs text-foreground">
                  <span className="font-mono">{failure.status}</span>{" "}
                  <span className="font-mono">{failure.code}</span> on{" "}
                  <span className="font-mono">{failure.route}</span>
                </p>
                <p className="mt-1 text-xs text-muted">{failure.message}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {new Date(failure.at).toLocaleString()} | requestId{" "}
                  <span className="font-mono text-foreground">{failure.requestId}</span>
                </p>
                {failure.recoveryHint ? (
                  <p className="mt-1 text-[11px] text-muted">
                    Hint: {failure.recoveryHint}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Remediation pointers</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {status.remediationPointers.map((pointer) => (
            <li key={pointer}>{pointer}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <h3 className="text-sm font-medium text-foreground">Operator quick links</h3>
        <ul className="flex flex-wrap gap-2 text-xs">
          <li>
            <code className="rounded-md border border-line bg-vault-panel/40 px-2 py-1 text-muted">
              docs/discover-setup.md
            </code>
          </li>
          <li>
            <code className="rounded-md border border-line bg-vault-panel/40 px-2 py-1 text-muted">
              npm run sync:discover
            </code>
          </li>
          <li>
            <code className="rounded-md border border-line bg-vault-panel/40 px-2 py-1 text-muted">
              npm run qa:ci
            </code>
          </li>
          <li>
            <code className="rounded-md border border-line bg-vault-panel/40 px-2 py-1 text-muted">
              npm run e2e:smoke
            </code>
          </li>
        </ul>
      </div>
    </Card>
  );
}
