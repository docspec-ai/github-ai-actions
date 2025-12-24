#!/usr/bin/env bun

/**
 * Creates a new branch from the base branch for AI-generated changes
 */

import * as core from "@actions/core";
import { execFileSync } from "child_process";

function main() {
  try {
    const baseBranch = process.env.BASE_BRANCH;
    if (!baseBranch) {
      throw new Error("BASE_BRANCH environment variable is required");
    }

    const branchPrefix = process.env.BRANCH_PREFIX || "ai/";
    const prNumber = process.env.PR_NUMBER;
    if (!prNumber) {
      throw new Error("PR_NUMBER environment variable is required");
    }

    // Generate branch name: {prefix}pr-{number}-{timestamp}
    const timestamp = Date.now();
    const branchName = `${branchPrefix}pr-${prNumber}-${timestamp}`;

    // Fetch the base branch
    try {
      execFileSync("git", ["fetch", "origin", baseBranch], {
        stdio: "pipe",
      });
    } catch (error) {
      console.warn(
        `Failed to fetch origin/${baseBranch}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Create and checkout the new branch
    try {
      execFileSync("git", ["checkout", "-b", branchName, `origin/${baseBranch}`], {
        stdio: "pipe",
      });
    } catch (error) {
      // If origin/branch doesn't exist, try creating from current branch
      console.warn(
        `Could not checkout from origin/${baseBranch}, trying current branch: ${error instanceof Error ? error.message : String(error)}`,
      );
      execFileSync("git", ["checkout", "-b", branchName], {
        stdio: "pipe",
      });
    }

    console.log(`Created branch: ${branchName}`);
    core.setOutput("branch_name", branchName);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Failed to create branch: ${errorMessage}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

