import type OpenAI from "openai"

const EDIT_FILE_DESCRIPTION = `Replace text in existing file or create new file (empty old_string). Literal string replacement with line ending normalization.`

const edit_file = {
	type: "function",
	function: {
		name: "edit_file",
		description: EDIT_FILE_DESCRIPTION,
		parameters: {
			type: "object",
			properties: {
				file_path: {
					type: "string",
					description:
						"The path to the file to modify or create. You can use either a relative path in the workspace or an absolute path. If an absolute path is provided, it will be preserved as is.",
				},
				old_string: {
					type: "string",
					description:
						"The exact literal text to replace (must match the file contents exactly, including all whitespace and indentation). For single replacements (default), include at least 3 lines of context BEFORE and AFTER the target text. Use empty string to create a new file.",
				},
				new_string: {
					type: "string",
					description:
						"The exact literal text to replace old_string with. When creating a new file (old_string is empty), this becomes the file content.",
				},
				expected_replacements: {
					type: "number",
					description:
						"Number of replacements expected. Defaults to 1 if not specified. Use when you want to replace multiple occurrences of the same text.",
					minimum: 1,
				},
			},
			required: ["file_path", "old_string", "new_string"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool

export default edit_file
