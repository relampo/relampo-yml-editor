# Issue tracker: Jira (RLP)

Issues and specs for this repo live in Jira project **RLP**.
This matches other Relampo / SQADvisory repos.

## Conventions

- **Project key**: `RLP` (example: `RLP-123`).
- **Branch name**: `{JIRA-KEY}-short-desc` (example: `RLP-123-yaml-tree-fix`).
- **Commits and PRs**: put the Jira key in every commit message on the branch, and in the PR title or description. Jira uses this to link GitHub activity.
- **Do not create GitHub Issues** for tracked work. Use Jira.
- **PRs as a request surface: no.**

## How to talk to Jira

Prefer the Atlassian / `mcp-atlassian` MCP tools when they are available.
If MCP is not available, use Jira REST API v3 with `JIRA_URL`, `JIRA_EMAIL`, and `JIRA_API_TOKEN`.
Do not put those values in the repo.

- **Create an issue**: MCP `jira_create_issue` (Task, Bug, Story, or Epic) in project `RLP`.
- **Read an issue**: MCP `jira_get_issue` with the key (example: `RLP-123`).
- **List issues**: MCP `jira_search` with JQL (example: `project = RLP AND status = "To Do"`).
- **Comment**: MCP `jira_add_comment`.
- **Labels**: MCP `jira_update_issue` — set `labels` to the triage strings in `docs/agents/triage-labels.md`.
- **Close / move status**: MCP `jira_get_transitions` first, then `jira_transition_issue`.

## When a skill says "publish to the issue tracker"

Create a Jira issue in project `RLP`.

## When a skill says "fetch the relevant ticket"

Read the Jira issue by key (`RLP-123`). If the user only gave a branch name, take the key from the start of the branch.
