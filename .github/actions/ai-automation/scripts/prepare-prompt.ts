#!/usr/bin/env bun

/**
 * Extracts PR data from a pull request and substitutes variables
 * in the prompt template. Works with PRs in any state (OPEN, MERGED, CLOSED).
 */

import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";
import { execFileSync } from "child_process";
import { substituteVariables, parseRepository, getApiUrl } from "./utils.ts";

// GraphQL query for PR data
const PR_QUERY = `
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        title
        body
        author {
          login
        }
        baseRefName
        headRefName
        headRefOid
        createdAt
        updatedAt
        lastEditedAt
        additions
        deletions
        state
        commits(first: 100) {
          totalCount
          nodes {
            commit {
              oid
              message
              author {
                name
                email
              }
            }
          }
        }
        files(first: 100) {
          nodes {
            path
            additions
            deletions
            changeType
          }
        }
      }
    }
  }
`;

type PullRequestQueryResponse = {
  repository: {
    pullRequest: {
      title: string;
      body: string;
      author: {
        login: string;
      } | null;
      baseRefName: string;
      headRefName: string;
      headRefOid: string;
      createdAt: string;
      updatedAt: string | null;
      lastEditedAt: string | null;
      additions: number;
      deletions: number;
      state: string;
      commits: {
        totalCount: number;
        nodes: Array<{
          commit: {
            oid: string;
            message: string;
            author: {
              name: string;
              email: string;
            };
          };
        }>;
      };
      files: {
        nodes: Array<{
          path: string;
          additions: number;
          deletions: number;
          changeType: string;
        }>;
      };
    } | null;
  };
};

function createOctokit(token: string) {
  const apiUrl = getApiUrl();
  // For GitHub Enterprise Server, replace /api/v3 with /api to get the correct GraphQL endpoint
  // For GitHub.com, the URL doesn't contain /api/v3, so it remains unchanged
  const graphqlBaseUrl = apiUrl.replace("/api/v3", "/api");
  return {
    rest: new Octokit({
      auth: token,
      baseUrl: apiUrl,
    }),
    graphql: graphql.defaults({
      baseUrl: graphqlBaseUrl,
      headers: {
        authorization: `token ${token}`,
      },
    }),
  };
}

interface PRData {
  title: string;
  number: number;
  author: string;
  body: string;
  baseBranch: string;
  headRef: string;
  baseRef: string;
  changedFiles: string[];
  diff: string;
}


/**
 * Fetches PR data using GitHub GraphQL API
 */
async function fetchPRData(
  octokit: ReturnType<typeof createOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRData> {
  const result = await octokit.graphql<PullRequestQueryResponse>(PR_QUERY, {
    owner,
    repo,
    number: prNumber,
  });

  const pr = result.repository.pullRequest;
  if (!pr) {
    throw new Error(`PR #${prNumber} not found`);
  }

  const changedFiles = pr.files?.nodes?.map((file) => file.path) || [];

  // Get the diff using git
  let diff = "";
  try {
    const baseRef = pr.baseRefName;
    const headRef = pr.headRefOid;

    // Fetch the base branch (the commit SHA is already available due to fetch-depth: 0)
    execFileSync("git", ["fetch", "origin", baseRef], {
      stdio: "pipe",
    });
    const diffOutput = execFileSync(
      "git",
      ["diff", `origin/${baseRef}`, headRef],
      { encoding: "utf-8" },
    );
    diff = diffOutput;
  } catch (error) {
    console.error("Error fetching diff:", error);
    diff = `[Unable to fetch diff: ${error instanceof Error ? error.message : String(error)}]`;
  }

  return {
    title: pr.title || "",
    number: prNumber,
    author: pr.author?.login || "unknown",
    body: pr.body || "",
    baseBranch: pr.baseRefName,
    headRef: pr.headRefOid,
    baseRef: pr.baseRefName,
    changedFiles,
    diff,
  };
}

/**
 * Substitutes variables in the prompt template
 */
function substitutePromptVariables(template: string, data: PRData): string {
  const variables: Record<string, string> = {
    PR_DIFF: data.diff,
    PR_TITLE: data.title,
    PR_NUMBER: String(data.number),
    PR_AUTHOR: data.author,
    PR_BODY: data.body,
    CHANGED_FILES: data.changedFiles.join("\n"),
    REPOSITORY: process.env.REPOSITORY || "",
    BASE_BRANCH: data.baseBranch,
  };

  return substituteVariables(template, variables);
}

/**
 * Embeds plan into implementation prompt template
 */
function embedPlan(prompt: string, plan: string): string {
  if (!plan || plan.trim().length === 0) {
    return prompt;
  }

  return `Based on this plan:
<plan>
${plan}
</plan>

${prompt}`;
}

async function main() {
  try {
    const promptTemplate = process.env.PROMPT_TEMPLATE;
    if (!promptTemplate) {
      throw new Error("PROMPT_TEMPLATE environment variable is required");
    }

    const prNumber = parseInt(process.env.PR_NUMBER || "");
    if (!prNumber || isNaN(prNumber)) {
      throw new Error(
        "PR_NUMBER environment variable is required and must be a number",
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }

    const repository = process.env.REPOSITORY || "";
    if (!repository) {
      throw new Error("REPOSITORY environment variable is required");
    }

    const { owner, repo } = parseRepository(repository);

    // Determine base branch
    let baseBranch = process.env.BASE_BRANCH || "";
    if (!baseBranch) {
      // Fetch default branch from repository
      const octokit = createOctokit(githubToken);
      const { data } = await octokit.rest.repos.get({ owner, repo });
      baseBranch = data.default_branch;
    }

    // Fetch PR data
    const octokit = createOctokit(githubToken);
    const prData = await fetchPRData(octokit, owner, repo, prNumber);

    // Substitute variables in prompt
    let finalPrompt = substitutePromptVariables(promptTemplate, prData);

    // Embed plan if provided
    const plan = process.env.PLAN;
    if (plan) {
      finalPrompt = embedPlan(finalPrompt, plan);
    }

    // Set outputs
    core.setOutput("final_prompt", finalPrompt);
    core.setOutput("base_branch", baseBranch);
    core.setOutput("pr_number", String(prData.number));
    core.setOutput("pr_title", prData.title);
    core.setOutput("pr_author", prData.author);
    core.setOutput("pr_body", prData.body);

    console.log("Prompt prepared successfully");
    console.log(`Base branch: ${baseBranch}`);
    console.log(`PR #${prData.number}: ${prData.title}`);
    if (plan) {
      console.log("Plan embedded in implementation prompt");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Failed to prepare prompt: ${errorMessage}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
