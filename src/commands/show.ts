import { buildDetailUrl, extractWorkId, fetchHtml } from "../client.js";
import { printJobDetail, printJson } from "../format.js";
import { parseJobDetail } from "../parsers/detail.js";

export interface ShowCommandOptions {
  json?: boolean;
}

export async function runShow(
  workIdOrUrl: string,
  options: ShowCommandOptions,
): Promise<void> {
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

  if (options.json) {
    printJson(job);
    return;
  }

  printJobDetail(job);
}
