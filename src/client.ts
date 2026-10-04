import type { SearchOptions } from "./types.js";

const BASE_URL = "https://www.lancers.jp";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
};

export class LancersHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = "LancersHttpError";
  }
}

export async function fetchHtml(pathOrUrl: string): Promise<string> {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${BASE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;

  const response = await fetch(url, { headers: DEFAULT_HEADERS });

  if (!response.ok) {
    console.warn("Lancers upstream HTTP error", {
      method: "GET",
      path: new URL(url).pathname,
      status: response.status,
      server: response.headers.get("server"),
      cfRay: response.headers.get("cf-ray"),
      allow: response.headers.get("allow"),
    });
    throw new LancersHttpError(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
      response.status,
      url,
    );
  }

  return response.text();
}

function normalizeCategoryPath(category?: string): string {
  if (!category) return "/work/search";
  const cleaned = category
    .trim()
    .replace(/^\/+/, "")
    .replace(/^work\/search\/?/i, "")
    .replace(/\/+$/, "");
  return cleaned ? `/work/search/${cleaned}` : "/work/search";
}

export function buildSearchUrl(params: SearchOptions): string {
  const path = normalizeCategoryPath(params.category);
  const search = new URLSearchParams();

  if (params.keyword) search.set("keyword", params.keyword);
  if (params.sort) search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.budgetFrom != null) {
    search.set("budget_from", String(params.budgetFrom));
  }
  if (params.budgetTo != null) {
    search.set("budget_to", String(params.budgetTo));
  }
  if (params.noProposal) search.set("no_proposal", "1");

  for (const type of params.types ?? []) {
    search.append("type[]", type);
  }

  const query = search.toString();
  return `${BASE_URL}${path}${query ? `?${query}` : ""}`;
}

export function buildDetailUrl(workId: string): string {
  return `${BASE_URL}/work/detail/${workId}`;
}

export function extractWorkId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/work\/detail\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    const match = trimmed.match(/\/work\/detail\/(\d+)/);
    return match?.[1] ?? null;
  }
}

export { BASE_URL };
