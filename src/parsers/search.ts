import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { BASE_URL } from "../client.js";
import type { JobSummary, SearchPageInfo } from "../types.js";

function parseYenNumbers(text: string): number[] {
  return [...text.matchAll(/([0-9][0-9,]*)\s*円/g)]
    .map((match) => Number(match[1]!.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));
}

function parseBudgetNumbers(
  $: cheerio.CheerioAPI,
  priceEl: cheerio.Cheerio<Element>,
): { min: number | null; max: number | null; text: string } {
  const text = priceEl.text().replace(/\s+/g, " ").trim();
  const fromSpans = priceEl
    .find(".p-search-job-media__number")
    .map((_, el) => {
      const raw = $(el).text().replace(/,/g, "").trim();
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    })
    .get()
    .filter((n): n is number => n !== null);
  const numbers = fromSpans.length > 0 ? fromSpans : parseYenNumbers(text);
  const hasOpenRange = /円\s*~\s*$/.test(text) || /円\s*~\s*\/\s*/.test(text);

  return {
    min: numbers[0] ?? null,
    max: numbers[1] ?? (hasOpenRange ? null : (numbers[0] ?? null)),
    text,
  };
}

function parseLabeledCount(
  $: cheerio.CheerioAPI,
  $card: cheerio.Cheerio<Element>,
  label: string,
): number | null {
  let found: number | null = null;

  $card.find(".p-search-job-media__propose").each((_, el) => {
    if (found != null) return;
    const $el = $(el);
    if (!$el.text().includes(label)) return;
    const raw = $el
      .find(".p-search-job-media__propose-number")
      .first()
      .text()
      .replace(/,/g, "")
      .trim();
    const value = Number(raw);
    if (Number.isFinite(value)) found = value;
  });

  return found;
}

function extractJobId(href: string): string {
  const detail = href.match(/\/work\/detail\/(\d+)/);
  if (detail?.[1]) return detail[1];

  try {
    const url = new URL(href, BASE_URL);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) return last;
  } catch {
    // ignore
  }

  return href;
}

function extractTitle(titleEl: cheerio.Cheerio<Element>): string {
  const clone = titleEl.clone();
  clone.find(".p-search-job-media__tags, ul, .c-badge").remove();
  return clone.text().trim().replace(/\s+/g, " ");
}

export function parseSearchResults(html: string): JobSummary[] {
  const $ = cheerio.load(html);
  const jobs: JobSummary[] = [];
  const seen = new Set<string>();

  $(".c-media.c-media--item, .c-media--item").each((_, card) => {
    const $card = $(card);

    const statusText = $card
      .find(".p-search-job-media__time-text")
      .text()
      .trim();
    if (statusText === "募集終了") return;

    const titleEl = $card.find("a.p-search-job-media__title");
    if (titleEl.length === 0) return;

    const title = extractTitle(titleEl);
    const href = titleEl.attr("href");
    if (!title || !href) return;

    const id = extractJobId(href);
    if (seen.has(id)) return;
    seen.add(id);

    const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    const budget = parseBudgetNumbers(
      $,
      $card.find(".p-search-job-media__price"),
    );

    const workType =
      $card.find(".c-badge__text").first().text().trim() || undefined;
    const category =
      $card.find(".p-search-job__division-link").first().text().trim() ||
      undefined;

    jobs.push({
      id,
      title,
      workType,
      category,
      budgetText: budget.text || undefined,
      budgetMin: budget.min,
      budgetMax: budget.max,
      winnerCount: parseLabeledCount($, $card, "当選者数"),
      recruitCount: parseLabeledCount($, $card, "募集人数"),
      url,
    });
  });

  return jobs;
}

function parseTotalCount($: cheerio.CheerioAPI): number | null {
  const heading = $("span.c-heading--lv4").filter((_, el) => {
    const siblingText = $(el).parent().text();
    return siblingText.includes("件の仕事が見つかりました");
  });

  const raw = heading.first().text().replace(/,/g, "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parsePager($: cheerio.CheerioAPI): {
  page: number | null;
  totalPages: number | null;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const pager = $(".c-pager").first();
  if (pager.length === 0) {
    return { page: null, totalPages: null, hasNext: false, hasPrev: false };
  }

  const pageNumbers: number[] = [];
  pager.find(".c-pager__main .c-pager__item a").each((_, el) => {
    const text = $(el).text().trim();
    if (/^\d+$/.test(text)) pageNumbers.push(Number(text));
  });

  const currentText = pager
    .find(
      ".c-pager__main .c-pager__item.current a, .c-pager__main .c-pager__item.current",
    )
    .first()
    .text()
    .trim();
  const page = /^\d+$/.test(currentText) ? Number(currentText) : null;
  const totalPages = pageNumbers.length > 0 ? Math.max(...pageNumbers) : page;

  const hasNext =
    pager.find(".c-pager__item--next a").length > 0 ||
    pager.find("a").toArray().some((el) => $(el).text().trim() === "次へ");
  const hasPrev =
    pager.find(".c-pager__item--prev a").length > 0 ||
    pager.find("a").toArray().some((el) => {
      const text = $(el).text().trim();
      return text === "戻る" || text === "前へ";
    });

  return { page, totalPages, hasNext, hasPrev };
}

export function parseSearchPageInfo(
  html: string,
  requestedPage: number,
  resultCount: number,
): SearchPageInfo {
  const $ = cheerio.load(html);
  const totalCount = parseTotalCount($);
  const pager = parsePager($);
  const sitePageSize = $(".c-media--item a.p-search-job-media__title").length;

  const page = pager.page ?? requestedPage;
  let totalPages: number | null = null;
  const divisor =
    sitePageSize > 0 ? sitePageSize : resultCount > 0 ? resultCount : 0;

  if (!pager.hasNext) {
    totalPages = page;
  } else if (totalCount != null && divisor > 0) {
    totalPages = Math.max(page + 1, Math.ceil(totalCount / divisor));
  } else if (pager.totalPages != null) {
    totalPages = Math.max(pager.totalPages, page + 1);
  }

  if (resultCount === 0 && totalCount === 0) {
    totalPages = 0;
  }

  return {
    page,
    pageSize: resultCount,
    totalCount,
    totalPages,
    hasNext: pager.hasNext,
    hasPrev: pager.hasPrev || page > 1,
  };
}
