import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const backendBase = String(process.env.BRIEF_BACKEND_URL || "http://127.0.0.1:8787").trim().replace(/\/$/, "");
    const body = await req.text();
    const res = await fetch(`${backendBase}/api/brief`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    });
    const raw = await res.text();
    const ct = res.headers.get("content-type") || "application/json";
    return new NextResponse(raw, {
      status: res.status,
      headers: { "content-type": ct },
    });
  } catch (e) {
    const msg = e instanceof Error && e.message ? e.message : "brief_proxy_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

