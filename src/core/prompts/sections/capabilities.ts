import { McpHub } from "../../../services/mcp/McpHub"

/**
 * Builds the CAPABILITIES section of the system prompt.
 *
 * The MCP availability line is only emitted when at least one MCP server is actually
 * exposed to the current mode. When `allowedMcpServers` is provided, the hub's server
 * list is filtered by that allowlist BEFORE deciding whether to advertise MCP, so the
 * capability text matches the per-mode tool exposure:
 *   - `undefined` allowlist  → all connected servers count (backward compatible)
 *   - empty `[]` allowlist   → no servers count ⇒ MCP line omitted
 *   - populated allowlist    → only listed servers count
 *
 * @param cwd Current working directory used in the prompt text.
 * @param mcpHub Optional MCP hub. When omitted, the MCP line is never emitted.
 * @param allowedMcpServers Optional per-mode allowlist of MCP server names. When provided,
 *   the hub's servers are filtered to this set before determining MCP availability.
 */
export function getCapabilitiesSection(cwd: string, mcpHub?: McpHub, allowedMcpServers?: string[]): string {
	// Determine whether any MCP server is actually available to the current mode.
	// Filtering the hub's servers by the allowlist (when provided) keeps the capability
	// text consistent with the tools that are exposed for the mode.
	let hasMcpServers = false
	if (mcpHub) {
		let servers = mcpHub.getServers()
		if (allowedMcpServers) {
			const allowSet = new Set(allowedMcpServers)
			servers = servers.filter((server) => allowSet.has(server.name))
		}
		hasMcpServers = servers.length > 0
	}

	return `====

CAPABILITIES

- Tools available: execute CLI commands, list/search files, read/write/edit code, ask follow-up questions. Use tools directly to accomplish tasks.
- \`environment_details\` includes initial workspace file paths ('${cwd}') for project structure context. Use \`list_files\` (\`recursive=true\` for deep trees, \`recursive=false\` for top-level) to explore further.
- Use \`execute_command\` for CLI tasks on user system. Explain command intent. Complex CLI commands preferred over scripts. Interactive/long-running commands supported; background commands provide status updates.${
		hasMcpServers
			? `
- Connected MCP servers provide additional specialized tools and resources.
`
			: ""
	}`
}
