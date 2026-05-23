"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, Loader2, Plus, Send, Trash2, X } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { authHeaders, clearAuth } from "@/lib/auth";
import { Button, ErrorCard, Input, Label, Select } from "@/components/ui";

type ChannelType = "email" | "discord" | "slack" | "telegram" | "webhook";

type AlertChannel = {
  id: string;
  name: string;
  channel_type: ChannelType;
  config_summary: Record<string, unknown>;
  is_active: boolean;
  created_at: string | null;
};

type AlertRule = {
  id: string;
  monitor_id: number;
  monitor_name: string | null;
  channel_id: string;
  channel_name: string | null;
  channel_type: ChannelType | null;
  on_down: boolean;
  on_recovery: boolean;
};

type AlertLog = {
  id: string;
  monitor_name: string | null;
  channel_name: string | null;
  channel_type: ChannelType | null;
  alert_type: string;
  message: string;
  sent_at: string | null;
  status: string;
  error: string | null;
};

type Monitor = {
  id: number;
  name: string;
  url: string;
  last_status: string;
};

const emptyConfig = {
  to_email: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_pass: "",
  webhook_url: "",
  bot_token: "",
  chat_id: "",
  url: "",
  secret_header_name: "",
  secret_header_value: "",
};

function parseError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string") return (data as { detail: string }).detail;
  return fallback;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function AlertsDashboardPage() {
  const [channels, setChannels] = useState<AlertChannel[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [channelForm, setChannelForm] = useState({
    name: "",
    channel_type: "discord" as ChannelType,
    config: emptyConfig,
  });
  const [ruleForm, setRuleForm] = useState({
    monitor_id: 0,
    channel_id: "",
    on_down: true,
    on_recovery: true,
  });

  const canAddRule = useMemo(() => monitors.length > 0 && channels.length > 0, [channels.length, monitors.length]);

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...authHeaders(),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (res.status === 401) {
      clearAuth();
      throw new Error("Session expired. Please sign in again.");
    }
    if (!res.ok) throw new Error(parseError(data, `Request failed with status ${res.status}`));
    return data as T;
  }

  async function loadData() {
    setLoading(true);
    try {
      const [channelData, ruleData, logData, monitorData] = await Promise.all([
        request<AlertChannel[]>("/alerts/channels"),
        request<AlertRule[]>("/alerts/rules"),
        request<AlertLog[]>("/alerts/logs"),
        request<Monitor[]>("/status/monitors"),
      ]);
      setChannels(channelData);
      setRules(ruleData);
      setLogs(logData);
      setMonitors(monitorData);
      setRuleForm((current) => ({
        ...current,
        monitor_id: current.monitor_id || monitorData[0]?.id || 0,
        channel_id: current.channel_id || channelData[0]?.id || "",
      }));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function updateConfig(key: keyof typeof emptyConfig, value: string) {
    setChannelForm((current) => ({ ...current, config: { ...current.config, [key]: value } }));
  }

  async function createChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const config = configForType(channelForm.channel_type, channelForm.config);
      await request("/alerts/channels", {
        method: "POST",
        body: JSON.stringify({ name: channelForm.name, channel_type: channelForm.channel_type, config, is_active: true }),
      });
      setModalOpen(false);
      setChannelForm({ name: "", channel_type: "discord", config: emptyConfig });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create channel.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteChannel(id: string) {
    await request(`/alerts/channels/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadData();
  }

  async function testChannel(id: string) {
    setTestingId(id);
    setError("");
    try {
      await request(`/alerts/test/${encodeURIComponent(id)}`, { method: "POST" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test alert failed.");
      await loadData();
    } finally {
      setTestingId("");
    }
  }

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await request("/alerts/rules", { method: "POST", body: JSON.stringify(ruleForm) });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create alert rule.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(id: string) {
    await request(`/alerts/rules/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadData();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Alert Routing</h1>
          <p className="mt-1 text-sm text-zinc-500">Route monitor down and recovery events to email, chat, and webhooks.</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" />Add channel</Button>
      </header>

      {error && <ErrorCard>{error}</ErrorCard>}

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading alert routing
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Alert channels</h2>
              <span className="text-sm text-zinc-500">{channels.length} configured</span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {channels.map((channel) => (
                <div key={channel.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{channel.name}</span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs capitalize text-zinc-500 dark:bg-zinc-800">{channel.channel_type}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${channel.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-zinc-100 text-zinc-500"}`}>{channel.is_active ? "Active" : "Inactive"}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">{Object.entries(channel.config_summary || {}).map(([key, value]) => `${key}: ${String(value || "-")}`).join(" | ")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => void testChannel(channel.id)} disabled={testingId === channel.id}>
                      {testingId === channel.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Test
                    </Button>
                    <Button variant="danger" onClick={() => void deleteChannel(channel.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {!channels.length && <div className="p-8 text-center text-sm text-zinc-500">No alert channels configured.</div>}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">Alert rules</h2>
            <form onSubmit={createRule} className="mb-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto_auto] lg:items-end">
              <div>
                <Label>Monitor</Label>
                <Select value={ruleForm.monitor_id} onChange={(event) => setRuleForm({ ...ruleForm, monitor_id: Number(event.target.value) })} className="w-full">
                  {monitors.map((monitor) => <option key={monitor.id} value={monitor.id}>{monitor.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={ruleForm.channel_id} onChange={(event) => setRuleForm({ ...ruleForm, channel_id: event.target.value })} className="w-full">
                  {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}
                </Select>
              </div>
              <Toggle checked={ruleForm.on_down} onChange={(value) => setRuleForm({ ...ruleForm, on_down: value })} label="On Down" />
              <Toggle checked={ruleForm.on_recovery} onChange={(value) => setRuleForm({ ...ruleForm, on_recovery: value })} label="On Recovery" />
              <Button variant="primary" disabled={!canAddRule || saving}>Add rule</Button>
            </form>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
                  <tr>
                    <th className="px-4 py-3">Monitor</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Down</th>
                    <th className="px-4 py-3">Recovery</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-4 py-3">{rule.monitor_name}</td>
                      <td className="px-4 py-3">{rule.channel_name} <span className="text-xs text-zinc-500">({rule.channel_type})</span></td>
                      <td className="px-4 py-3">{rule.on_down ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{rule.on_recovery ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-right"><Button variant="danger" onClick={() => void deleteRule(rule.id)}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                  {!rules.length && <tr><td className="px-4 py-6 text-center text-zinc-500" colSpan={5}>No alert rules yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Recent alerts</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {logs.map((log) => (
                <div key={log.id} className="grid gap-2 p-4 text-sm lg:grid-cols-[180px_1fr_180px_120px]">
                  <div className="text-zinc-500">{formatDate(log.sent_at)}</div>
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{log.message}</div>
                    {log.error && <div className="mt-1 text-xs text-red-500">{log.error}</div>}
                  </div>
                  <div className="text-zinc-500">{log.monitor_name || "Test"} {"->"} {log.channel_name || "Channel"}</div>
                  <div className={`capitalize ${log.status === "sent" ? "text-emerald-600" : "text-red-500"}`}>{log.alert_type} / {log.status}</div>
                </div>
              ))}
              {!logs.length && <div className="p-8 text-center text-sm text-zinc-500">No alerts sent yet.</div>}
            </div>
          </section>
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <form onSubmit={createChannel} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100"><Bell className="h-5 w-5 text-emerald-600" />Add alert channel</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input value={channelForm.name} onChange={(event) => setChannelForm({ ...channelForm, name: event.target.value })} required />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={channelForm.channel_type} onChange={(event) => setChannelForm({ ...channelForm, channel_type: event.target.value as ChannelType })} className="w-full">
                  <option value="discord">Discord</option>
                  <option value="slack">Slack</option>
                  <option value="telegram">Telegram</option>
                  <option value="webhook">Webhook</option>
                  <option value="email">Email</option>
                </Select>
              </div>
            </div>
            <ChannelFields type={channelForm.channel_type} config={channelForm.config} onChange={updateConfig} />
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" disabled={saving || !channelForm.name.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Save channel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function configForType(type: ChannelType, config: typeof emptyConfig): Record<string, string> {
  if (type === "email") {
    return {
      to_email: config.to_email,
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      smtp_user: config.smtp_user,
      smtp_pass: config.smtp_pass,
    };
  }
  if (type === "telegram") return { bot_token: config.bot_token, chat_id: config.chat_id };
  if (type === "webhook") return { url: config.url, secret_header_name: config.secret_header_name, secret_header_value: config.secret_header_value };
  return { webhook_url: config.webhook_url };
}

function ChannelFields({ type, config, onChange }: { type: ChannelType; config: typeof emptyConfig; onChange: (key: keyof typeof emptyConfig, value: string) => void }) {
  if (type === "email") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="To email" value={config.to_email} onChange={(value) => onChange("to_email", value)} />
        <Field label="SMTP host" value={config.smtp_host} onChange={(value) => onChange("smtp_host", value)} />
        <Field label="SMTP port" value={config.smtp_port} onChange={(value) => onChange("smtp_port", value)} />
        <Field label="SMTP user" value={config.smtp_user} onChange={(value) => onChange("smtp_user", value)} />
        <Field label="SMTP password" value={config.smtp_pass} onChange={(value) => onChange("smtp_pass", value)} type="password" />
      </div>
    );
  }
  if (type === "telegram") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Bot token" value={config.bot_token} onChange={(value) => onChange("bot_token", value)} type="password" />
        <Field label="Chat ID" value={config.chat_id} onChange={(value) => onChange("chat_id", value)} />
      </div>
    );
  }
  if (type === "webhook") {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Webhook URL" value={config.url} onChange={(value) => onChange("url", value)} className="sm:col-span-2" />
        <Field label="Secret header name" value={config.secret_header_name} onChange={(value) => onChange("secret_header_name", value)} />
        <Field label="Secret header value" value={config.secret_header_value} onChange={(value) => onChange("secret_header_value", value)} type="password" />
      </div>
    );
  }
  return (
    <div className="mt-4">
      <Field label={`${type === "discord" ? "Discord" : "Slack"} webhook URL`} value={config.webhook_url} onChange={(value) => onChange("webhook_url", value)} />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} required />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-500" />
      {label}
    </label>
  );
}
