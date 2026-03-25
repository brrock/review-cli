#!/usr/bin/env bun
const textDecoder = new TextDecoder();

const REVIEW_THREADS_QUERY = `
  query ReviewThreads($owner: String!, $name: String!, $number: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        number
        title
        url
        state
        isDraft
        author {
          login
        }
        baseRefName
        headRefName
        reviewThreads(first: 50, after: $after) {
          nodes {
            id
            isResolved
            isOutdated
            path
            line
            originalLine
            startLine
            originalStartLine
            diffSide
            startDiffSide
            resolvedBy {
              login
            }
            comments(first: 100) {
              nodes {
                id
                body
                bodyText
                createdAt
                url
                path
                outdated
                line
                originalLine
                startLine
                originalStartLine
                diffHunk
                replyTo {
                  id
                }
                author {
                  login
                }
                pullRequestReview {
                  id
                  state
                  submittedAt
                  url
                  author {
                    login
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

const THREAD_COMMENTS_QUERY = `
  query ReviewThreadComments($threadId: ID!, $after: String) {
    node(id: $threadId) {
      ... on PullRequestReviewThread {
        comments(first: 100, after: $after) {
          nodes {
            id
            body
            bodyText
            createdAt
            url
            path
            outdated
            line
            originalLine
            startLine
            originalStartLine
            diffHunk
            replyTo {
              id
            }
            author {
              login
            }
            pullRequestReview {
              id
              state
              submittedAt
              url
              author {
                login
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

export type CliOptions = {
  help: boolean;
  json: boolean;
  includeResolved: boolean;
  prNumber?: number;
  users: string[];
};

type RepoInfo = {
  name: string;
  owner: {
    login: string;
  };
};

type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{
    message: string;
  }>;
};

type RawCommentNode = {
  id: string;
  body: string;
  bodyText: string;
  createdAt: string;
  url: string;
  path: string | null;
  outdated: boolean;
  line: number | null;
  originalLine: number | null;
  startLine: number | null;
  originalStartLine: number | null;
  diffHunk: string | null;
  replyTo: {
    id: string;
  } | null;
  author: {
    login: string;
  } | null;
  pullRequestReview: {
    id: string;
    state: string;
    submittedAt: string | null;
    url: string;
    author: {
      login: string;
    } | null;
  } | null;
};

type RawThreadNode = {
  id: string;
  isResolved: boolean;
  isOutdated: boolean;
  path: string | null;
  line: number | null;
  originalLine: number | null;
  startLine: number | null;
  originalStartLine: number | null;
  diffSide: string | null;
  startDiffSide: string | null;
  resolvedBy: {
    login: string;
  } | null;
  comments: {
    nodes: RawCommentNode[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

type ReviewThreadsResponse = GraphQlResponse<{
  repository: {
    pullRequest: {
      number: number;
      title: string;
      url: string;
      state: string;
      isDraft: boolean;
      author: {
        login: string;
      } | null;
      baseRefName: string;
      headRefName: string;
      reviewThreads: {
        nodes: RawThreadNode[];
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    } | null;
  } | null;
}>;

type ThreadCommentsResponse = GraphQlResponse<{
  node: {
    comments: {
      nodes: RawCommentNode[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  } | null;
}>;

export type NormalizedComment = {
  id: string;
  author: string | null;
  body: string;
  bodyText: string;
  createdAt: string;
  url: string;
  path: string | null;
  outdated: boolean;
  line: number | null;
  originalLine: number | null;
  startLine: number | null;
  originalStartLine: number | null;
  diffHunk: string | null;
  replyToId: string | null;
  review: {
    id: string;
    state: string;
    submittedAt: string | null;
    url: string;
    author: string | null;
  } | null;
};

export type NormalizedThread = {
  id: string;
  isResolved: boolean;
  isOutdated: boolean;
  path: string | null;
  line: number | null;
  originalLine: number | null;
  startLine: number | null;
  originalStartLine: number | null;
  diffSide: string | null;
  startDiffSide: string | null;
  resolvedBy: string | null;
  url: string | null;
  comments: NormalizedComment[];
};

export type PullRequestResult = {
  pullRequest: {
    number: number;
    title: string;
    url: string;
    state: string;
    isDraft: boolean;
    author: string | null;
    baseRefName: string;
    headRefName: string;
    repository: string;
  };
  filters: {
    includeResolved: boolean;
    users: string[];
  };
  threadCount: number;
  commentCount: number;
  threads: NormalizedThread[];
};

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    help: false,
    json: false,
    includeResolved: false,
    users: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) {
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }

    if (argument === "--json" || argument === "-j") {
      options.json = true;
      continue;
    }

    if (argument === "--include-resolved") {
      options.includeResolved = true;
      continue;
    }

    if (argument === "--user" || argument === "-u") {
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("Missing value for --user.");
      }
      options.users.push(value);
      index += 1;
      continue;
    }

    if (argument.startsWith("--user=")) {
      const value = argument.slice("--user=".length);
      if (!value) {
        throw new Error("Missing value for --user.");
      }
      options.users.push(value);
      continue;
    }

    if (argument.startsWith("-")) {
      throw new Error(`Unknown flag: ${argument}`);
    }

    if (options.prNumber !== undefined) {
      throw new Error(`Unexpected extra positional argument: ${argument}`);
    }

    options.prNumber = parsePrNumber(argument);
  }

  options.users = normalizeUsers(options.users);
  return options;
}

export function usage(scriptName = "review-cli"): string {
  return [
    `Usage: ${scriptName} [pr-number] [options]`,
    "",
    "Inspect PR review threads/comments with GitHub CLI.",
    "",
    "Arguments:",
    "  pr-number               PR number to inspect. Defaults to the current PR.",
    "",
    "Options:",
    "  --include-resolved      Include resolved review threads.",
    "  --user, -u <login>      Filter to comments authored by this GitHub user.",
    "                          Repeat the flag to match multiple users.",
    "  --json, -j              Emit JSON instead of human-readable output.",
    "  --help, -h              Show this help message.",
    "",
    "Examples:",
    `  ${scriptName}`,
    `  ${scriptName} 123`,
    `  ${scriptName} --user monalisa --user hubot`,
    `  ${scriptName} 456 --include-resolved --json`,
  ].join("\n");
}

export function filterResult(
  pullRequest: PullRequestResult["pullRequest"],
  threads: NormalizedThread[],
  options: CliOptions,
): PullRequestResult {
  const userFilter = new Set(options.users.map((user) => user.toLowerCase()));

  const filteredThreads = threads
    .filter((thread) => options.includeResolved || !thread.isResolved)
    .map((thread) => {
      if (userFilter.size === 0) {
        return thread;
      }

      const comments = thread.comments.filter((comment) =>
        comment.author ? userFilter.has(comment.author.toLowerCase()) : false,
      );

      return {
        ...thread,
        comments,
        url: comments[0]?.url ?? thread.url,
      };
    })
    .filter((thread) => thread.comments.length > 0);

  return {
    pullRequest,
    filters: {
      includeResolved: options.includeResolved,
      users: [...options.users],
    },
    threadCount: filteredThreads.length,
    commentCount: filteredThreads.reduce((total, thread) => total + thread.comments.length, 0),
    threads: filteredThreads,
  };
}

export function formatHuman(result: PullRequestResult): string {
  const palette = createPalette();
  const header = [
    `${palette.bold(`PR #${result.pullRequest.number}: ${result.pullRequest.title}`)}`,
    `${palette.label("Repository:")} ${result.pullRequest.repository}`,
    `${palette.label("URL:")} ${palette.link(result.pullRequest.url)}`,
    `${palette.label("State:")} ${formatState(result.pullRequest.state, result.pullRequest.isDraft, palette)}`,
    `${palette.label("Author:")} ${palette.author(result.pullRequest.author ?? "unknown")}`,
    `${palette.label("Branch:")} ${result.pullRequest.headRefName} -> ${result.pullRequest.baseRefName}`,
    `${palette.label("Filters:")} ${result.filters.includeResolved ? "including resolved" : "unresolved only"}; users: ${result.filters.users.length > 0 ? result.filters.users.join(", ") : "all"}`,
    `${palette.label("Matches:")} ${result.threadCount} thread(s), ${result.commentCount} comment(s)`,
  ];

  if (result.threads.length === 0) {
    return [...header, "", "No matching review threads found."].join("\n");
  }

  const threadBlocks = result.threads.map((thread, index) => {
    const status = thread.isResolved ? palette.resolved("RESOLVED") : palette.unresolved("UNRESOLVED");
    const lines = [
      `${palette.index(`${index + 1}.`)} [${status}] ${palette.path(formatThreadLocation(thread))}`,
      `   ${palette.label("Outdated:")} ${thread.isOutdated ? palette.warning("yes") : "no"}`,
    ];

    if (thread.resolvedBy) {
      lines.push(`   ${palette.label("Resolved by:")} ${palette.author(thread.resolvedBy)}`);
    }

    if (thread.url) {
      lines.push(`   ${palette.label("Thread URL:")} ${palette.link(thread.url)}`);
    }

    for (const comment of thread.comments) {
      const reviewBits = [
        comment.review?.state,
        comment.review?.author ? `review by ${comment.review.author}` : null,
      ].filter(Boolean);

      lines.push(
        `   ${palette.bullet("-")} ${palette.author(comment.author ?? "unknown")} ${palette.dim("on")} ${palette.date(comment.createdAt)}${reviewBits.length > 0 ? ` ${palette.dim(`(${reviewBits.join(", ")})`)}` : ""}`,
      );

      for (const bodyLine of formatCommentBody(comment, palette)) {
        lines.push(`     ${bodyLine}`);
      }

      lines.push(`     ${palette.label("URL:")} ${palette.link(comment.url)}`);
    }

    return lines.join("\n");
  });

  return [...header, "", ...threadBlocks].join("\n");
}

function parsePrNumber(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`PR number must be a positive integer. Received: ${value}`);
  }

  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`PR number must be a positive integer. Received: ${value}`);
  }

  return number;
}

function normalizeUsers(users: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const user of users) {
    const trimmed = user.trim();
    if (!trimmed) {
      throw new Error("GitHub usernames provided via --user cannot be empty.");
    }

    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(trimmed);
    }
  }

  return normalized;
}

function decode(bytes: Uint8Array): string {
  return textDecoder.decode(bytes).trim();
}

function runGhJson<T>(args: string[]): T {
  const process = Bun.spawnSync({
    cmd: ["gh", ...args],
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = decode(process.stdout);
  const stderr = decode(process.stderr);

  if (process.exitCode !== 0) {
    throw new Error(stderr || stdout || `gh ${args.join(" ")} failed.`);
  }

  if (!stdout) {
    throw new Error(`gh ${args.join(" ")} returned no output.`);
  }

  try {
    return JSON.parse(stdout) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from gh ${args.join(" ")}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function resolveRepository(): RepoInfo {
  try {
    return runGhJson<RepoInfo>(["repo", "view", "--json", "name,owner"]);
  } catch (error) {
    throw new Error(
      `Unable to determine the current GitHub repository. Run this command inside a GitHub checkout with gh configured. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function resolvePullRequestNumber(explicitPrNumber?: number): number {
  if (explicitPrNumber !== undefined) {
    return explicitPrNumber;
  }

  try {
    const response = runGhJson<{ number: number }>(["pr", "view", "--json", "number"]);
    return response.number;
  } catch (error) {
    throw new Error(
      `Unable to resolve the current pull request. Provide a PR number or run this command from a branch associated with a PR. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function runGraphQl<T>(query: string, fields: Record<string, string | number>): T {
  const args = ["api", "graphql", "-f", `query=${query}`];

  for (const [key, value] of Object.entries(fields)) {
    args.push("-F", `${key}=${value}`);
  }

  return runGhJson<T>(args);
}

function fetchAdditionalComments(
  threadId: string,
  initialNodes: RawCommentNode[],
  after: string | null,
): RawCommentNode[] {
  const comments = [...initialNodes];
  let cursor = after;

  while (cursor) {
    const response = runGraphQl<ThreadCommentsResponse>(THREAD_COMMENTS_QUERY, {
      threadId,
      after: cursor,
    });

    if (response.errors?.length) {
      throw new Error(response.errors.map((entry) => entry.message).join("; "));
    }

    const commentConnection = response.data?.node?.comments;
    if (!commentConnection) {
      throw new Error(`Failed to load additional comments for thread ${threadId}.`);
    }

    comments.push(...commentConnection.nodes);
    cursor = commentConnection.pageInfo.hasNextPage ? commentConnection.pageInfo.endCursor : null;
  }

  return comments;
}

function normalizeComment(comment: RawCommentNode): NormalizedComment {
  return {
    id: comment.id,
    author: comment.author?.login ?? null,
    body: comment.body,
    bodyText: comment.bodyText,
    createdAt: comment.createdAt,
    url: comment.url,
    path: comment.path,
    outdated: comment.outdated,
    line: comment.line,
    originalLine: comment.originalLine,
    startLine: comment.startLine,
    originalStartLine: comment.originalStartLine,
    diffHunk: comment.diffHunk,
    replyToId: comment.replyTo?.id ?? null,
    review: comment.pullRequestReview
      ? {
          id: comment.pullRequestReview.id,
          state: comment.pullRequestReview.state,
          submittedAt: comment.pullRequestReview.submittedAt,
          url: comment.pullRequestReview.url,
          author: comment.pullRequestReview.author?.login ?? null,
        }
      : null,
  };
}

function normalizeThread(thread: RawThreadNode): NormalizedThread {
  const allComments = thread.comments.pageInfo.hasNextPage
    ? fetchAdditionalComments(thread.id, thread.comments.nodes, thread.comments.pageInfo.endCursor)
    : thread.comments.nodes;

  const comments = allComments.map(normalizeComment);

  return {
    id: thread.id,
    isResolved: thread.isResolved,
    isOutdated: thread.isOutdated,
    path: thread.path,
    line: thread.line,
    originalLine: thread.originalLine,
    startLine: thread.startLine,
    originalStartLine: thread.originalStartLine,
    diffSide: thread.diffSide,
    startDiffSide: thread.startDiffSide,
    resolvedBy: thread.resolvedBy?.login ?? null,
    url: comments[0]?.url ?? null,
    comments,
  };
}

function fetchPullRequestResult(
  owner: string,
  name: string,
  prNumber: number,
  options: CliOptions,
): PullRequestResult {
  let cursor: string | null = null;
  let pullRequest: PullRequestResult["pullRequest"] | undefined;
  const threads: NormalizedThread[] = [];

  do {
    const response: ReviewThreadsResponse = runGraphQl(REVIEW_THREADS_QUERY, {
      owner,
      name,
      number: prNumber,
      ...(cursor ? { after: cursor } : {}),
    });

    if (response.errors?.length) {
      throw new Error(
        response.errors.map((entry: { message: string }) => entry.message).join("; "),
      );
    }

    const repository: ReviewThreadsResponse["data"] extends infer T
      ? T extends { repository: (infer R) | null }
        ? R | null | undefined
        : never
      : never = response.data?.repository;
    if (!repository?.pullRequest) {
      throw new Error(`Pull request #${prNumber} was not found.`);
    }

    const pr: NonNullable<typeof repository.pullRequest> = repository.pullRequest;
    if (!pullRequest) {
      pullRequest = {
        number: pr.number,
        title: pr.title,
        url: pr.url,
        state: pr.state,
        isDraft: pr.isDraft,
        author: pr.author?.login ?? null,
        baseRefName: pr.baseRefName,
        headRefName: pr.headRefName,
        repository: `${owner}/${name}`,
      };
    }

    threads.push(...pr.reviewThreads.nodes.map(normalizeThread));
    cursor = pr.reviewThreads.pageInfo.hasNextPage ? pr.reviewThreads.pageInfo.endCursor : null;
  } while (cursor);

  if (!pullRequest) {
    throw new Error(`Pull request #${prNumber} was not found.`);
  }

  return filterResult(pullRequest, threads, options);
}

function formatThreadLocation(thread: NormalizedThread): string {
  if (!thread.path) {
    return "unknown location";
  }

  const start = thread.startLine ?? thread.originalStartLine;
  const end = thread.line ?? thread.originalLine;

  if (start && end && start !== end) {
    return `${thread.path}:${start}-${end}`;
  }

  if (end) {
    return `${thread.path}:${end}`;
  }

  if (start) {
    return `${thread.path}:${start}`;
  }

  return thread.path;
}

type Palette = ReturnType<typeof createPalette>;

function formatCommentBody(comment: NormalizedComment, palette: Palette): string[] {
  const blocks = parseCommentBlocks(comment.body);
  if (blocks.length === 0) {
    const text = comment.bodyText.trim() || comment.body.trim();
    return [text || "[empty comment]"];
  }

  const rendered: string[] = [];
  const diffPreview = extractDiffPreview(comment.diffHunk);

  for (const block of blocks) {
    if (block.kind === "text") {
      for (const line of renderTextBlock(block.value)) {
        rendered.push(line);
      }
      continue;
    }

    rendered.push(palette.suggestionLabel("Suggested change:"));
    for (const line of diffPreview.removed) {
      rendered.push(`${palette.removedPrefix("-")} ${palette.removedText(line || " ")}`);
    }

    const suggestionLines = block.value.length > 0 ? block.value : [""];
    for (const line of suggestionLines) {
      rendered.push(`${palette.suggestionPrefix("+")} ${palette.suggestionText(line || " ")}`);
    }
  }

  return rendered.length > 0 ? rendered : ["[empty comment]"];
}

function renderTextBlock(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed.split("\n").map((line) => line.trimEnd());
}

function parseCommentBlocks(body: string): Array<
  | { kind: "text"; value: string }
  | { kind: "suggestion"; value: string[] }
> {
  if (!body.trim()) {
    return [];
  }

  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: Array<
    | { kind: "text"; value: string }
    | { kind: "suggestion"; value: string[] }
  > = [];
  let textBuffer: string[] = [];
  let suggestionBuffer: string[] | null = null;

  const flushText = () => {
    if (textBuffer.length === 0) {
      return;
    }

    const value = textBuffer.join("\n").trim();
    if (value) {
      blocks.push({ kind: "text", value });
    }
    textBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```suggestion")) {
      flushText();
      suggestionBuffer = [];
      continue;
    }

    if (trimmed === "```" && suggestionBuffer) {
      blocks.push({ kind: "suggestion", value: trimBlankEdges(suggestionBuffer) });
      suggestionBuffer = null;
      continue;
    }

    if (suggestionBuffer) {
      suggestionBuffer.push(line);
      continue;
    }

    textBuffer.push(line);
  }

  if (suggestionBuffer) {
    blocks.push({ kind: "suggestion", value: trimBlankEdges(suggestionBuffer) });
  }

  flushText();
  return blocks;
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start]?.trim() === "") {
    start += 1;
  }

  while (end > start && lines[end - 1]?.trim() === "") {
    end -= 1;
  }

  return lines.slice(start, end).map((line) => line.replace(/\t/g, "  "));
}

function extractDiffPreview(diffHunk: string | null): {
  removed: string[];
} {
  if (!diffHunk?.trim()) {
    return { removed: [] };
  }

  const removed: string[] = [];

  for (const line of diffHunk.replace(/\r\n/g, "\n").split("\n")) {
    if (line.startsWith("@@")) {
      continue;
    }

    if (line.startsWith("---") || line.startsWith("+++")) {
      continue;
    }

    if (line.startsWith("-")) {
      removed.push(line.slice(1));
    }
  }

  return { removed: trimBlankEdges(removed) };
}

function formatState(state: string, isDraft: boolean, palette: Palette): string {
  const value = isDraft ? `${state} (draft)` : state;
  if (state === "OPEN") {
    return palette.label(value);
  }
  if (state === "MERGED") {
    return palette.resolved(value);
  }
  return palette.warning(value);
}

function supportsColor(): boolean {
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }

  if (process.env.FORCE_COLOR !== undefined) {
    return process.env.FORCE_COLOR !== "0";
  }

  return Boolean(process.stdout?.isTTY);
}

function createPalette() {
  const enabled = supportsColor();
  const color = (code: number) => (value: string) =>
    enabled ? `\u001b[${code}m${value}\u001b[0m` : value;
  const bold = (value: string) => (enabled ? `\u001b[1m${value}\u001b[0m` : value);
  const dim = color(2);
  const blue = color(34);
  const cyan = color(36);
  const green = color(32);
  const yellow = color(33);
  const magenta = color(35);
  const red = color(31);
  const gray = color(90);

  return {
    bold,
    dim,
    label: cyan,
    link: blue,
    author: magenta,
    path: bold,
    date: gray,
    bullet: yellow,
    index: bold,
    unresolved: red,
    resolved: green,
    warning: yellow,
    suggestionLabel: yellow,
    removedPrefix: red,
    removedText: red,
    suggestionPrefix: green,
    suggestionText: green,
  };
}

export function execute(options: CliOptions): PullRequestResult {
  const repository = resolveRepository();
  const prNumber = resolvePullRequestNumber(options.prNumber);

  return fetchPullRequestResult(repository.owner.login, repository.name, prNumber, options);
}

export function main(argv: string[]): string {
  const options = parseArgs(argv);
  if (options.help) {
    return usage("bunx review-cli");
  }

  const result = execute(options);
  return options.json ? JSON.stringify(result, null, 2) : formatHuman(result);
}

if (import.meta.main) {
  try {
    console.log(main(Bun.argv.slice(2)));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
