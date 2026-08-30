import type OpenAI from "openai"

const CODEBASE_SEARCH_DESCRIPTION = `Semantic search across codebase.`

const QUERY_PARAMETER_DESCRIPTION = `Meaning-based search query describing the information you need`

const PATH_PARAMETER_DESCRIPTION = `Optional subdirectory (relative to the workspace) to limit the search scope`

export default {
	type: "function",
	function: {
		name: "codebase_search",
		description: CODEBASE_SEARCH_DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: QUERY_PARAMETER_DESCRIPTION,
				},
				path: {
					type: ["string", "null"],
					description: PATH_PARAMETER_DESCRIPTION,
				},
			},
			required: ["query", "path"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
