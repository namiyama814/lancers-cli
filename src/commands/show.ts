import { printJobDetail, printJson } from "../format.js";
import { getJobDetail } from "../services/jobs.js";

export interface ShowCommandOptions {
  json?: boolean;
}

export async function runShow(
  workIdOrUrl: string,
  options: ShowCommandOptions,
): Promise<void> {
  const job = await getJobDetail(workIdOrUrl);

  if (options.json) {
    printJson(job);
    return;
  }

  printJobDetail(job);
}
