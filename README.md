# GitHub AI Actions

A reusable GitHub Actions workflow that automatically runs AI code assistants (Claude Code or Codex) that create pull requests. Supports flexible triggers including PR merge events, comment events, manual dispatch, and more.

## Features

- 🎯 **Flexible Triggers**: Works with PR merge events, comment events, manual dispatch, and more
- 🔄 **Variable Substitution**: Supports placeholders like `{{PR_DIFF}}`, `{{PR_TITLE}}`, etc.
- 🤖 **Multi-Provider Support**: Works with Claude Code or OpenAI Codex
- 📝 **Auto PR Creation**: Automatically creates a new PR with AI-generated changes
- ⚙️ **Flexible Configuration**: Customizable prompts, branch names, and PR templates

## Quick Start

### 1. Add the Workflow to Your Repository

Create `.github/workflows/pr-automation.yml` in your repository:

```yaml
name: PR AI Automation

on:
  pull_request:
    types: [closed]

jobs:
  post-merge:
    if: github.event.pull_request.merged == true
    uses: docspec-ai/github-ai-actions/.github/workflows/pr-automation.yml@main
    with:
      provider: claude  # or 'codex'
      workflow_repository: docspec-ai/github-ai-actions
      prompt_template: |
        Analyze the changes in this merged PR:
        
        {{PR_DIFF}}
        
        Based on these changes, update the CHANGELOG.md file
        to document what was added in PR #{{PR_NUMBER}}.
      anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
      pr_title_template: "docs: Update CHANGELOG for PR #{{PR_NUMBER}}"
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### 2. Set Up Secrets

Add your API key as a repository secret:
- Go to Settings → Secrets and variables → Actions
- For Claude: Add a secret named `ANTHROPIC_API_KEY` with your API key
- For Codex: Add a secret named `OPENAI_API_KEY` with your API key

### 3. Configure Permissions

The workflow requires the following permissions (automatically set):
- `contents: write` - To create branches and commits
- `pull-requests: write` - To create PRs
- `id-token: write` - For OIDC authentication (if using Bedrock/Vertex/Foundry)

## Provider Selection

This workflow supports two AI providers:

### Claude Code (Default)

Claude Code automatically handles branch creation, commits, and changes. It's the default provider.

**Required**: `anthropic_api_key` or `claude_code_oauth_token`

### Codex

Codex executes in your repository and makes changes directly. The workflow handles branch creation and PR creation.

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
    uses: docspec-ai/github-ai-actions/.github/workflows/pr-automation.yml@main
    with:
      provider: claude
      workflow_repository: docspec-ai/github-ai-actions
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
    uses: docspec-ai/github-ai-actions/.github/workflows/pr-automation.yml@main
    with:
      provider: codex
      workflow_repository: docspec-ai/github-ai-actions
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
    uses: docspec-ai/github-ai-actions/.github/workflows/pr-automation.yml@main
    with:
      provider: claude
      workflow_repository: docspec-ai/github-ai-actions
      workflow_ref: main
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
```

### Advanced Example with Codex

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  post-merge:
    if: github.event.pull_request.merged == true
    uses: docspec-ai/github-ai-actions/.github/workflows/pr-automation.yml@main
    with:
      provider: codex
      workflow_repository: docspec-ai/github-ai-actions
      workflow_ref: main
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
- `workflow_repository` - Repository containing the workflow scripts (format: `owner/repo`)

### Trigger Configuration

- `pr_number` - PR number to process. If not provided, will be automatically extracted from the GitHub event context (works for PR events, issue comments on PRs, PR review comments, etc.)

### Provider Selection

- `provider` - AI provider to use: `"claude"` (default) or `"codex"`

### Claude-Specific

- `anthropic_api_key` - Anthropic API key for Claude Code
- `claude_code_oauth_token` - Claude Code OAuth token (alternative to API key)
- `use_bedrock` - Use Amazon Bedrock (boolean, default: false)
- `use_vertex` - Use Google Vertex AI (boolean, default: false)
- `use_foundry` - Use Microsoft Foundry (boolean, default: false)
- `claude_args` - Additional arguments for Claude Code CLI

### Codex-Specific

