#!/usr/bin/env node
import { Command } from "commander";
import { runSearch } from "./commands/search.js";
import { runShow } from "./commands/show.js";

const program = new Command();

program
  .name("lancers")
  .description("CLI for searching and viewing Lancers job listings")
  .version("0.1.0");

program
  .command("search")
  .description("Search public Lancers job listings")
  .argument("[keyword]", "Search keyword")
  .option("-p, --page <number>", "Page number", "1")
  .option(
    "-s, --sort <sort>",
    "Sort order: started, budget, client, deadlined, proposal, proposal_asc",
    "started",
  )
  .option(
    "-t, --type <type>",
    "Work type filter (project, task, competition, job). Repeatable or comma-separated",
    (value: string, previous: string[] = []) => previous.concat([value]),
    [] as string[],
  )
  .option(
    "-c, --category <path>",
    "Category path, e.g. system or system/cloud_engineering",
  )
  .option("--budget-from <yen>", "Minimum budget (yen)")
  .option("--budget-to <yen>", "Maximum budget (yen)")
  .option("--without-proposal", "Only jobs with no proposals yet")
  .option("--json", "Output as JSON")
  .action(async (keyword: string | undefined, options) => {
    await runSearch(keyword, options);
  });

program
  .command("show")
  .description("Show details for a Lancers job")
  .argument("<workIdOrUrl>", "Work ID or detail URL")
  .option("--json", "Output as JSON")
  .action(async (workIdOrUrl: string, options) => {
    await runShow(workIdOrUrl, options);
  });

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}

void main();
