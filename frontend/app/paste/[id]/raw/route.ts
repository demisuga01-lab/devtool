import { NextRequest } from "next/server";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const password = request.nextUrl.searchParams.get("password");
  const apiUrl = new URL(`/api/paste/raw/${encodeURIComponent(id)}`, request.url);
  if (password) apiUrl.searchParams.set("password", password);

  const res = await fetch(apiUrl, { cache: "no-store" });
  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "text/plain; charset=utf-8",
    },
  });
}
