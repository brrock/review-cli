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

- `--include-resolved` includes resolved threads. By default, only unresolved threads are shown.
- `--user <login>` filters to comments authored by that GitHub user. Repeat the flag to match multiple users.
- `--json` prints structured JSON instead of the default human-readable report.
- `--help` prints usage information.

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

Include resolved threads and emit JSON:

```bash
bunx review-cli 456 --include-resolved --json
```

## Output

Default output is a readable terminal report with PR metadata first, followed by matching threads and comments.

Use `--json` when you want to pipe the result into another tool:

```bash
bunx review-cli --json
```
