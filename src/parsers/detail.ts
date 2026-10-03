import * as cheerio from "cheerio";
import { BASE_URL } from "../client.js";
import type { JobDetail } from "../types.js";

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*\[.*?\]\s*$/u, "")
    .replace(/の仕事$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function definitionValue(
  $: cheerio.CheerioAPI,
  term: string,
): string | undefined {
  let value: string | undefined;

  $("dl.c-definition-list").each((_, dl) => {
    if (value) return;
    const $dl = $(dl);
    const termText = $dl.find("dt.c-definition-list__term").text().trim();
    if (!termText.includes(term)) return;

    const description = $dl
      .find("dd.c-definition-list__description")
      .html();
    if (!description) return;

    value = description
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  });

  return value;
}

function extractMetaNearLabel(
  $: cheerio.CheerioAPI,
  label: string,
): string | undefined {
  const root = $(".p-work-detail-client").first();
  const text = root.text().replace(/\s+/g, " ");
  const match = text.match(new RegExp(`${label}\\s*([^\\s].{0,40}?)(?=提案数|当選人数|見積もり|この案件|$)`));
  if (!match) return undefined;
  return match[1]?.trim();
}

function extractProposalCount($: cheerio.CheerioAPI): number | null {
  const root = $(".p-work-detail-client").first();
  const text = root.text().replace(/\s+/g, " ");
  const match = text.match(/提案数\s*([0-9,]+)\s*件/);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

export function parseJobDetail(html: string, workId: string): JobDetail | null {
  const $ = cheerio.load(html);

  const titleRaw = $("h1.c-heading--lv1")
    .first()
    .clone()
    .children()
    .remove()
    .end()
    .text()
    .replace(/\s+/g, " ")
    .trim();

  if (!titleRaw) return null;

  const industry = definitionValue($, "依頼主の業種");
  const budgetText = definitionValue($, "提示した予算");
  const description = definitionValue($, "依頼概要");
  const recruitmentPeriod =
    extractMetaNearLabel($, "募集期間") ?? undefined;
  const proposalCount = extractProposalCount($);

  return {
    id: workId,
    title: cleanTitle(titleRaw),
    industry,
    budgetText,
    recruitmentPeriod,
    proposalCount,
    description,
    url: `${BASE_URL}/work/detail/${workId}`,
  };
}
