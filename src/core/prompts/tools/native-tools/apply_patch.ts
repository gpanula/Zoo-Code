import type OpenAI from "openai"

const apply_patch_DESCRIPTION = `Apply patches to files. Supports creating, deleting, and modifying files.

Format:
*** Begin Patch
*** Add File: <path> (+content)
*** Delete File: <path>
*** Update File: <path>
*** Move to: <new path> (optional)
@@ context
 [context line]
-[removed line]
+[added line]
*** End Patch`

const apply_patch = {
	type: "function",
	function: {
		name: "apply_patch",
		description: apply_patch_DESCRIPTION,
		parameters: {
			type: "object",
			properties: {
				patch: {
					type: "string",
					description:
						"The complete patch text in the apply_patch format, starting with '*** Begin Patch' and ending with '*** End Patch'.",
				},
			},
			required: ["patch"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool

export default apply_patch
