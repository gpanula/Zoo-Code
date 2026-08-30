import type OpenAI from "openai"

const EXECUTE_COMMAND_DESCRIPTION = `Execute CLI command on system. Provide clear command explanation. Tailor to OS/shell.`

const COMMAND_PARAMETER_DESCRIPTION = `CLI command to execute`

const CWD_PARAMETER_DESCRIPTION = `Working directory for command, relative or absolute`

const TIMEOUT_PARAMETER_DESCRIPTION = `Timeout in seconds. For long-running/background processes`

export default {
	type: "function",
	function: {
		name: "execute_command",
		description: EXECUTE_COMMAND_DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				command: {
					type: "string",
					description: COMMAND_PARAMETER_DESCRIPTION,
				},
				cwd: {
					type: ["string", "null"],
					description: CWD_PARAMETER_DESCRIPTION,
				},
				timeout: {
					type: ["number", "null"],
					description: TIMEOUT_PARAMETER_DESCRIPTION,
				},
			},
			required: ["command", "cwd", "timeout"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
