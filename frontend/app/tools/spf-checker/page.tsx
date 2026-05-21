"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { ToolShell } from "@/components/ToolShell";
import { Button, CopyButton, Input, Label } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { ERROR_MESSAGES, InlineError, LoadingSkeleton, errorFromUnknown, isValidDomain, normalizeDomain, type ToolError } from "@/lib/toolErrors";

type Result = {
  domain: string;
  spf: string[];
  dmarc: string[];
  dkim_selector: string;
  dkim: string[];
};

function badge(kind: "pass" | "warn" | "fail") {
  if (kind === "pass") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
  if (kind === "warn") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400";
  return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
}

function parseDmarc(records: string[]) {
  const record = records.find((item) => item.includes("v=DMARC1")) || "";
  const policy = record.match(/\bp=(none|quarantine|reject)\b/i)?.[1]?.toLowerCase() || "";
  return { record, policy };
}

function Section({
  title,
  status,
  detail,
  records,
  note,
}: {
  title: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  records: string[];
  note?: string;
}) {
  const Icon = status === "pass" ? CheckCircle2 : status === "warn" ? AlertTriangle : XCircle;
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={status === "pass" ? "h-5 w-5 text-emerald-500" : status === "warn" ? "h-5 w-5 text-yellow-500" : "h-5 w-5 text-red-500"} />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge(status)}`}>{status === "pass" ? "Pass" : status === "warn" ? "Warning" : "Missing"}</span>
      </div>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{detail}</p>
      <div className="space-y-2">
        {records.length ? records.map((record) => (
          <div key={record} className="break-all rounded-xl border border-zinc-100 bg-zinc-50 p-3 font-mono text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
            {record}
          </div>
        )) : (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">No record found.</div>
        )}
      </div>
      {note && <p className="mt-3 text-xs text-zinc-500">{note}</p>}
    </section>
  );
}

export default function SpfCheckerPage() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [loading, setLoading] = useState(false);

  const assessment = useMemo(() => {
    const spfRecord = result?.spf[0] || "";
    const spfValid = /^v=spf1\b/i.test(spfRecord) && /\b(?:[-~?+]all)\b/i.test(spfRecord);
    const dmarc = parseDmarc(result?.dmarc || []);
    const dmarcStatus = dmarc.policy === "reject" || dmarc.policy === "quarantine" ? "pass" : dmarc.policy === "none" ? "warn" : "fail";
    return {
      spfStatus: spfValid ? "pass" as const : spfRecord ? "warn" as const : "fail" as const,
      spfDetail: spfRecord ? (spfValid ? "SPF syntax looks valid and includes an all mechanism." : "SPF record exists but may be incomplete.") : "SPF tells receiving mail servers which senders may send mail for this domain.",
      dmarc,
      dmarcStatus: dmarcStatus as "pass" | "warn" | "fail",
    };
  }, [result]);

  const run = async () => {
    const normalized = normalizeDomain(domain);
    setDomain(normalized.domain);
    if (!isValidDomain(normalized.domain)) {
      setResult(null);
      setError(ERROR_MESSAGES.invalid_domain);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await apiGet<Result>("/tools/spf-checker", { domain: normalized.domain }));
    } catch (err) {
      setError(errorFromUnknown(err, "dns_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell slug="spf-checker">
      <div className="space-y-5">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Label>Domain</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input value={domain} onChange={(event) => setDomain(event.target.value)} onKeyDown={(event) => event.key === "Enter" && run()} placeholder="example.com" />
            <Button variant="primary" onClick={run} disabled={loading || !domain.trim()}>
              {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Checking...</> : "Check records"}
            </Button>
          </div>
          {error && <InlineError error={error} />}
        </section>

        {loading && <LoadingSkeleton />}

        {result && (
          <>
            <Section title="SPF" status={assessment.spfStatus} detail={assessment.spfDetail} records={result.spf} />
            <Section
              title="DMARC"
              status={assessment.dmarcStatus}
              detail={assessment.dmarc.record ? `Policy: ${assessment.dmarc.policy || "unknown"}` : "DMARC tells receivers how to handle mail that fails SPF or DKIM."}
              records={result.dmarc}
            />
            <Section
              title="DKIM"
              status={result.dkim.length ? "pass" : "warn"}
              detail={`Checked selector: ${result.dkim_selector}._domainkey.${result.domain}`}
              records={result.dkim}
              note="DKIM can use many selector names; this tool checks the common default selector."
            />
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <CopyButton value={[...result.spf, ...result.dmarc, ...result.dkim].join("\n")} label="Copy records" />
            </section>
          </>
        )}
      </div>
    </ToolShell>
  );
}
