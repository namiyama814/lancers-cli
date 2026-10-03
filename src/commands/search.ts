import { printJson, printSearchTable } from "../format.js";
import {
  assertSearchSort,
  assertWorkTypes,
  searchJobs,
} from "../services/jobs.js";
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

function parsePositiveInt(
  raw: string | undefined,
  label: string,
): number | undefined {
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
  return assertWorkTypes(types);
}

export async function runSearch(
  keyword: string | undefined,
  options: SearchCommandOptions,
): Promise<void> {
  const page = options.page ? Number(options.page) : 1;
  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Invalid --page value: ${options.page}`);
  }

  const sort = assertSearchSort((options.sort ?? "started") as SearchSort);
  const budgetFrom = parsePositiveInt(options.budgetFrom, "--budget-from");
  const budgetTo = parsePositiveInt(options.budgetTo, "--budget-to");
  const types = parseTypes(options.type);

  const result = await searchJobs({
    keyword,
    page,
    sort,
    types,
    category: options.category,
    budgetFrom,
    budgetTo,
    noProposal: options.withoutProposal,
  });

  if (options.json) {
    printJson(result);
    return;
  }

  printSearchTable(result);
}
