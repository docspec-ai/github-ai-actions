#!/usr/bin/env bun

/**
 * Commits and pushes changes made by the AI assistant
 */

import * as core from "@actions/core";
import { execFileSync } from "child_process";

function main() {
  try {
    const branchName = process.env.BRANCH_NAME;
    if (!branchName) {
      throw new Error("BRANCH_NAME environment variable is required");
    }

    const prNumber = process.env.PR_NUMBER || "unknown";
    const provider = process.env.PROVIDER || "ai";

    // Check if there are any changes
    let hasChanges = false;
    try {
      const statusOutput = execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf-8",
      });
      hasChanges = statusOutput.trim().length > 0;
    } catch (error) {
      console.warn(
        `Failed to check git status: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Assume no changes if we can't check
    }

    if (!hasChanges) {
      console.log("No changes detected, skipping commit and push");
      core.setOutput("has_changes", "false");
      return;
    }

    // Configure git user
    execFileSync("git", ["config", "user.name", "github-ai-actions[bot]"], {
      stdio: "pipe",
    });
    execFileSync(
      "git",
      ["config", "user.email", "github-ai-actions[bot]@users.noreply.github.com"],
      {
        stdio: "pipe",
      },
    );

    // Stage all changes
    execFileSync("git", ["add", "-A"], {
      stdio: "pipe",
    });

    // Commit changes
    const commitMessage = `chore: Automated changes from ${provider} for PR #${prNumber}`;
    execFileSync("git", ["commit", "-m", commitMessage], {
      stdio: "pipe",
    });

    // Push to remote
    execFileSync("git", ["push", "origin", branchName], {
      stdio: "pipe",
    });

    console.log(`Committed and pushed changes to ${branchName}`);
    core.setOutput("has_changes", "true");
    core.setOutput("branch_name", branchName);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Failed to commit and push: ${errorMessage}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

