#!/usr/bin/env bun

/**
 * Shared LLM execution script for both plan and implementation phases.
 * Handles Claude Code CLI and Codex execution with configurable parameters.
 */

import * as core from "@actions/core";
import { execFileSync } from "child_process";
import { writeFileSync } from "fs";

type Provider = "claude" | "codex";
type PermissionMode = "acceptEdits" | null;
type CodexSandbox = "workspace-write" | "read-only" | "danger-full-access";
type CodexSafetyStrategy = "drop-sudo" | "unprivileged-user" | "read-only" | "unsafe";

interface RunLLMConfig {
  provider: Provider;
  prompt: string;
  permissionMode: PermissionMode;
  // Claude-specific
  anthropicApiKey?: string;
  claudeCodeOAuthToken?: string;
  useBedrock?: boolean;
  useVertex?: boolean;
  useFoundry?: boolean;
  claudeArgs?: string;
  model?: string;
  // Codex-specific
  openaiApiKey?: string;
  responsesApiEndpoint?: string;
  codexArgs?: string;
  codexSandbox?: CodexSandbox;
  codexSafetyStrategy?: CodexSafetyStrategy;
  // Common
  branchPrefix?: string;
  baseBranch?: string;
  prNumber?: string;
  // Output capture
  captureOutput?: boolean; // If true, capture and return output (for plan phase)
}

interface RunLLMResult {
  success: boolean;
  output?: string; // Captured output (for plan phase)
  branchName?: string; // Branch created (for implementation phase)
  hasChanges?: boolean; // Whether changes were made (for implementation phase)
  error?: string;
}

/**
 * Run Claude Code CLI directly (for plan phase or when we need output)
 */
