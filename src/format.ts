import type { JobDetail, SearchResult, JobSummary } from "./types.js";

function pad(value: string, width: number): string {
  const visible = [...value];
  if (visible.length >= width) return visible.slice(0, width).join("");
  return value + " ".repeat(width - visible.length);
}

function truncate(value: string, max: number): string {
  const chars = [...value];
  if (chars.length <= max) return value;
  if (max <= 1) return "…";
  return `${chars.slice(0, max - 1).join("")}…`;
}

function formatBudget(job: JobSummary): string {
  if (job.budgetText) return job.budgetText.replace(/\s+/g, " ").trim();
  if (job.budgetMin != null && job.budgetMax != null) {
    if (job.budgetMin === job.budgetMax) {
      return `${job.budgetMin.toLocaleString("ja-JP")}円`;
    }
    return `${job.budgetMin.toLocaleString("ja-JP")}〜${job.budgetMax.toLocaleString("ja-JP")}円`;
  }
  if (job.budgetMin != null) {
    return `${job.budgetMin.toLocaleString("ja-JP")}円〜`;
  }
  return "-";
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function formatSlots(job: JobSummary): string {
  if (job.winnerCount == null && job.recruitCount == null) return "-";
  return `${job.winnerCount ?? "-"}/${job.recruitCount ?? "-"}`;
}

function formatPageSummary(result: SearchResult): string {
  const { pageInfo } = result;
  const total =
    pageInfo.totalCount != null
      ? pageInfo.totalCount.toLocaleString("ja-JP")
      : "?";
  const totalPages =
    pageInfo.totalPages != null ? String(pageInfo.totalPages) : "?";
  const parts = [
    `page ${pageInfo.page}/${totalPages}`,
    `${pageInfo.pageSize} on this page`,
    `${total} total`,
  ];
  if (pageInfo.hasNext) parts.push("next: yes");
  if (pageInfo.hasPrev) parts.push("prev: yes");
  return parts.join(" · ");
}

export function printSearchTable(result: SearchResult): void {
  const { jobs } = result;

  if (jobs.length === 0) {
    console.log("No jobs found.");
    console.log(formatPageSummary(result));
    return;
  }

  const headers = ["ID", "TYPE", "BUDGET", "SLOTS", "TITLE"];
  const rows = jobs.map((job) => [
    job.id,
    job.workType ?? "-",
    formatBudget(job),
    formatSlots(job),
    job.title,
  ]);

  const widths = headers.map((header, index) => {
    const maxCell = Math.max(...rows.map((row) => [...row[index]!].length));
    const cap = index === 0 ? 24 : index === 4 ? 56 : 18;
    return Math.min(Math.max([...header].length, maxCell), cap);
  });

  console.log(headers.map((h, i) => pad(h, widths[i]!)).join("  "));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));

  for (const row of rows) {
    console.log(
      row
        .map((cell, i) => pad(truncate(cell, widths[i]!), widths[i]!))
        .join("  "),
    );
  }

  console.log(`\n${formatPageSummary(result)}`);
}

export function printJobDetail(job: JobDetail): void {
  const lines = [
    `ID:          ${job.id}`,
    `Title:       ${job.title}`,
    `Industry:    ${job.industry ?? "-"}`,
    `Budget:      ${job.budgetText ?? "-"}`,
    `Period:      ${job.recruitmentPeriod ?? "-"}`,
    `Proposals:   ${job.proposalCount != null ? `${job.proposalCount}` : "-"}`,
    `URL:         ${job.url}`,
  ];

  console.log(lines.join("\n"));
  console.log("\nDescription:");
  console.log(job.description?.trim() || "-");
}
