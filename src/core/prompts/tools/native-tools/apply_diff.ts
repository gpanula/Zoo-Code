import type OpenAI from "openai"

const APPLY_DIFF_DESCRIPTION = `Apply targeted modifications to an existing file using SEARCH/REPLACE blocks. SEARCH block must match exact existing content.`

const DIFF_PARAMETER_DESCRIPTION = `SEARCH/REPLACE blocks. Format:
<<<<<<< SEARCH
:start_line:[line_number]
-------
[exact content to find]
=======
[new content]
>>>>>>> REPLACE`

export const apply_diff = {
	type: "function",
	function: {
		name: "apply_diff",
		description: APPLY_DIFF_DESCRIPTION,
		parameters: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "File path relative to workspace directory.",
				},
				diff: {
					type: "string",
					description: DIFF_PARAMETER_DESCRIPTION,
				},
			},
			required: ["path", "diff"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