- `openai_api_key` - OpenAI API key for Codex
- `responses_api_endpoint` - Optional Responses API endpoint override (e.g., for Azure OpenAI)
- `codex_args` - Extra arguments forwarded to `codex exec` (JSON array or shell-style string)
- `codex_sandbox` - Sandbox mode: `workspace-write` (default), `read-only`, or `danger-full-access`
- `codex_safety_strategy` - Safety strategy: `drop-sudo` (default), `unprivileged-user`, `read-only`, or `unsafe`

### Common

- `branch_prefix` - Prefix for generated branches (default: `"ai/"`)
- `pr_title_template` - Template for created PR title (supports variable placeholders)
- `pr_body_template` - Template for created PR body (supports variable placeholders)
- `base_branch` - Base branch to create new branch from (defaults to repository default)
- `workflow_ref` - Ref (branch/tag) of the workflow repository to use (defaults to the same ref used to call the workflow)

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

1. **Trigger**: Workflow can be triggered by various events (PR merge, comments, manual dispatch, etc.)
2. **PR Number Extraction**: Automatically extracts PR number from event context, or uses explicit `pr_number` input
3. **Data Extraction**: Fetches PR data (diff, metadata) using GitHub API
4. **Variable Substitution**: Replaces placeholders in your prompt template with actual PR data
5. **AI Execution**: 
   - **Claude**: Runs Claude Code Action which handles branch creation and commits automatically
   - **Codex**: Runs Codex Action, then workflow creates branch, commits changes, and pushes
6. **PR Creation**: If AI makes changes, automatically creates a new PR

## Custom Triggers

The workflow supports any GitHub event that can provide a PR number. You can trigger it from:

- **PR Merge Events** (default): `pull_request` with `types: [closed]` and `merged == true`
- **Comment Events**: `issue_comment` on PRs
- **PR Review Comments**: `pull_request_review_comment`
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
    uses: docspec-ai/github-ai-actions/.github/workflows/pr-automation.yml@main
    with:
      provider: claude
      workflow_repository: docspec-ai/github-ai-actions
      prompt_template: |
        A comment was made on PR #{{PR_NUMBER}}:
        
        PR: {{PR_TITLE}}
        Changes: {{PR_DIFF}}
        
        Please review and update documentation.
      anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Example: Manual Dispatch with Explicit PR Number

Manually trigger the workflow for a specific PR:

```yaml
name: Manual AI Automation

on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to process'
        required: true
        type: string

jobs:
  ai-automation:
    uses: docspec-ai/github-ai-actions/.github/workflows/pr-automation.yml@main
    with:
      provider: claude
      workflow_repository: docspec-ai/github-ai-actions
      pr_number: ${{ inputs.pr_number }}  # Explicit PR number
      prompt_template: |
        Analyze PR #{{PR_NUMBER}} and update documentation: {{PR_DIFF}}
      anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Example: PR Review Comment Trigger

Trigger on PR review comments with a command:

```yaml
name: AI Automation on Review Comment

on:
  pull_request_review_comment:
    types: [created]

jobs:
  ai-automation:
    # Only run when a specific command is mentioned
    if: contains(github.event.comment.body, '/ai-review')
    uses: docspec-ai/github-ai-actions/.github/workflows/pr-automation.yml@main
    with:
      provider: codex
      workflow_repository: docspec-ai/github-ai-actions
      prompt_template: |
        Address review comments on PR #{{PR_NUMBER}}: {{PR_DIFF}}
      openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    secrets:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
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

## Troubleshooting

### Workflow Not Triggering

- Ensure the PR is actually merged (check `merged == true` condition)
- Verify the workflow file is in `.github/workflows/` directory
- Check that the reusable workflow path is correct

### No PR Created

- AI may not have made any changes
- Check the workflow logs for errors
- Verify branch creation succeeded
- For Codex, ensure changes were actually made to files

### Variable Not Substituting

- Ensure variable names match exactly (case-sensitive)
- Use double curly braces: `{{PR_NUMBER}}` not `{PR_NUMBER}`
- Check that the PR data was fetched successfully

### Codex Safety Strategy Issues

- On Windows runners, you must use `safety_strategy: unsafe`
- If you need `sudo` after Codex runs, consider splitting into separate jobs
- See [Codex Action documentation](https://github.com/openai/codex-action) for security best practices

## License

This workflow is provided as-is. See the main repository license for details.
