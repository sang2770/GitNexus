---
name: gitnexus-pr-review
description: Run a structured GitNexus MCP-based PR review to detect blast radius, dependency risks, and missing tests.
argument-hint: "<PR summary or changed files> [optional: strictness level]"
user-invocable: true
disable-model-invocation: false
---

# Skill: GitNexus PR Review

Use this skill when the user asks for PR review, risk analysis, or impact validation.

## Steps
1. Collect changed files and infer touched symbols.
2. Use GitNexus MCP tools to inspect impact and dependency graph around those symbols.
3. Identify likely runtime breakage points and hidden coupling.
4. Produce findings sorted by severity.
5. Propose exact test additions for the highest-risk paths.

## Report template
- Scope reviewed
- Findings (critical/high/medium/low)
- Test gaps
- Merge confidence

## Checklist
Use the checklist in [review checklist](./review-checklist.md) before finalizing.

## Notes
- If graph data is stale, ask to refresh index first.
- Prefer focused fixes over large refactors.
