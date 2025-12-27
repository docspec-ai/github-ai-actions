#!/usr/bin/env bun

/**
 * Extract plan from a file written by the AI assistant during plan phase.
 */

import { readFileSync, existsSync } from "fs";
import * as core from "@actions/core";

const PLAN_FILE = process.env.PLAN_FILE || `${process.env.RUNNER_TEMP || "/tmp"}/plan.txt`;

try {
  let plan: string | null = null;

  // Read from the plan file
  if (existsSync(PLAN_FILE)) {
    try {
      plan = readFileSync(PLAN_FILE, "utf-8").trim();
    } catch (error) {
      throw new Error(`Failed to read plan file ${PLAN_FILE}: ${error}`);
    }
  }

  if (!plan || plan.length === 0) {
    throw new Error(`Plan not found. Expected plan file at ${PLAN_FILE}`);
  }

  // Output to stdout for subprocess capture
  console.log(plan);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Failed to extract plan: ${errorMessage}`);
  try {
    core.setFailed(`Failed to extract plan: ${errorMessage}`);
  } catch {
    // Not in GitHub Actions context, that's fine
  }
  process.exit(1);
}

