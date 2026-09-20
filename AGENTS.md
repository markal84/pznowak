<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project tooling preference

For Vercel platform operations, choose the single most appropriate capability
for the task. Prefer the official `@Vercel` connector for remote project and
account operations. Use a focused Vercel skill when it adds implementation
guidance that the connector does not provide, and use Vercel CLI when the
connector does not expose the required operation. Avoid loading overlapping
skills and connector documentation for the same simple action.
