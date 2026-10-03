import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { getJobDetail, searchJobs } from "./services/jobs.js";

const workTypeSchema = z.enum(["project", "task", "competition", "job"]);
const sortSchema = z.enum([
  "started",
  "budget",
  "client",
  "deadlined",
  "proposal",
  "proposal_asc",
]);

function textResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
  };
}

function createServer() {
  const server = new McpServer({
    name: "lancers-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "search_jobs",
    {
      description:
        "Search public Lancers (ランサーズ) job listings. Returns jobs plus pageInfo (page, totalCount, hasNext, etc.).",
      inputSchema: {
        keyword: z.string().optional().describe("Search keyword"),
        page: z.number().int().min(1).optional().describe("Page number (default: 1)"),
        sort: sortSchema
          .optional()
          .describe("Sort order (default: started = newest)"),
        type: z
          .union([workTypeSchema, z.array(workTypeSchema)])
          .optional()
          .describe("Work type filter: project, task, competition, job"),
        category: z
          .string()
          .optional()
          .describe(
            "Category path, e.g. system or system/cloud_engineering",
          ),
        budgetFrom: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Minimum budget in yen"),
        budgetTo: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Maximum budget in yen"),
        withoutProposal: z
          .boolean()
          .optional()
          .describe("Only jobs with no proposals yet"),
      },
    },
    async (args) => {
      try {
        const types = args.type
          ? Array.isArray(args.type)
            ? args.type
            : [args.type]
          : undefined;

        const result = await searchJobs({
          keyword: args.keyword,
          page: args.page,
          sort: args.sort,
          types,
          category: args.category,
          budgetFrom: args.budgetFrom,
          budgetTo: args.budgetTo,
          noProposal: args.withoutProposal,
        });

        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "get_job_detail",
    {
      description:
        "Get details for a Lancers job by numeric work ID or detail URL (https://www.lancers.jp/work/detail/<id>).",
      inputSchema: {
        workIdOrUrl: z
          .string()
          .describe("Numeric work ID or Lancers work detail URL"),
      },
    },
    async ({ workIdOrUrl }) => {
      try {
        const job = await getJobDetail(workIdOrUrl);
        return textResult(job);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  return server;
}

const mcpHandler = createMcpHandler(createServer, {
  route: "/mcp",
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return Response.json({
        name: "lancers-mcp",
        version: "0.1.0",
        mcp: "/mcp",
        tools: ["search_jobs", "get_job_detail"],
      });
    }

    return mcpHandler(request, env, ctx);
  },
} satisfies ExportedHandler;
