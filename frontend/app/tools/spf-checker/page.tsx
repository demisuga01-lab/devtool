"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { ToolShell, Panel, ToolHeader } from "@/components/tool-ui";
import { Badge, Button, CodeBlock, CopyButton, ToolInput, Label } from "@/components/tool-ui";
import { apiGet } from "@/lib/api";
import { ERROR_MESSAGES, InlineError, LoadingSkeleton, errorFromUnknown, isValidDomain, normalizeDomain, type ToolError } from "@/lib/toolErrors";

type Result = {
  domain: string;
  spf: string[];
  dmarc: string[];
  dkim_selector: string;
  dkim: string[];
};

function badgeVariant(kind: "pass" | "warn" | "fail"): "success" | "warning" | "error" {
  if (kind === "pass") return "success";
  if (kind === "warn") return "warning";
  return "error";
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
    <Panel noPadding className="p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={status === "pass" ? "h-5 w-5 text-emerald-500" : status === "warn" ? "h-5 w-5 text-yellow-500" : "h-5 w-5 text-red-500"} />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        </div>
        <Badge variant={badgeVariant(status)}>{status === "pass" ? "Pass" : status === "warn" ? "Warning" : "Missing"}</Badge>
      </div>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{detail}</p>
      <div className="space-y-2">
        {records.length ? records.map((record) => (
          <CodeBlock key={record} value={record} />
        )) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No record found.</p>
        )}
      </div>
      {note && <p className="mt-3 text-xs text-zinc-500">{note}</p>}
    </Panel>
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
    <ToolShell>
      <ToolHeader breadcrumbs={[{ label: "Tools", href: "/tools" }, { label: "Web & Network" }, { label: "SPF Checker" }]} title="SPF Checker" description="Validate SPF, DKIM, and DMARC DNS records for a domain." />
      <div className="space-y-5">
        <Panel noPadding className="p-5">
          <Label>Domain</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ToolInput value={domain} onChange={(event) => setDomain(event.target.value)} onKeyDown={(event) => event.key === "Enter" && run()} placeholder="example.com" />
            <Button variant="primary" onClick={run} disabled={loading || !domain.trim()}>
              {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Checking...</> : "Check records"}
            </Button>
          </div>
          {error && <InlineError error={error} />}
        </Panel>

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
            <Panel noPadding className="p-5">
              <CopyButton value={[...result.spf, ...result.dmarc, ...result.dkim].join("\n")} label="Copy records" />
            </Panel>
          </>
        )}
      </div>
    </ToolShell>
  );
}
