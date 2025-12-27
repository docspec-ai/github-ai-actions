#!/usr/bin/env bun

/**
 * Extract plan from a file written by Claude during plan phase.
 * Falls back to extracting from execution_file JSON if the file doesn't exist.
 */

import { readFileSync, existsSync } from "fs";
import * as core from "@actions/core";

const PLAN_FILE = process.env.PLAN_FILE || `${process.env.RUNNER_TEMP || "/tmp"}/plan.txt`;
const EXECUTION_FILE = process.env.EXECUTION_FILE;

function extractPlanFromExecutionFile(executionFile: string): string | null {
  try {
    const content = readFileSync(executionFile, "utf-8");
    const messages = JSON.parse(content) as Array<{
      type: string;
      content?: string | Array<{ type: string; text?: string }>;
    }>;

    // Find assistant messages (Claude's responses)
    const assistantMessages = messages.filter(
      (m) => m.type === "assistant" || (m.type === "message" && m.content)
    );

    // Extract text from assistant messages
    const planParts: string[] = [];
    for (const msg of assistantMessages) {
      if (typeof msg.content === "string") {
        planParts.push(msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "text" && part.text) {
            planParts.push(part.text);
          }
        }
      }
    }

    return planParts.length > 0 ? planParts.join("\n\n").trim() : null;
  } catch (error) {
    console.warn(`Failed to extract plan from execution file: ${error}`);
    return null;
  }
}

try {
  let plan: string | null = null;

  // First, try to read from the plan file
  if (existsSync(PLAN_FILE)) {
    try {
      plan = readFileSync(PLAN_FILE, "utf-8").trim();
    } catch (error) {
      console.warn(`Failed to read plan file ${PLAN_FILE}: ${error}`);
    }
  }

  // If plan file doesn't exist or is empty, try to extract from execution_file
  if ((!plan || plan.length === 0) && EXECUTION_FILE && existsSync(EXECUTION_FILE)) {
    console.warn("Plan file not found, attempting to extract from execution_file...");
    plan = extractPlanFromExecutionFile(EXECUTION_FILE);
  }

  if (!plan || plan.length === 0) {
    throw new Error(
      `Plan not found. Checked ${PLAN_FILE}${EXECUTION_FILE ? ` and ${EXECUTION_FILE}` : ""}`
    );
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

