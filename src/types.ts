export type SearchSort =
  | "started"
  | "budget"
  | "client"
  | "deadlined"
  | "proposal"
  | "proposal_asc";

export type WorkType = "project" | "task" | "competition" | "job";

export interface SearchOptions {
  keyword?: string;
  page?: number;
  sort?: SearchSort;
  types?: WorkType[];
  category?: string;
  budgetFrom?: number;
  budgetTo?: number;
  noProposal?: boolean;
}

export interface JobSummary {
  id: string;
  title: string;
  workType?: string;
  category?: string;
  budgetText?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  winnerCount?: number | null;
  recruitCount?: number | null;
  url: string;
}

export interface SearchPageInfo {
  page: number;
  pageSize: number;
  totalCount: number | null;
  totalPages: number | null;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchResult {
  jobs: JobSummary[];
  pageInfo: SearchPageInfo;
  url: string;
}

export interface JobDetail {
  id: string;
  title: string;
  industry?: string;
  budgetText?: string;
  recruitmentPeriod?: string;
  proposalCount?: number | null;
  description?: string;
  url: string;
}
