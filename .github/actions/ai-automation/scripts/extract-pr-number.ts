#!/usr/bin/env bun

/**
 * Extracts PR number from GitHub event context or explicit input.
 * Supports multiple event types: pull_request, issue_comment, workflow_dispatch, etc.
 */

import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { getApiUrl, parseRepository } from "./utils.ts";

async function extractPRNumberFromIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<number | null> {
  try {
    const { data: issue } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    // Check if the issue is actually a PR
    if (issue.pull_request?.url) {
      // Extract PR number from URL (format: .../pulls/{number})
      const urlParts = issue.pull_request.url.split("/");
      const prNumber = parseInt(urlParts[urlParts.length - 1] || "", 10);
      if (!isNaN(prNumber)) {
        return prNumber;
      }
    }
    return null;
  } catch (error) {
    console.warn(
      `Failed to fetch issue #${issueNumber}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

async function main() {
  try {
    // Check for explicitly provided PR number
    const explicitPRNumber = process.env.PR_NUMBER;
    if (explicitPRNumber && explicitPRNumber.trim() !== "") {
      const prNum = parseInt(explicitPRNumber.trim(), 10);
      if (!isNaN(prNum)) {
        console.log(`Using explicitly provided PR number: ${prNum}`);
        core.setOutput("pr_number", String(prNum));
        return;
      }
    }

    // Get GitHub context from environment
    const eventName = process.env.GITHUB_EVENT_NAME || "";
    const repository = process.env.GITHUB_REPOSITORY || "";
    const githubToken = process.env.GITHUB_TOKEN;

    if (!repository) {
      throw new Error("GITHUB_REPOSITORY environment variable is required");
    }

    if (!githubToken) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }

    const { owner, repo } = parseRepository(repository);
    const apiUrl = getApiUrl();
    const octokit = new Octokit({
      auth: githubToken,
      baseUrl: apiUrl,
    });

    // Try to extract from pull_request event
    const pullRequestNumber = process.env.GITHUB_EVENT_PULL_REQUEST_NUMBER;
    if (pullRequestNumber) {
      const prNum = parseInt(pullRequestNumber, 10);
      if (!isNaN(prNum)) {
        console.log(`Extracted PR number from pull_request event: ${prNum}`);
        core.setOutput("pr_number", String(prNum));
        return;
      }
    }

    // Try to extract from issue_comment event
    const issueNumber = process.env.GITHUB_EVENT_ISSUE_NUMBER;
    if (issueNumber) {
      const issueNum = parseInt(issueNumber, 10);
      if (!isNaN(issueNum)) {
        const prNumber = await extractPRNumberFromIssue(octokit, owner, repo, issueNum);
        if (prNumber !== null) {
          console.log(`Extracted PR number from issue comment: ${prNumber}`);
          core.setOutput("pr_number", String(prNumber));
          return;
        } else {
          throw new Error(`Issue #${issueNum} is not a pull request`);
        }
      }
    }

    // If we get here, we couldn't extract a PR number
    throw new Error(
      `Could not extract PR number from event context. Event name: ${eventName}. Please provide pr_number input explicitly, or trigger from a PR-related event.`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Failed to extract PR number: ${errorMessage}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

