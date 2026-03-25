---
name: review-cli
description: Use this skill whenever the user wants pull request review threads/comments from GitHub, especially for the current PR, unresolved feedback, reviewer filtering, or JSON output for scripting. This skill is for the local `review-cli` Bun project and should be used when the task involves inspecting PR review conversations with the repo's CLI rather than manually calling `gh` GraphQL yourself.
---

# Review CLI

Use the local CLI in this repository to inspect GitHub PR review threads/comments.

## When to use this skill

Use this skill when the user wants any of the following:

- review threads or comments for a PR
- unresolved review feedback for the current PR
- resolved threads included with a flag
- filtering review comments by one or more GitHub users
- JSON output for further processing or scripting

This skill is specifically for the CLI implemented in this repo. Prefer using the CLI instead of rebuilding the `gh` queries yourself.

## Working style

Prefer structured output first.

For agent workflows, default to running the CLI with `--json` so you get stable machine-readable data that is easy to inspect, transform, and summarize. Only skip `--json` if the user explicitly asks to see the CLI's human-readable terminal output exactly as rendered.

## Command patterns

Run commands from the repository root:

```bash
bunx review-cli --json
```

Current PR with reviewer filtering:

```bash
bunx review-cli --json --user monalisa --user hubot
```

Specific PR number:

```bash
bunx review-cli 123 --json
```

Include resolved threads:

```bash
bunx review-cli 123 --include-resolved --json
```

Human-readable mode, only when needed:

```bash
bunx review-cli 123 --include-resolved
```

## Expected behavior

- If no PR number is passed, the CLI resolves the current PR from the branch context using `gh`.
- By default, only unresolved review threads are returned.
- Repeating `--user` matches comments from any of those GitHub logins.
- `--json` returns the normalized result object with PR metadata, applied filters, counts, and matching threads/comments.

## Recommended agent flow

1. Run the CLI with `--json` unless the user explicitly wants raw terminal formatting.
2. Inspect `pullRequest`, `filters`, `threadCount`, `commentCount`, and `threads`.
3. Summarize the actionable items for the user:
   - unresolved threads first
   - file/line location
   - commenter
   - key comment text
4. If the command fails because the directory is not a GitHub checkout or `gh` is not configured, explain that clearly and suggest running it from a real repo checkout or providing the PR number where appropriate.

## Output notes

The JSON shape is suitable for downstream scripting. Prefer citing exact fields rather than re-parsing terminal text.

Useful fields include:

- `pullRequest.number`
- `pullRequest.title`
- `pullRequest.url`
- `filters.includeResolved`
- `filters.users`
- `threadCount`
- `commentCount`
- `threads[].path`
- `threads[].line`
- `threads[].isResolved`
- `threads[].comments[].author`
- `threads[].comments[].bodyText`
- `threads[].comments[].url`

## Example interpretation

If the user asks, "What unresolved feedback is left on my PR?", run:

```bash
bunx review-cli --json
```

Then summarize the returned unresolved threads in plain English instead of pasting raw JSON unless they asked for the JSON itself.
