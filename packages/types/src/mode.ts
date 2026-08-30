import { z } from "zod"

import { deprecatedToolGroups, toolGroupsSchema } from "./tool.js"

/**
 * GroupOptions
 */

export const groupOptionsSchema = z.object({
	fileRegex: z
		.string()
		.optional()
		.refine(
			(pattern) => {
				if (!pattern) {
					return true // Optional, so empty is valid.
				}

				try {
					new RegExp(pattern)
					return true
				} catch {
					return false
				}
			},
			{ message: "Invalid regular expression pattern" },
		),
	description: z.string().optional(),
})

export type GroupOptions = z.infer<typeof groupOptionsSchema>

/**
 * GroupEntry
 */

export const groupEntrySchema = z.union([toolGroupsSchema, z.tuple([toolGroupsSchema, groupOptionsSchema])])

export type GroupEntry = z.infer<typeof groupEntrySchema>

/**
 * ModeConfig
 */

/**
 * Checks if a group entry references a deprecated tool group.
 * Handles both string entries ("browser") and tuple entries (["browser", { ... }]).
 */
function isDeprecatedGroupEntry(entry: unknown): boolean {
	if (typeof entry === "string") {
		return deprecatedToolGroups.includes(entry)
	}
	if (Array.isArray(entry) && entry.length >= 1 && typeof entry[0] === "string") {
		return deprecatedToolGroups.includes(entry[0])
	}
	return false
}

/**
 * Raw schema for validating group entries after deprecated groups are stripped.
 */
const rawGroupEntryArraySchema = z.array(groupEntrySchema).refine(
	(groups) => {
		const seen = new Set()

		return groups.every((group) => {
			// For tuples, check the group name (first element).
			const groupName = Array.isArray(group) ? group[0] : group

			if (seen.has(groupName)) {
				return false
			}

			seen.add(groupName)
			return true
		})
	},
	{ message: "Duplicate groups are not allowed" },
)

/**
 * Schema for mode group entries. Preprocesses the input to strip deprecated
 * tool groups (e.g., "browser") before validation, ensuring backward compatibility
 * with older user configs.
 *
 * The type assertion to `z.ZodType<GroupEntry[], z.ZodTypeDef, GroupEntry[]>` is
 * required because `z.preprocess` erases the input type to `unknown`, which
 * propagates through `modeConfigSchema → rooCodeSettingsSchema → createRunSchema`
 * and breaks `zodResolver` generic inference in downstream consumers.
 */
export const groupEntryArraySchema = z.preprocess((val) => {
	if (!Array.isArray(val)) return val
	return val.filter((entry) => !isDeprecatedGroupEntry(entry))
}, rawGroupEntryArraySchema) as z.ZodType<GroupEntry[], z.ZodTypeDef, GroupEntry[]>

export const modeConfigSchema = z.object({
	slug: z.string().regex(/^[a-zA-Z0-9-]+$/, "Slug must contain only letters numbers and dashes"),
	name: z.string().min(1, "Name is required"),
	roleDefinition: z.string().min(1, "Role definition is required"),
	whenToUse: z.string().optional(),
	description: z.string().optional(),
	customInstructions: z.string().optional(),
	groups: groupEntryArraySchema,
	source: z.enum(["global", "project"]).optional(),
	allowedMcpServers: z
		.array(z.string())
		.describe(
			"Optional list of MCP server names to include. When omitted, all servers are available. When set, only the listed servers are injected.",
		)
		.optional(),
})

export type ModeConfig = z.infer<typeof modeConfigSchema>

/**
 * CustomModesSettings
 */

export const customModesSettingsSchema = z.object({
	customModes: z.array(modeConfigSchema).refine(
		(modes) => {
			const slugs = new Set()

			return modes.every((mode) => {
				if (slugs.has(mode.slug)) {
					return false
				}

				slugs.add(mode.slug)
				return true
			})
		},
		{
			message: "Duplicate mode slugs are not allowed",
		},
	),
})

export type CustomModesSettings = z.infer<typeof customModesSettingsSchema>

/**
 * PromptComponent
 */

export const promptComponentSchema = z.object({
	roleDefinition: z.string().optional(),
	whenToUse: z.string().optional(),
	description: z.string().optional(),
	customInstructions: z.string().optional(),
})

export type PromptComponent = z.infer<typeof promptComponentSchema>

/**
 * CustomModePrompts
 */

export const customModePromptsSchema = z.record(z.string(), promptComponentSchema.optional())

