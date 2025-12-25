#!/usr/bin/env bun

/**
 * Shared utility functions used across multiple scripts
 */

/**
 * Substitutes variables in a template string
 * Replaces {{VARIABLE_NAME}} with values from the variables object
 */
export function substituteVariables(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    // Use function replacement to prevent interpretation of special dollar-sign patterns
    result = result.replace(regex, () => value);
  }
  return result;
}

/**
 * Parses repository string into owner and repo
 */
export function parseRepository(repository: string): { owner: string; repo: string } {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(
      `Invalid REPOSITORY format: ${repository}. Expected 'owner/repo'`,
    );
  }
  return { owner, repo };
}

/**
 * Gets GitHub API URL from environment
 */
export function getApiUrl(): string {
  return process.env.GITHUB_API_URL || "https://api.github.com";
}

/**
 * Standardized error handling for scripts
 * Logs error message for use with core.setFailed() in calling code
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

