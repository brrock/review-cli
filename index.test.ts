import { describe, expect, test } from "bun:test";

import {
  filterResult,
  formatHuman,
  parseArgs,
  shapeOutput,
  type CliOptions,
  type NormalizedThread,
  type PullRequestResult,
} from "./index";

function stripAnsi(value: string): string {
  const escape = String.fromCharCode(27);
  const ansiPattern = new RegExp(`${escape}\\[[0-9;]*m`, "g");
  return value.replace(ansiPattern, "");
}

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

const codeRabbitBody = `_⚠️ Potential issue_ | _🟠 Major_

**Replace \\b at regex start in \`findTextComponent\`.**

<details>
<summary>Suggested fix</summary>

\`\`\`diff
-  const pattern = /\\bfunction/;
+  const pattern = /(?:^|[,;{}])function/;
\`\`\`
</details>

<!-- suggestion_start -->

<details>
<summary>🤖 Prompt for AI Agents</summary>

\`\`\`
Verify each finding against the current code and only fix it if needed.
\`\`\`

</details>

<!-- This is an auto-generated comment by CodeRabbit -->`;

describe("parseArgs", () => {
  test("parses positional pr, json, include-resolved, and repeated users", () => {
    expect(
      parseArgs([
        "123",
        "--json",
        "--include-resolved",
        "--filter",
        "2",
        "--just-reviews",
        "--user",
        "Monalisa",
        "--user=hubot",
      ]),
    ).toEqual({
      help: false,
      json: true,
      includeResolved: true,
      filter: 2,
      justReviews: true,
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
    expect(() => parseArgs(["--filter"])).toThrow("Missing value for --filter.");
    expect(() => parseArgs(["--filter", "0"])).toThrow(
      "--filter must be a positive integer. Received: 0",
    );
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
      justReviews: false,
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
      justReviews: false,
      users: ["hubot"],
    };

    const result = filterResult(pullRequest, threads, options);

    expect(result.threadCount).toBe(2);
    expect(result.commentCount).toBe(2);
    expect(result.threads[0]?.comments.map((comment) => comment.author)).toEqual(["hubot"]);
  });

  test("limits the number of matching review threads", () => {
    const result = filterResult(pullRequest, threads, {
      help: false,
      json: false,
      includeResolved: true,
      filter: 1,
      justReviews: false,
      users: [],
    });

    expect(result.threadCount).toBe(1);
    expect(result.commentCount).toBe(2);
    expect(result.threads.map((thread) => thread.id)).toEqual(["thread-1"]);
  });
});

describe("formatHuman", () => {
  test("renders a readable summary", () => {
    const result = filterResult(pullRequest, threads, {
      help: false,
      json: false,
      includeResolved: false,
      justReviews: false,
      users: ["monalisa"],
    });

    const output = stripAnsi(formatHuman(result));

    expect(output).toContain("PR #42: Tighten review CLI output");
    expect(output).toContain("Filters: unresolved only; users: monalisa");
    expect(output).toContain("[UNRESOLVED] src/index.ts:12");
    expect(output).toContain("Please rename this variable.");
  });

  test("renders suggestion blocks cleanly", () => {
    const suggestionResult = filterResult(
      pullRequest,
      [
        {
          ...threads[0]!,
          comments: [
            {
              ...threads[0]!.comments[0]!,
              body: "```suggestion\nconst betterName = true;\n```\n\nPlease apply this.",
              bodyText: "Suggested change\n      \n  const betterName = true;\n\nPlease apply this.",
              diffHunk: "@@ -12,1 +12,1 @@\n-const oldName = true;\n+const betterName = true;",
            },
          ],
        },
      ],
        {
          help: false,
          json: false,
          includeResolved: false,
          justReviews: false,
          users: [],
        },
      );

    const output = stripAnsi(formatHuman(suggestionResult));

    expect(output).toContain("Suggested change:");
    expect(output).toContain("- const oldName = true;");
    expect(output).toContain("+ const betterName = true;");
    expect(output).toContain("Please apply this.");
  });

  test("renders an empty state", () => {
    const result = filterResult(pullRequest, threads, {
      help: false,
      json: false,
      includeResolved: false,
      justReviews: false,
      users: ["nobody"],
    });

    expect(stripAnsi(formatHuman(result))).toContain("No matching review threads found.");
  });

  test("omits pull request metadata in just-reviews mode", () => {
    const result = filterResult(pullRequest, threads, {
      help: false,
      json: false,
      includeResolved: false,
      justReviews: true,
      users: [],
    });

    const output = stripAnsi(formatHuman(result));

    expect(output).toContain("Review data");
    expect(output).not.toContain("PR #42: Tighten review CLI output");
    expect(output).not.toContain("Repository:");
  });

  test("formats CodeRabbit comments without raw html boilerplate", () => {
    const result = filterResult(
      pullRequest,
      [
        {
          ...threads[0]!,
          comments: [
            {
              ...threads[0]!.comments[0]!,
              author: "coderabbitai",
              body: codeRabbitBody,
              bodyText: "Potential issue",
            },
          ],
        },
      ],
      {
        help: false,
        json: false,
        includeResolved: false,
        justReviews: true,
        users: [],
      },
    );

    const output = stripAnsi(formatHuman(result));

    expect(output).toContain("⚠️ Potential issue | 🟠 Major");
    expect(output).toContain("Suggested fix:");
    expect(output).toContain("-  const pattern = /\\bfunction/;");
    expect(output).toContain("+  const pattern = /(?:^|[,;{}])function/;");
    expect(output).toContain("🤖 Prompt for AI Agents:");
    expect(output).toContain("Verify each finding against the current code and only fix it if needed.");
    expect(output).not.toContain("<details>");
    expect(output).not.toContain("<!--");
    expect(output).not.toContain("```");
  });
});

describe("shapeOutput", () => {
  test("drops pull request data in just-reviews mode", () => {
    const result = filterResult(pullRequest, threads, {
      help: false,
      json: true,
      includeResolved: false,
      justReviews: true,
      users: [],
    });

    expect(shapeOutput(result)).toEqual({
      filters: {
        includeResolved: false,
        justReviews: true,
        reviewLimit: null,
        users: [],
      },
      threadCount: 1,
      commentCount: 2,
      threads: [result.threads[0]!],
    });
  });
});
