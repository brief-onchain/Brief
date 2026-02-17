import { NextResponse } from "next/server";

async function proxyToBackend(req: Request, suffix = ""): Promise<NextResponse> {
  try {
    const backendBase = String(process.env.BRIEF_BACKEND_URL || "http://127.0.0.1:8787").trim().replace(/\/$/, "");
    const url = `${backendBase}/api/agents${suffix}`;
    const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.text();
    const res = await fetch(url, {
      method: req.method,
      headers: { "content-type": req.headers.get("content-type") || "application/json" },
      body,
      cache: "no-store",
    });
    const raw = await res.text();
    return new NextResponse(raw, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "agents_proxy_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = u.search || "";
  return proxyToBackend(req, q);
}

export async function POST(req: Request) {
  return proxyToBackend(req);
}
