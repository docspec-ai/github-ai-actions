# GitHub AI Actions

A composite GitHub Action that automatically runs AI code assistants (Claude Code or Codex) to create pull requests. This action uses the sanctioned [`anthropics/claude-code-action/base-action`](https://github.com/anthropics/claude-code-action) and [`openai/codex-action`](https://github.com/openai/codex-action) to execute AI assistants. Supports flexible triggers including PR merge events, comment events, manual dispatch, and more.

## Features

- 🎯 **Flexible Triggers**: Works with PR merge events, comment events, manual dispatch, and more
- 🔄 **Variable Substitution**: Supports placeholders like `{{PR_DIFF}}`, `{{PR_TITLE}}`, etc.
- 🤖 **Multi-Provider Support**: Works with Claude Code or OpenAI Codex
- 📝 **Auto PR Creation**: Automatically creates a new PR with AI-generated changes
- ⚙️ **Flexible Configuration**: Customizable prompts, branch names, and PR templates

## Quick Start

### 1. Add the Action to Your Workflow

Create `.github/workflows/pr-automation.yml` in your repository:

```yaml
name: PR AI Automation

on:
  pull_request:
    types: [closed]

jobs:
  post-merge:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Run AI automation
        uses: docspec-ai/github-ai-actions@main
        with:
          provider: claude # or 'codex'
          prompt_template: |
            Analyze the changes in this merged PR:

            {{PR_DIFF}}

            Based on these changes, update the CHANGELOG.md file
            to document what was added in PR #{{PR_NUMBER}}.
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          pr_title_template: "docs: Update CHANGELOG for PR #{{PR_NUMBER}}"
```

### 2. Set Up Secrets

Add your API key as a repository secret:

- Go to Settings → Secrets and variables → Actions
- For Claude: Add a secret named `ANTHROPIC_API_KEY` with your API key
- For Codex: Add a secret named `OPENAI_API_KEY` with your API key

### 3. Configure Permissions

The action requires the following permissions (automatically set):

- `contents: write` - To create branches and commits
- `pull-requests: write` - To create PRs
- `id-token: write` - For OIDC authentication (if using Bedrock/Vertex/Foundry)

## Provider Selection

This action supports two AI providers:

### Claude Code (Default)

This action uses the sanctioned [`anthropics/claude-code-action/base-action`](https://github.com/anthropics/claude-code-action) to execute Claude Code. The action handles branch creation, commits, and PR creation. It's the default provider.

**Required**: `anthropic_api_key` or `claude_code_oauth_token`

### Codex

This action uses the sanctioned [`openai/codex-action`](https://github.com/openai/codex-action) to execute Codex. The action handles branch creation, commits, and PR creation.

**Required**: `openai_api_key`

## Usage

### Basic Example with Claude

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  post-merge:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Run AI automation
        uses: docspec-ai/github-ai-actions@main
        with:
          provider: claude
          prompt_template: |
            Review the changes in PR #{{PR_NUMBER}} and update documentation.

            Changes:
            {{PR_DIFF}}
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Basic Example with Codex

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  post-merge:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Run AI automation
        uses: docspec-ai/github-ai-actions@main
        with:
          provider: codex
          prompt_template: |
            Review the changes in PR #{{PR_NUMBER}} and update documentation.

            Changes:
            {{PR_DIFF}}
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

### Advanced Example with Claude

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  post-merge:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Run AI automation
        uses: docspec-ai/github-ai-actions@main
        with:
          provider: claude
          prompt_template: |
            PR #{{PR_NUMBER}}: {{PR_TITLE}}
            Author: {{PR_AUTHOR}}

            Changes:
            {{PR_DIFF}}

            Changed files:
            {{CHANGED_FILES}}

            Please:
            1. Update the CHANGELOG.md with these changes
            2. Ensure all new functions are documented
            3. Check for any breaking changes
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          branch_prefix: "auto/"
          pr_title_template: "chore: Auto-update docs for PR #{{PR_NUMBER}}"
          pr_body_template: |
            This PR contains automated documentation updates for PR #{{PR_NUMBER}}.

            Original PR: {{PR_TITLE}}
            Author: {{PR_AUTHOR}}

            Generated with [Claude Code](https://claude.ai/code)
          claude_args: "--max-turns 5 --model claude-3-5-sonnet-20241022"
          # Optional: Enable plan phase
          # enable_plan: true
          # plan_claude_args: "--model claude-opus-4-1-20250805"
```

### Advanced Example with Codex

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  post-merge:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Run AI automation
        uses: docspec-ai/github-ai-actions@main
        with:
          provider: codex
          prompt_template: |
            PR #{{PR_NUMBER}}: {{PR_TITLE}}
            Author: {{PR_AUTHOR}}

            Changes:
            {{PR_DIFF}}

            Changed files:
            {{CHANGED_FILES}}

            Please:
            1. Update the CHANGELOG.md with these changes
            2. Ensure all new functions are documented
            3. Check for any breaking changes
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          codex_sandbox: workspace-write
          codex_safety_strategy: drop-sudo
          codex_args: '["--max-turns", "5"]'
          branch_prefix: "auto/"
          pr_title_template: "chore: Auto-update docs for PR #{{PR_NUMBER}}"
          pr_body_template: |
            This PR contains automated documentation updates for PR #{{PR_NUMBER}}.

            Original PR: {{PR_TITLE}}
            Author: {{PR_AUTHOR}}

            Generated with [Codex](https://github.com/openai/codex)
```

## Input Parameters

### Required

- `prompt_template` - Your prompt template with variable placeholders

### Trigger Configuration

- `pr_number` - PR number to process. If not provided, will be automatically extracted from the GitHub event context (works for PR events, issue comments on PRs, PR review comments, etc.)

### Provider Selection

- `provider` - AI provider to use: `"claude"` (default) or `"codex"`

### Claude-Specific

- `anthropic_api_key` - Anthropic API key (required for direct Anthropic API)
- `claude_code_oauth_token` - Claude Code OAuth token (alternative to API key)
- `use_bedrock` - Use Amazon Bedrock with OIDC authentication (boolean, default: false)
- `use_vertex` - Use Google Vertex AI with OIDC authentication (boolean, default: false)
- `use_foundry` - Use Microsoft Foundry with OIDC authentication (boolean, default: false)
- `claude_args` - Additional arguments to pass directly to Claude CLI (e.g., `--max-turns 3 --mcp-config /path/to/config.json`)
- `settings` - Claude Code settings as JSON string or path to settings JSON file
- `path_to_claude_code_executable` - Optional path to a custom Claude Code executable
- `path_to_bun_executable` - Optional path to a custom Bun executable
- `show_full_output` - Show full JSON output from Claude Code (WARNING: may contain secrets)
- `plugins` - Newline-separated list of Claude Code plugin names to install
- `plugin_marketplaces` - Newline-separated list of Claude Code plugin marketplace Git URLs

### Codex-Specific

- `openai_api_key` - OpenAI API key for Codex
- `responses_api_endpoint` - Optional Responses API endpoint override (e.g., for Azure OpenAI)
- `codex_args` - Extra arguments forwarded to `codex exec` (JSON array or shell-style string)
- `codex_sandbox` - Sandbox mode: `workspace-write` (default), `read-only`, or `danger-full-access`
- `codex_safety_strategy` - Safety strategy: `drop-sudo` (default), `unprivileged-user`, `read-only`, or `unsafe`

### Plan Phase (Optional)

- `enable_plan` - Enable plan phase before implementation (runs LLM twice: once for planning, once for implementation) (boolean, default: false)
- `plan_prompt_template` - Optional prompt template for the plan phase. If not provided, uses a default plan prompt.
- `plan_claude_args` - Additional arguments to pass directly to Claude CLI for plan phase (e.g., `--model claude-opus-4-1-20250805 --max-turns 3`)

### Common

- `branch_prefix` - Prefix for generated branches (default: `"ai/"`)
- `pr_title_template` - Template for created PR title (supports variable placeholders)
- `pr_body_template` - Template for created PR body (supports variable placeholders)
- `base_branch` - Base branch to create new branch from (defaults to repository default)

## Variable Placeholders

The following variables can be used in `prompt_template`, `pr_title_template`, and `pr_body_template`:

- `{{PR_DIFF}}` - Full unified diff of the merged PR
- `{{PR_TITLE}}` - Title of the merged PR
- `{{PR_NUMBER}}` - Number of the merged PR
- `{{PR_AUTHOR}}` - Username of the PR author
- `{{PR_BODY}}` - Description/body of the merged PR
- `{{CHANGED_FILES}}` - Newline-separated list of changed files
- `{{REPOSITORY}}` - Repository full name (owner/repo)
- `{{BASE_BRANCH}}` - Base branch that the PR was merged into

## How It Works

1. **Trigger**: Action can be triggered by various events (PR merge, comments, manual dispatch, etc.)
2. **Isolated Execution**: Action runs in GitHub's isolated environment
3. **PR Number Extraction**: Automatically extracts PR number from event context, or uses explicit `pr_number` input
4. **Data Extraction**: Fetches PR data (diff, metadata) using GitHub API
5. **Variable Substitution**: Replaces placeholders in your prompt template with actual PR data
6. **AI Execution**:
   - **Plan Phase** (optional): If `enable_plan` is true, runs the AI in read-only mode to generate a plan, which is then included in the implementation prompt
   - **Implementation Phase**: 
     - **Claude**: Uses `anthropics/claude-code-action/base-action` to execute Claude Code
     - **Codex**: Uses `openai/codex-action` to execute Codex
   - **Branch Management**: Action creates a branch before execution and commits/pushes changes after
7. **PR Creation**: If AI makes changes, automatically creates a new PR

## Custom Triggers

The action supports any GitHub event that can provide a PR number. You can trigger it from:

- **PR Merge Events** (default): `pull_request` with `types: [closed]` and `merged == true`
- **Comment Events**: `issue_comment` on PRs
- **Manual Dispatch**: `workflow_dispatch` with explicit `pr_number` input
- **Any Custom Event**: As long as you provide `pr_number` explicitly

### Example: Comment Trigger

Trigger the workflow when someone comments on a PR:

```yaml
name: AI Automation on Comment

on:
  issue_comment:
    types: [created]

jobs:
  ai-automation:
    # Only run on PR comments (not regular issues)
    if: github.event.issue.pull_request != null
    runs-on: ubuntu-latest
    steps:
      - name: Run AI automation
        uses: docspec-ai/github-ai-actions@main
        with:
          provider: claude
          prompt_template: |
            A comment was made on PR #{{PR_NUMBER}}:

            PR: {{PR_TITLE}}
            Changes: {{PR_DIFF}}

            Please review and update documentation.
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Example: Manual Dispatch with Explicit PR Number

Manually trigger the workflow for a specific PR:

```yaml
name: Manual AI Automation

on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: "PR number to process"
        required: true
        type: string

jobs:
  ai-automation:
    runs-on: ubuntu-latest
    steps:
      - name: Run AI automation
        uses: docspec-ai/github-ai-actions@main
        with:
          provider: claude
          pr_number: ${{ inputs.pr_number }} # Explicit PR number
          prompt_template: |
            Analyze PR #{{PR_NUMBER}} and update documentation: {{PR_DIFF}}
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

See the `examples/` directory for more trigger examples.

## Examples

### Update CHANGELOG

```yaml
prompt_template: |
  The following PR was just merged:

  PR #{{PR_NUMBER}}: {{PR_TITLE}}
  Author: {{PR_AUTHOR}}

  Changes:
  {{PR_DIFF}}

  Please update CHANGELOG.md to document these changes.
  Follow the existing format and add an entry under "Unreleased".
```

### Generate Documentation

```yaml
prompt_template: |
  PR #{{PR_NUMBER}} added new features. Please:

  1. Review the changes: {{PR_DIFF}}
  2. Update API documentation in docs/api.md
  3. Add examples for any new functions

  Changed files:
  {{CHANGED_FILES}}
```

### Code Review Follow-up

```yaml
prompt_template: |
  PR #{{PR_NUMBER}} by {{PR_AUTHOR}} was just merged.

  {{PR_DIFF}}

  Please:
  - Check if any TODOs or FIXMEs were introduced
  - Verify test coverage is adequate
  - Update any related documentation
```

## Cloud Provider Support (Claude Only)

Claude Code supports multiple cloud providers:

### Amazon Bedrock

```yaml
with:
  provider: claude
  use_bedrock: true
  # AWS credentials configured via environment variables
```

### Google Vertex AI

```yaml
with:
  provider: claude
  use_vertex: true
  # GCP credentials configured via environment variables
```

### Microsoft Foundry

```yaml
with:
  provider: claude
  use_foundry: true
  # Foundry credentials configured via environment variables
```

### Azure OpenAI (Codex)

```yaml
with:
  provider: codex
  openai_api_key: ${{ secrets.AZURE_OPENAI_API_KEY }}
  responses_api_endpoint: "https://YOUR_PROJECT_NAME.openai.azure.com/openai/v1/responses"
```

See the [Claude Code Action documentation](https://github.com/anthropics/claude-code-action) and [Codex Action documentation](https://github.com/openai/codex-action) for cloud provider setup details.

## License

This action is provided as-is. See the main repository license for details.
