import { API_BASE, ApiError } from "./api";

export type ExpiresIn = "never" | "1h" | "6h" | "24h" | "7d" | "30d";

export type PasteCreatePayload = {
  content: string;
  language: string;
  title?: string;
  password?: string;
  burn_after_read?: boolean;
  view_limit?: number | null;
  expires_in?: ExpiresIn;
  is_private?: boolean;
  tags?: string[];
  collection_id?: string | null;
  workspace_id?: string | null;
  workspace_password?: string;
};

export type PasteCreateResult = {
  id: string;
  delete_token: string;
  url: string;
};

export type PasteResult = {
  id: string;
  content?: string;
  language: string;
  title: string;
  burn_after_read: boolean;
  expires_at: string | null;
  created_at: string;
  view_count: number;
  view_limit: number | null;
  is_private: boolean;
  tags: string[];
  collection_id: string | null;
  workspace_id: string | null;
};

export class PasteApiError extends Error {
  status: number;
  protected: boolean;

  constructor(message: string, status: number, isProtected = false) {
    super(message);
    this.name = "PasteApiError";
    this.status = status;
    this.protected = isProtected;
  }
}

async function parseError(res: Response): Promise<PasteApiError> {
  const data: unknown = await res.json().catch(() => ({}));
  if (data && typeof data === "object") {
    const maybe = data as ApiError & { protected?: boolean };
    if (typeof maybe.detail === "string") {
      return new PasteApiError(maybe.detail, res.status, maybe.protected === true);
    }
  }
  return new PasteApiError(`Request failed with status ${res.status}`, res.status);
}

export async function createPaste(payload: PasteCreatePayload): Promise<PasteCreateResult> {
  const res = await fetch(`${API_BASE}/paste`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as PasteCreateResult;
}

export async function getPaste(
  id: string,
  options: { password?: string; preview?: boolean } = {},
): Promise<PasteResult> {
  const params = new URLSearchParams();
  if (options.password) params.set("password", options.password);
  if (options.preview) params.set("preview", "true");
  const query = params.toString();
  const res = await fetch(`${API_BASE}/paste/${encodeURIComponent(id)}${query ? `?${query}` : ""}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as PasteResult;
}

export async function deletePaste(id: string, token: string): Promise<void> {
  const params = new URLSearchParams({ token });
  const res = await fetch(`${API_BASE}/paste/${encodeURIComponent(id)}?${params}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await parseError(res);
}
