---
name: review-cli
description: Use this skill whenever the user wants pull request review threads/comments from GitHub, especially for the current PR, unresolved feedback, reviewer filtering, CodeRabbit or other AI review feedback, or JSON output for scripting. This skill is for the local `review-cli` Bun project and should be used when the task involves inspecting PR review conversations with the repo's CLI rather than manually calling `gh` GraphQL yourself. For agent workflows, prefer review-only output with `--just-reviews` unless the user clearly needs PR metadata too.
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
- AI review services like CodeRabbit where the user mostly wants the actionable review body, not the PR metadata wrapper

This skill is specifically for the CLI implemented in this repo. Prefer using the CLI instead of rebuilding the `gh` queries yourself.

## Working style

Prefer structured output first.

For agent workflows, default to running the CLI with `--json --just-reviews` so you get stable machine-readable review data without extra PR wrapper fields. Only skip `--json` if the user explicitly asks to see the CLI's human-readable terminal output exactly as rendered. Only skip `--just-reviews` when the user clearly needs PR metadata such as the title, branches, state, repository, or PR URL.

## Command patterns

Run commands from the repository root:

```bash
bunx review-cli --json --just-reviews
```

Current PR with reviewer filtering:

```bash
bunx review-cli --json --just-reviews --user monalisa --user hubot
```

Specific PR number:

```bash
bunx review-cli 123 --json --just-reviews
```

Include resolved threads:

```bash
bunx review-cli 123 --include-resolved --json --just-reviews
```

Human-readable mode, review-only by default:

```bash
bunx review-cli 123 --include-resolved --just-reviews
```

Include PR metadata only when the user asks for it:

```bash
bunx review-cli 123 --include-resolved --json
```

## Expected behavior

- If no PR number is passed, the CLI resolves the current PR from the branch context using `gh`.
- By default, only unresolved review threads are returned.
- Repeating `--user` matches comments from any of those GitHub logins.
- `--json` returns the normalized result object. With `--just-reviews`, the JSON omits `pullRequest` and returns review data only.
- `--just-reviews` is usually the right default for AI agents because they typically care about actionable review findings, not PR metadata.

## Recommended agent flow

1. Run the CLI with `--json --just-reviews` unless the user explicitly wants raw terminal formatting or specifically needs PR metadata.
2. Inspect `filters`, `threadCount`, `commentCount`, and `threads`. Only inspect `pullRequest` when you deliberately omitted `--just-reviews`.
3. Summarize the actionable items for the user:
   - unresolved threads first
   - file/line location
   - commenter
   - key comment text
4. If the command fails because the directory is not a GitHub checkout or `gh` is not configured, explain that clearly and suggest running it from a real repo checkout or providing the PR number where appropriate.

## Output notes

The JSON shape is suitable for downstream scripting. Prefer citing exact fields rather than re-parsing terminal text.

Useful fields include:

- `filters.includeResolved`
- `filters.justReviews`
- `filters.users`
- `threadCount`
- `commentCount`
- `threads[].path`
- `threads[].line`
- `threads[].isResolved`
- `threads[].comments[].author`
- `threads[].comments[].bodyText`
- `threads[].comments[].url`

If PR metadata is intentionally included, useful extra fields include:

- `pullRequest.number`
- `pullRequest.title`
- `pullRequest.url`

## Example interpretation

If the user asks, "What unresolved feedback is left on my PR?", run:

```bash
bunx review-cli --json --just-reviews
```

Then summarize the returned unresolved threads in plain English instead of pasting raw JSON unless they asked for the JSON itself.
