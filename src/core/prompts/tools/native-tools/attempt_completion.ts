import type OpenAI from "openai"

const ATTEMPT_COMPLETION_DESCRIPTION = `Present final completed result to user. Must not end with questions or conversation offers.`

const RESULT_PARAMETER_DESCRIPTION = `Final result summary in terse caveman prose: bulleted changes and facts only; no filler.`

export default {
	type: "function",
	function: {
		name: "attempt_completion",
		description: ATTEMPT_COMPLETION_DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				result: {
					type: "string",
					description: RESULT_PARAMETER_DESCRIPTION,
				},
			},
			required: ["result"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
