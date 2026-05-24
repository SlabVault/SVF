import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SchemaHealthReport, SchemaHealthSeverity, SchemaDriftScenario } from "@/lib/schema-health";

type Props = {
  report: SchemaHealthReport;
};

type CheckRow = {
  label: string;
  status: "pass" | "warn" | "fail" | "unknown";
  detail: string;
};

function severityTone(severity: SchemaHealthSeverity): string {
  switch (severity) {
    case "ok":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
    case "blocking":
      return "border-rose-500/40 bg-rose-500/10 text-rose-100";
    case "unconfigured":
      return "border-slate-500/40 bg-slate-500/15 text-slate-100";
    case "unreachable":
      return "border-orange-500/40 bg-orange-500/10 text-orange-100";
    default:
      return "border-line bg-vault-panel/60 text-foreground";
  }
}

function severityLabel(severity: SchemaHealthSeverity): string {
  switch (severity) {
    case "ok":
      return "Healthy";
    case "warning":
      return "Warning";
    case "blocking":
      return "Blocking drift";
    case "unconfigured":
      return "Unconfigured";
    case "unreachable":
      return "Unreachable";
    default:
      return severity;
  }
}

function scenarioLabel(scenario: SchemaDriftScenario): string {
  switch (scenario) {
    case "payment_split_drift_untracked":
      return "PaymentSplit drift (no migration history)";
    case "payment_split_drift":
      return "PaymentSplit drift";
    case "baseline_required":
      return "Baseline required (P3005)";
    case "pending_migrations":
      return "Pending migrations";
    case "schema_drift":
      return "Schema drift";
    case "ok":
      return "All checks passed";
    case "unconfigured":
      return "Database not configured";
    case "unreachable":
      return "Database unreachable";
    default:
      return scenario;
  }
}

function buildChecks(report: SchemaHealthReport): CheckRow[] {
  const blocking = report.severity === "blocking";

  return [
    {
      label: "Required Transaction columns",
      status:
        report.missingColumns.length === 0 ? "pass" : blocking ? "fail" : "warn",
      detail:
        report.missingColumns.length === 0
          ? "All required columns are present."
          : `Missing: ${report.missingColumns.join(", ")}`,
    },
    {
      label: "PaymentSplit enum values",
      status:
        report.missingPaymentSplitValues.length === 0
          ? "pass"
          : blocking
            ? "fail"
            : "warn",
      detail:
        report.missingPaymentSplitValues.length === 0
          ? "All required values are present."
          : `Missing: ${report.missingPaymentSplitValues.join(", ")}`,
    },
    {
      label: "TransactionStatus enum values",
      status:
        report.missingTransactionStatusValues.length === 0
          ? "pass"
          : blocking
            ? "fail"
            : "warn",
      detail:
        report.missingTransactionStatusValues.length === 0
          ? "All required values are present."
          : `Missing: ${report.missingTransactionStatusValues.join(", ")}`,
    },
    {
      label: "Migration history table",
      status:
        report.migrationTablePresent == null
          ? "unknown"
          : report.migrationTablePresent
            ? "pass"
            : "warn",
      detail:
        report.migrationTablePresent == null
          ? "Not checked."
          : report.migrationTablePresent
            ? "_prisma_migrations is present."
            : "_prisma_migrations is missing (baseline / P3005 path).",
    },
    {
      label: "Pending repository migrations",
      status: report.pendingMigrations.length === 0 ? "pass" : "warn",
      detail:
        report.pendingMigrations.length === 0
          ? "No pending migrations."
          : `Pending: ${report.pendingMigrations.join(", ")}`,
    },
  ];
}

function statusTone(status: CheckRow["status"]): string {
  switch (status) {
    case "pass":
      return "text-emerald-300";
    case "warn":
      return "text-amber-200";
    case "fail":
      return "text-rose-200";
    case "unknown":
      return "text-slate-200";
    default:
      return "text-muted";
  }
}

export function AdminSchemaHealthPanel({ report }: Props) {
  const checks = buildChecks(report);
  const blocking = report.severity === "blocking";
  const showPaymentSplitGuidance =
    report.scenario === "payment_split_drift" ||
    report.scenario === "payment_split_drift_untracked";

  return (
    <Card className="space-y-4 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Schema health</h2>
          <p className="mt-1 text-sm text-muted">
            Live preflight status for admin/runtime database compatibility.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={severityTone(report.severity)}>
            {severityLabel(report.severity)}
          </Badge>
          <Badge className="border-line bg-vault-panel/60 text-foreground">
            {scenarioLabel(report.scenario)}
          </Badge>
        </div>
      </div>

      <p className="text-sm text-foreground">{report.summary}</p>
      <p className="text-sm text-muted">{report.recoveryHint}</p>

      <p
        className={`rounded-lg border px-3 py-2 text-sm ${
          blocking
            ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
            : "border-line bg-vault-panel/60 text-muted"
        }`}
      >
        {blocking
          ? "Blocking drift is active. Admin pages stay available, but checkout and transaction APIs can fail until remediation is complete."
          : "Admin remains available. Address warnings to keep checkout and reporting reliable."}
      </p>

      {report.safeLocalRepair != null ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            report.safeLocalRepair
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100"
          }`}
        >
          {report.safeLocalRepair
            ? "Local repair path available: npm run db:push is acceptable on disposable local databases only."
            : "Do not use db push on this environment. Use baseline + npx prisma migrate deploy."}
        </p>
      ) : null}

      {showPaymentSplitGuidance ? (
        <div className="rounded-lg border border-line bg-vault-panel/40 px-3 py-3 text-sm text-muted">
          <p className="font-medium text-foreground">PaymentSplit operator paths</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Tracked DB (has _prisma_migrations):{" "}
              <code className="text-foreground">npx prisma migrate deploy</code>
            </li>
            <li>
              Untracked non-empty DB (P3005):{" "}
              <code className="text-foreground">npm run db:baseline:plan</code>{" "}
              then docs/runbooks/migration-baseline.md
            </li>
            <li>
              Local disposable DB only:{" "}
              <code className="text-foreground">npm run db:push</code>
            </li>
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Key checks</h3>
        <ul className="space-y-2">
          {checks.map((check) => (
            <li
              key={check.label}
              className="rounded-lg border border-line bg-vault-panel/40 px-3 py-2"
            >
              <p className={`text-sm font-medium ${statusTone(check.status)}`}>
                {check.label}
              </p>
              <p className="mt-1 text-xs text-muted">{check.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      {report.recommendedCommands.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Recommended commands
          </h3>
          <ul className="space-y-1 rounded-lg border border-line bg-vault-panel/40 px-3 py-2 font-mono text-xs text-foreground">
            {report.recommendedCommands.map((command) => (
              <li key={command}>{command}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.operatorRunbook.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Operator runbook
          </h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            {report.operatorRunbook.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {report.remediationSteps.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Remediation summary
          </h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            {report.remediationSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {report.detail ? (
        <p className="text-xs text-muted">Detail: {report.detail}</p>
      ) : null}
    </Card>
  );
}