function runClaudeCLI(config: RunLLMConfig): RunLLMResult {
  try {
    // Verify Claude CLI is available
    try {
      execFileSync("claude", ["--version"], { stdio: "pipe" });
    } catch (error) {
      throw new Error(
        "Claude CLI not found. Please install with: npm install -g @anthropic-ai/claude-code"
      );
    }

    // Check API key
    const apiKey = config.anthropicApiKey || config.claudeCodeOAuthToken;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN is required");
    }

    // Build command
    const cmd: string[] = ["claude", "-p", config.prompt];
    
    if (config.model) {
      cmd.push("--model", config.model);
    }
    
    // Permission mode (omit for plan phase, include for implementation)
    if (config.permissionMode) {
      cmd.push("--permission-mode", config.permissionMode);
    }
    
    // Tools
    cmd.push("--tools", "default");
    
    // No session persistence for automated scripts
    cmd.push("--no-session-persistence");
    
    // Parse additional args if provided
    if (config.claudeArgs) {
      try {
        const args = JSON.parse(config.claudeArgs);
        if (Array.isArray(args)) {
          cmd.push(...args);
        }
      } catch {
        // If not JSON, treat as space-separated string
        const args = config.claudeArgs.split(/\s+/).filter(Boolean);
        cmd.push(...args);
      }
    }

    // Set environment
    const env = { ...process.env };
    if (config.anthropicApiKey) {
      env.ANTHROPIC_API_KEY = config.anthropicApiKey;
    }
    if (config.claudeCodeOAuthToken) {
      env.CLAUDE_CODE_OAUTH_TOKEN = config.claudeCodeOAuthToken;
    }
    if (config.useBedrock) {
      env.USE_BEDROCK = "true";
    }
    if (config.useVertex) {
      env.USE_VERTEX = "true";
    }
    if (config.useFoundry) {
      env.USE_FOUNDRY = "true";
    }

    // Determine working directory (repository root, not action path)
    const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();

    // Execute
    if (config.captureOutput) {
      // For plan phase: capture stdout
      const result = execFileSync("claude", cmd.slice(1), {
        encoding: "utf-8",
        env,
        cwd: repoRoot,
        stdio: ["pipe", "pipe", "pipe"],
      });
      return {
        success: true,
        output: result.trim(),
      };
    } else {
      // For implementation phase: let it run and make changes
      execFileSync("claude", cmd.slice(1), {
        encoding: "utf-8",
        env,
        cwd: repoRoot,
        stdio: "inherit",
      });
      return {
        success: true,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run Codex CLI for plan phase only.
 * Note: For implementation phase, codex-action is used directly in the workflow.
 * This function is only called when CAPTURE_OUTPUT is true (plan phase).
 */
function runCodex(config: RunLLMConfig): RunLLMResult {
  try {
    if (!config.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required for Codex");
    }

    if (!config.captureOutput) {
      throw new Error(
        "Codex implementation phase should use codex-action directly in the workflow, not this script",
      );
    }

    // Check if codex CLI is available
    try {
      execFileSync("codex", ["--version"], { stdio: "pipe" });
    } catch {
      throw new Error(
        "Codex CLI not found. Codex plan phase requires codex CLI to be installed.",
      );
    }

    // Build command
    const cmd: string[] = ["codex", "exec"];

    // Parse codex-args if provided
    if (config.codexArgs) {
      try {
        const args = JSON.parse(config.codexArgs);
        if (Array.isArray(args)) {
          cmd.push(...args);
        }
      } catch {
        const args = config.codexArgs.split(/\s+/).filter(Boolean);
        cmd.push(...args);
      }
    }

    // Write prompt to temporary file
    const promptFile = "/tmp/codex-prompt.txt";
    writeFileSync(promptFile, config.prompt, "utf-8");

    const env = { ...process.env };
    env.OPENAI_API_KEY = config.openaiApiKey;
    if (config.responsesApiEndpoint) {
      env.RESPONSES_API_ENDPOINT = config.responsesApiEndpoint;
    }

    // Determine working directory (repository root, not action path)
    const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();

    // Capture output for plan phase
    const result = execFileSync("codex", [...cmd.slice(1), promptFile], {
      encoding: "utf-8",
      env,
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });

    return {
      success: true,
      output: result.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main execution function
 */
export function runLLM(config: RunLLMConfig): RunLLMResult {
  if (config.provider === "claude") {
    return runClaudeCLI(config);
  } else if (config.provider === "codex") {
    return runCodex(config);
  } else {
    return {
      success: false,
      error: `Unknown provider: ${config.provider}`,
    };
  }
}

// CLI entry point
if (import.meta.main) {
  try {
    const provider = (process.env.PROVIDER || "claude") as Provider;
    const prompt = process.env.PROMPT;
    if (!prompt) {
      throw new Error("PROMPT environment variable is required");
    }

    const permissionMode = process.env.PERMISSION_MODE === "acceptEdits" ? "acceptEdits" : null;
    const captureOutput = process.env.CAPTURE_OUTPUT === "true";

    const config: RunLLMConfig = {
      provider,
      prompt,
      permissionMode,
      captureOutput,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      claudeCodeOAuthToken: process.env.CLAUDE_CODE_OAUTH_TOKEN,
      useBedrock: process.env.USE_BEDROCK === "true",
      useVertex: process.env.USE_VERTEX === "true",
      useFoundry: process.env.USE_FOUNDRY === "true",
      claudeArgs: process.env.CLAUDE_ARGS,
      model: process.env.MODEL,
      openaiApiKey: process.env.OPENAI_API_KEY,
      responsesApiEndpoint: process.env.RESPONSES_API_ENDPOINT,
      codexArgs: process.env.CODEX_ARGS,
      codexSandbox: (process.env.CODEX_SANDBOX as CodexSandbox) || "workspace-write",
      codexSafetyStrategy: (process.env.CODEX_SAFETY_STRATEGY as CodexSafetyStrategy) || "drop-sudo",
    };

    const result = runLLM(config);

    if (result.success) {
      if (result.output) {
        // Output captured (plan phase)
        // Output to stdout for subprocess capture (this is the primary output)
        console.log(result.output);
        // Also set as GitHub Actions output if running in Actions context
        try {
          core.setOutput("output", result.output);
        } catch {
          // Not in GitHub Actions context, that's fine
        }
      } else {
        // Implementation phase
        console.log("LLM execution completed");
      }
    } else {
      const errorMsg = `LLM execution failed: ${result.error}`;
      console.error(errorMsg);
      try {
        core.setFailed(errorMsg);
      } catch {
        // Not in GitHub Actions context, that's fine
      }
      process.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to run LLM: ${errorMessage}`);
    try {
      core.setFailed(`Failed to run LLM: ${errorMessage}`);
    } catch {
      // Not in GitHub Actions context, that's fine
    }
    process.exit(1);
  }
}

