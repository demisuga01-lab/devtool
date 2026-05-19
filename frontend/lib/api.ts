export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export type ApiError = { detail: string };

export async function apiGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}${path}?${qs}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data && typeof (data as ApiError).detail === "string"
        ? (data as ApiError).detail
        : `Request failed with status ${res.status}`;
    throw new Error(detail);
  }
  return data as T;
}
