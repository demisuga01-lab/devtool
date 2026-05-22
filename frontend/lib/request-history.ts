export type RequestHistoryEntry = {
  tool: string;
  input: string;
  timestamp: string;
  summary: string;
};

export const REQUEST_HISTORY_KEY = "devtools:request-history";

export function saveRequestHistory(entry: Omit<RequestHistoryEntry, "timestamp">) {
  try {
    const raw = localStorage.getItem(REQUEST_HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const current = Array.isArray(parsed) ? parsed.filter(isRequestHistoryEntry) : [];
    const next = [{ ...entry, timestamp: new Date().toISOString() }, ...current].slice(0, 100);
    localStorage.setItem(REQUEST_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // localStorage can be blocked by browser privacy settings.
  }
}

export function loadRequestHistory(): RequestHistoryEntry[] {
  try {
    const raw = localStorage.getItem(REQUEST_HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter(isRequestHistoryEntry) : [];
  } catch {
    return [];
  }
}

function isRequestHistoryEntry(value: unknown): value is RequestHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.tool === "string" &&
    typeof record.input === "string" &&
    typeof record.timestamp === "string" &&
    typeof record.summary === "string"
  );
}

