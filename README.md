# review-cli

⚡ CLI powerhouse for GitHub PR reviews. Inspect threads, filter by reviewer, export JSON—works perfectly with agents and skills.

[![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun)](https://bun.sh)
[![npm version](https://img.shields.io/npm/v/review-cli?style=flat&color=black)](https://www.xnpmjs.com/package/review-cli)
[![npm downloads](https://img.shields.io/npm/dm/review-cli?style=flat&color=black)](https://www.xnpmjs.com/package/review-cli)

## Requirements

- [Bun](https://bun.com)
- [GitHub CLI](https://cli.github.com/) authenticated with access to the target repo
- Run the command from a local checkout of the GitHub repository whose PR you want to inspect

## Install

```bash
# globally
bun i -g review-cli
# install skills
bunx skills add brrock/review-cli
# in this project
bun install
```

## Usage

```bash
bunx review-cli [pr-number] [options]
```

If `pr-number` is omitted, the CLI asks `gh` for the current PR on your branch.

To add agent skills run

```sh
bunx skills add brrock/review-cli
```

### Options

- `--filter <number>` shows only the first matching review threads after other filters are applied.
- `--include-resolved` includes resolved threads. By default, only unresolved threads are shown.
- `--just-reviews` omits pull request metadata and prints review data only.
- `--user <login>` filters to comments authored by that GitHub user. Repeat the flag to match multiple users.
- `--json` prints structured JSON instead of the default human-readable report.
- `--help` prints usage information.

For AI agents and scripts, prefer `--json --just-reviews` unless you specifically need PR metadata such as the title, branch names, or PR URL.

## Examples

Show unresolved review threads for the current PR:

```bash
bunx review-cli
```

Show unresolved threads for PR `123`:

```bash
bunx review-cli 123
```

Show only comments from specific reviewers:

```bash
bunx review-cli --user monalisa --user hubot
```

Show only the first 5 matching review threads without PR metadata:

```bash
bunx review-cli --filter 5 --just-reviews
```

Include resolved threads and emit JSON:

```bash
bunx review-cli 456 --include-resolved --json
```

## Output

Default output is a readable terminal report with PR metadata first, followed by matching threads and comments. Use `--just-reviews` when you only want the review data section.

Use `--json` when you want to pipe the result into another tool. For agent-oriented review triage, `--json --just-reviews` is usually the best default:

```bash
bunx review-cli --json --just-reviews
```
