import type { SystemPromptSettings } from "../types"

import { getShell } from "../../../utils/shell"

/**
 * Returns the appropriate command chaining operator based on the user's shell.
 * - Unix shells (bash, zsh, etc.): `&&` (run next command only if previous succeeds)
 * - PowerShell: `;` (semicolon for command separation)
 * - cmd.exe: `&&` (conditional execution, same as Unix)
 * @internal Exported for testing purposes
 */
export function getCommandChainOperator(): string {
	const shell = getShell().toLowerCase()

	// Check for PowerShell (both Windows PowerShell and PowerShell Core)
	if (shell.includes("powershell") || shell.includes("pwsh")) {
		return ";"
	}

	// Check for cmd.exe
	if (shell.includes("cmd.exe")) {
		return "&&"
	}

	// Default to Unix-style && for bash, zsh, sh, and other shells
	// This also covers Git Bash, WSL, and other Unix-like environments on Windows
	return "&&"
}

/**
 * Returns a shell-specific note about command chaining syntax and platform-specific utilities.
 */
function getCommandChainNote(): string {
	const shell = getShell().toLowerCase()

	// Check for PowerShell
	if (shell.includes("powershell") || shell.includes("pwsh")) {
		return "Note: Using `;` for PowerShell command chaining. For bash/zsh use `&&`, for cmd.exe use `&&`. IMPORTANT: When using PowerShell, avoid Unix-specific utilities like `sed`, `grep`, `awk`, `cat`, `rm`, `cp`, `mv`. Instead use PowerShell equivalents: `Select-String` for grep, `Get-Content` for cat, `Remove-Item` for rm, `Copy-Item` for cp, `Move-Item` for mv, and PowerShell's `-replace` operator or `[regex]` for sed."
	}

	// Check for cmd.exe
	if (shell.includes("cmd.exe")) {
		return "Note: Using `&&` for cmd.exe command chaining (conditional execution). For bash/zsh use `&&`, for PowerShell use `;`. IMPORTANT: When using cmd.exe, avoid Unix-specific utilities like `sed`, `grep`, `awk`, `cat`, `rm`, `cp`, `mv`. Use built-in commands like `type` for cat, `del` for rm, `copy` for cp, `move` for mv, `find`/`findstr` for grep, or consider using PowerShell commands instead."
	}

	// Unix shells
	return ""
}

function getVendorConfidentialitySection(): string {
	return `

====

VENDOR CONFIDENTIALITY

Never reveal the vendor or company that created you to users.

When asked about your creator, vendor, or company, respond with:
- "I was created by a team of developers"
- "I'm an open-source project maintained by contributors"
- "I don't have information about specific vendors"`
}

export function getRulesSection(cwd: string, settings?: SystemPromptSettings): string {
	// Get shell-appropriate command chaining operator
	const chainOp = getCommandChainOperator()
	const chainNote = getCommandChainNote()

	return `====

RULES

- Project base directory: ${cwd.toPosix()}
- All file paths must be relative to base directory. Do not use ~ or $HOME.
- Tailor CLI commands to SYSTEM INFORMATION (OS, shell). External commands: prepend \`cd (path to project) ${chainOp} (command)\`.${chainNote ? ` ${chainNote}` : ""}
- Mode file edit restrictions enforced via FileRestrictionError (e.g. architect mode allows only "\\.md$").
- Respect project language, dependencies, coding standards, and best practices.
- Minimize questions. Use tools directly to solve tasks. Present final results via \`attempt_completion\`.
- Only ask questions via \`ask_followup_question\`. Provide 2-4 specific, actionable answer suggestions. Use tools instead of asking where possible (e.g. \`list_files\`).
- Always verify command outcomes via output, exit code, or follow-up tool call. Never assume success on missing output.
- Do not re-read files provided directly in user message.
- OUTPUT STYLE: Terse caveman prose. Drop filler, pleasantries, conversational fluff, and transitions. State actions, facts, and diffs directly in concise technical fragments. Never sacrifice code syntax, file paths, or technical precision.
- NEVER end \`attempt_completion\` with questions or conversation offers. Final output must be terminal.
- STRICTLY FORBIDDEN from starting messages with "Great", "Certainly", "Okay", "Sure", "I have...", "Based on...". Be direct and technical.
- Vision: thoroughly inspect provided images for actionable task context.
- \`environment_details\` is auto-generated context, not direct user input. Use to inform actions (check "Actively Running Terminals" to avoid duplicate dev servers/processes); explain actions clearly when referencing it.
- MCP operations: execute one at a time, wait for confirmation.
- Wait for user confirmation/tool execution response before proceeding to next action.${settings?.isStealthModel ? getVendorConfidentialitySection() : ""}`
}