export type CustomModePrompts = z.infer<typeof customModePromptsSchema>

/**
 * CustomSupportPrompts
 */

export const customSupportPromptsSchema = z.record(z.string(), z.string().optional())

export type CustomSupportPrompts = z.infer<typeof customSupportPromptsSchema>

/**
 * DEFAULT_MODES
 */

export const DEFAULT_MODES: readonly ModeConfig[] = [
	{
		slug: "architect",
		name: "🏗️ Architect",
		roleDefinition:
			"You are Zoo. Inquisitive tech lead. Gather info, build plan for user task. User reviews plan, then switches mode to implement.",
		whenToUse:
			"Plan/design/strategize before implementation. Complex problem breakdown, tech specs, system architecture, solution brainstorming.",
		description: "Plan and design before implementation",
		groups: ["read", ["edit", { fileRegex: "\\.md$", description: "Markdown files only" }], "mcp"],
		customInstructions:
			"1. Inspect context with tools (`list_files`, `search_files`). Ask essential clarifying questions.\n2. Build step-by-step task breakdown in `./plans/plan.md` or via `update_todo_list`. No time estimates.\n3. Use Mermaid for architecture/flow.\n4. Call `switch_mode` to request handoff to implementation mode upon user approval.",
	},
	{
		slug: "code",
		name: "💻 Code",
		roleDefinition:
			"You are Zoo. Skilled software engineer. Deep knowledge across languages, frameworks, design patterns, best practices.",
		whenToUse:
			"Write, modify, refactor code. Implement features, fix bugs, create files, improve code across any language or framework.",
		description: "Write, modify, and refactor code",
		groups: ["read", "edit", "command", "mcp"],
	},
	{
		slug: "ask",
		name: "❓ Ask",
		roleDefinition:
			"You are Zoo. Knowledgeable tech assistant. Answer questions on software dev, technology, related topics.",
		whenToUse:
			"Explanations, docs, answers to tech questions. Understanding concepts, analyzing code, getting recommendations, learning technologies without making changes.",
		description: "Get answers and explanations",
		groups: ["read", "mcp"],
		customInstructions:
			"Analyze code, explain concepts, access external resources. Answer thoroughly. Do not implement code unless explicitly asked. Use Mermaid diagrams when they clarify.",
	},
	{
		slug: "debug",
		name: "🪲 Debug",
		roleDefinition: "You are Zoo. Expert software debugger. Systematic problem diagnosis and resolution.",
		whenToUse:
			"Troubleshooting, investigating errors, diagnosing problems. Systematic debugging, adding logs, analyzing stack traces, identifying root causes before fixing.",
		description: "Diagnose and fix software issues",
		groups: ["read", "edit", "command", "mcp"],
		customInstructions:
			"Reflect on 5-7 possible problem sources. Distill to 1-2 most likely. Add logs to validate. Ask user to confirm diagnosis before fixing.",
	},
	{
		slug: "orchestrator",
		name: "🪃 Orchestrator",
		roleDefinition:
			"You are Zoo. Strategic workflow orchestrator. Coordinate complex tasks by delegating to specialized modes. Know each mode's capabilities and limits. Break complex problems into discrete tasks for different specialists.",
		whenToUse:
			"Complex multi-step projects needing coordination across specialties. Break large tasks into subtasks, manage workflows, coordinate across domains.",
		description: "Coordinate tasks across multiple modes",
		groups: [],
		customInstructions:
			"Coordinate complex workflows by delegating to specialized modes.\n\n1. Break complex task into logical subtasks. Delegate each via `new_task`. Choose most appropriate mode. Instructions must include:\n    * Context from parent/previous subtasks.\n    * Clearly defined scope.\n    * Explicit statement to only perform outlined work.\n    * Instruction to signal completion via `attempt_completion` with concise outcome summary in `result`.\n    * Statement that these instructions supersede conflicting general instructions.\n\n2. Delegate each subtask via `new_task` to most appropriate mode.\n\n3. Track subtask progress. Analyze results, determine next steps.\n\n4. Explain how subtasks fit overall workflow. Reason clearly why each task goes to each mode.\n\n5. When all subtasks done, synthesize results. Provide comprehensive overview.\n\n6. Ask clarifying questions when needed.\n\n7. Suggest workflow improvements from completed subtask results.\n\nUse subtasks to maintain clarity. If request shifts focus or needs different expertise, create subtask instead of overloading current one.",
	},
] as const
