import type OpenAI from "openai"

const ACCESS_MCP_RESOURCE_DESCRIPTION = `Read resource from connected MCP server by URI.`

const SERVER_NAME_PARAMETER_DESCRIPTION = `The name of the MCP server providing the resource`

const URI_PARAMETER_DESCRIPTION = `The URI identifying the specific resource to access`

export default {
	type: "function",
	function: {
		name: "access_mcp_resource",
		description: ACCESS_MCP_RESOURCE_DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				server_name: {
					type: "string",
					description: SERVER_NAME_PARAMETER_DESCRIPTION,
				},
				uri: {
					type: "string",
					description: URI_PARAMETER_DESCRIPTION,
				},
			},
			required: ["server_name", "uri"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
