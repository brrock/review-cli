import { describe, expect, test } from "bun:test";

import {
  filterResult,
  formatHuman,
  parseArgs,
  type CliOptions,
  type NormalizedThread,
  type PullRequestResult,
} from "./index";

const pullRequest: PullRequestResult["pullRequest"] = {
  number: 42,
  title: "Tighten review CLI output",
  url: "https://github.com/octo/repo/pull/42",
  state: "OPEN",
  isDraft: false,
  author: "octocat",
  baseRefName: "main",
  headRefName: "feature/review-cli",
  repository: "octo/repo",
};

const threads: NormalizedThread[] = [
  {
    id: "thread-1",
    isResolved: false,
    isOutdated: false,
    path: "src/index.ts",
    line: 12,
    originalLine: 12,
    startLine: null,
    originalStartLine: null,
    diffSide: "RIGHT",
    startDiffSide: null,
    resolvedBy: null,
    url: "https://github.com/octo/repo/pull/42#discussion_r1",
    comments: [
      {
        id: "comment-1",
        author: "monalisa",
        body: "Please rename this variable.",
        bodyText: "Please rename this variable.",
        createdAt: "2026-03-25T19:00:00Z",
        url: "https://github.com/octo/repo/pull/42#discussion_r1",
        path: "src/index.ts",
        outdated: false,
        line: 12,
        originalLine: 12,
        startLine: null,
        originalStartLine: null,
        diffHunk: null,
        replyToId: null,
        review: {
          id: "review-1",
          state: "COMMENTED",
          submittedAt: "2026-03-25T19:01:00Z",
          url: "https://github.com/octo/repo/pull/42/files",
          author: "monalisa",
        },
      },
      {
        id: "comment-2",
        author: "hubot",
        body: "Done.",
        bodyText: "Done.",
        createdAt: "2026-03-25T19:05:00Z",
        url: "https://github.com/octo/repo/pull/42#discussion_r2",
        path: "src/index.ts",
        outdated: false,
        line: 12,
        originalLine: 12,
        startLine: null,
        originalStartLine: null,
        diffHunk: null,
        replyToId: "comment-1",
        review: null,
      },
    ],
  },
  {
    id: "thread-2",
    isResolved: true,
    isOutdated: true,
    path: "src/other.ts",
    line: 30,
    originalLine: 28,
    startLine: 29,
    originalStartLine: 27,
    diffSide: "RIGHT",
    startDiffSide: "RIGHT",
    resolvedBy: "hubot",
    url: "https://github.com/octo/repo/pull/42#discussion_r3",
    comments: [
      {
        id: "comment-3",
        author: "hubot",
        body: "Looks good now.",
        bodyText: "Looks good now.",
        createdAt: "2026-03-25T19:10:00Z",
        url: "https://github.com/octo/repo/pull/42#discussion_r3",
        path: "src/other.ts",
        outdated: true,
        line: 30,
        originalLine: 28,
        startLine: 29,
        originalStartLine: 27,
        diffHunk: null,
        replyToId: null,
        review: {
          id: "review-2",
          state: "APPROVED",
          submittedAt: "2026-03-25T19:11:00Z",
          url: "https://github.com/octo/repo/pull/42/files",
          author: "hubot",
        },
      },
    ],
  },
];

describe("parseArgs", () => {
  test("parses positional pr, json, include-resolved, and repeated users", () => {
    expect(
      parseArgs(["123", "--json", "--include-resolved", "--user", "Monalisa", "--user=hubot"]),
    ).toEqual({
      help: false,
      json: true,
      includeResolved: true,
      prNumber: 123,
      users: ["Monalisa", "hubot"],
    });
  });

  test("deduplicates users case-insensitively", () => {
    expect(parseArgs(["--user", "Monalisa", "--user", "monalisa"]).users).toEqual(["Monalisa"]);
  });

  test("rejects invalid input", () => {
    expect(() => parseArgs(["abc"])).toThrow("PR number must be a positive integer. Received: abc");
    expect(() => parseArgs(["1", "2"])).toThrow("Unexpected extra positional argument: 2");
    expect(() => parseArgs(["--user"])).toThrow("Missing value for --user.");
    expect(() => parseArgs(["--bogus"])).toThrow("Unknown flag: --bogus");
  });
});

describe("filterResult", () => {
  test("keeps unresolved threads by default", () => {
    const options: CliOptions = {
      help: false,
      json: false,
      includeResolved: false,
      users: [],
    };

    const result = filterResult(pullRequest, threads, options);

    expect(result.threadCount).toBe(1);
    expect(result.commentCount).toBe(2);
    expect(result.threads[0]?.id).toBe("thread-1");
  });

  test("filters comments to selected users and keeps matching threads", () => {
    const options: CliOptions = {
      help: false,
      json: false,
      includeResolved: true,
      users: ["hubot"],
    };

    const result = filterResult(pullRequest, threads, options);

    expect(result.threadCount).toBe(2);
    expect(result.commentCount).toBe(2);
    expect(result.threads[0]?.comments.map((comment) => comment.author)).toEqual(["hubot"]);
  });
});

describe("formatHuman", () => {
  test("renders a readable summary", () => {
    const result = filterResult(pullRequest, threads, {
      help: false,
      json: false,
      includeResolved: false,
      users: ["monalisa"],
    });

    expect(formatHuman(result)).toContain("PR #42: Tighten review CLI output");
    expect(formatHuman(result)).toContain("Filters: unresolved only; users: monalisa");
    expect(formatHuman(result)).toContain("[UNRESOLVED] src/index.ts:12");
    expect(formatHuman(result)).toContain("Please rename this variable.");
  });

  test("renders an empty state", () => {
    const result = filterResult(pullRequest, threads, {
      help: false,
      json: false,
      includeResolved: false,
      users: ["nobody"],
    });

    expect(formatHuman(result)).toContain("No matching review threads found.");
  });
});
