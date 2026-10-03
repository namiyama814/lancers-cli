import { buildDetailUrl, buildSearchUrl, extractWorkId, fetchHtml } from "../client.js";
import { parseJobDetail } from "../parsers/detail.js";
import {
  parseSearchPageInfo,
  parseSearchResults,
} from "../parsers/search.js";
import type {
  JobDetail,
  SearchOptions,
  SearchResult,
  SearchSort,
  WorkType,
} from "../types.js";

const VALID_SORTS = new Set<SearchSort>([
  "started",
  "budget",
  "client",
  "deadlined",
  "proposal",
  "proposal_asc",
]);

const VALID_TYPES = new Set<WorkType>([
  "project",
  "task",
  "competition",
  "job",
]);

export function assertSearchSort(sort: string): SearchSort {
  if (!VALID_SORTS.has(sort as SearchSort)) {
    throw new Error(
      `Invalid sort: ${sort}. Use one of: ${[...VALID_SORTS].join(", ")}`,
    );
  }
  return sort as SearchSort;
}

export function assertWorkTypes(types: string[]): WorkType[] {
  for (const type of types) {
    if (!VALID_TYPES.has(type as WorkType)) {
      throw new Error(
        `Invalid type: ${type}. Use one of: ${[...VALID_TYPES].join(", ")}`,
      );
    }
  }
  return [...new Set(types)] as WorkType[];
}

export async function searchJobs(
  options: SearchOptions = {},
): Promise<SearchResult> {
  const page = options.page ?? 1;
  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Invalid page: ${options.page}`);
  }

  const sort = options.sort ?? "started";
  assertSearchSort(sort);

  if (
    options.budgetFrom != null &&
    options.budgetTo != null &&
    options.budgetFrom > options.budgetTo
  ) {
    throw new Error("budgetFrom must be less than or equal to budgetTo");
  }

  if (options.types) {
    assertWorkTypes(options.types);
  }

  const url = buildSearchUrl({
    keyword: options.keyword,
    page,
    sort,
    types: options.types,
    category: options.category,
    budgetFrom: options.budgetFrom,
    budgetTo: options.budgetTo,
    noProposal: options.noProposal,
  });

  const html = await fetchHtml(url);
  const jobs = parseSearchResults(html);
  const pageInfo = parseSearchPageInfo(html, page, jobs.length);

  return { jobs, pageInfo, url };
}

export async function getJobDetail(workIdOrUrl: string): Promise<JobDetail> {
  const workId = extractWorkId(workIdOrUrl);
  if (!workId) {
    throw new Error(
      `Invalid work id or URL: ${workIdOrUrl}. Expected a numeric id or https://www.lancers.jp/work/detail/<id>`,
    );
  }

  const url = buildDetailUrl(workId);
  const html = await fetchHtml(url);
  const job = parseJobDetail(html, workId);

  if (!job) {
    throw new Error(`Failed to parse job detail for ${workId}`);
  }

  return job;
}
