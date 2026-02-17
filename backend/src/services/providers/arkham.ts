export type ArkhamAddressEnrichedLite = {
  address: string;
  chain?: string;
  entityName?: string;
  entityType?: string;
  labelName?: string;
  tags: string[];
  isUserAddress?: boolean;
  source: "api";
};

function envStr(key: string): string {
  return String(process.env[key] || "").trim();
}

function withTimeoutSignal(ms: number): AbortSignal {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

function parseTagList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x === "string") return x;
      if (!x || typeof x !== "object") return "";
      const rec = x as Record<string, unknown>;
      return String(rec.label || rec.tag || rec.tagParams || "").trim();
    })
    .filter(Boolean)
    .slice(0, 24);
}

export async function fetchArkhamAddressEnrichedLite(address: string): Promise<ArkhamAddressEnrichedLite | null> {
  const key = envStr("ARKM_API_KEY") || envStr("ARKHAM_API_KEY");
  if (!key) return null;

  const base = envStr("ARKHAM_BASE") || "https://api.arkm.com";
  const url = `${base.replace(/\/$/, "")}/intelligence/address_enriched/${encodeURIComponent(address)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "API-Key": key,
    },
    cache: "no-store",
    signal: withTimeoutSignal(3200),
  }).catch(() => null);
  if (!res?.ok) return null;

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json || typeof json !== "object") return null;

  const entity = (json.arkhamEntity as Record<string, unknown> | undefined) || undefined;
  const label = (json.arkhamLabel as Record<string, unknown> | undefined) || undefined;
  const tags = parseTagList(json.populatedTags);

  return {
    address: String(json.address || address).toLowerCase(),
    chain: typeof json.chain === "string" ? json.chain : undefined,
    entityName: typeof entity?.name === "string" ? entity.name : undefined,
    entityType: typeof entity?.type === "string" ? String(entity.type).toLowerCase() : undefined,
    labelName: typeof label?.name === "string" ? label.name : undefined,
    tags,
    isUserAddress: typeof json.isUserAddress === "boolean" ? json.isUserAddress : undefined,
    source: "api",
  };
}
