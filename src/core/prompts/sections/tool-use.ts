export function getSharedToolUseSection(): string {
	return `====

TOOL USE

- Use native tool calls only. No XML.
- Call >=1 tool per action turn. Parallel tool calls preferred to minimize turns.
- Pick best tool per step (\`list_files\` over terminal \`ls\`).
- Execute iteratively based on prior outputs; never assume results.`
}
