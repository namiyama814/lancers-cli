import { buildSearchUrl, fetchHtml } from "../client.js";
import { printJson, printSearchTable } from "../format.js";
import {
  parseSearchPageInfo,
  parseSearchResults,
} from "../parsers/search.js";
import type { SearchSort, WorkType } from "../types.js";

export interface SearchCommandOptions {
  page?: string;
  sort?: string;
  json?: boolean;
  type?: string[];
  category?: string;
  budgetFrom?: string;
  budgetTo?: string;
  withoutProposal?: boolean;
}

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

function parsePositiveInt(raw: string | undefined, label: string): number | undefined {
  if (raw == null || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid ${label} value: ${raw}`);
  }
  return value;
}

function parseTypes(raw: string[] | undefined): WorkType[] | undefined {
  if (!raw || raw.length === 0) return undefined;
  const types = raw
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  for (const type of types) {
    if (!VALID_TYPES.has(type as WorkType)) {
      throw new Error(
        `Invalid --type value: ${type}. Use one of: ${[...VALID_TYPES].join(", ")}`,
      );
    }
  }

  return [...new Set(types)] as WorkType[];
}

export async function runSearch(
  keyword: string | undefined,
  options: SearchCommandOptions,
): Promise<void> {
  const page = options.page ? Number(options.page) : 1;
  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Invalid --page value: ${options.page}`);
  }

  const sort = (options.sort ?? "started") as SearchSort;
  if (!VALID_SORTS.has(sort)) {
    throw new Error(
      `Invalid --sort value: ${options.sort}. Use one of: ${[...VALID_SORTS].join(", ")}`,
    );
  }

  const budgetFrom = parsePositiveInt(options.budgetFrom, "--budget-from");
  const budgetTo = parsePositiveInt(options.budgetTo, "--budget-to");
  if (
    budgetFrom != null &&
    budgetTo != null &&
    budgetFrom > budgetTo
  ) {
    throw new Error("--budget-from must be less than or equal to --budget-to");
  }

  const types = parseTypes(options.type);
  const url = buildSearchUrl({
    keyword,
    page,
    sort,
    types,
    category: options.category,
    budgetFrom,
    budgetTo,
    noProposal: options.withoutProposal,
  });

  const html = await fetchHtml(url);
  const jobs = parseSearchResults(html);
  const pageInfo = parseSearchPageInfo(html, page, jobs.length);
  const result = { jobs, pageInfo, url };

  if (options.json) {
    printJson(result);
    return;
  }

  printSearchTable(result);
}
