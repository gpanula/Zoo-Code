import type OpenAI from "openai"

const WRITE_TO_FILE_DESCRIPTION = `Write complete file contents. Creates new file or overwrites existing. Prefer diff/edit tools for modifications. NO partial content or placeholders — provide full file always.`

const PATH_PARAMETER_DESCRIPTION = `File path relative to workspace directory`

const CONTENT_PARAMETER_DESCRIPTION = `Complete intended content of file without omissions`

export default {
	type: "function",
	function: {
		name: "write_to_file",
		description: WRITE_TO_FILE_DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: PATH_PARAMETER_DESCRIPTION,
				},
				content: {
					type: "string",
					description: CONTENT_PARAMETER_DESCRIPTION,
				},
			},
			required: ["path", "content"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
