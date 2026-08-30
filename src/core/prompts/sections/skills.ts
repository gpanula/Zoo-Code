import type { SkillsManager } from "../../../services/skills/SkillsManager"

type SkillsManagerLike = Pick<SkillsManager, "getSkillsForMode">

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;")
}

function packSentences(text: string, maxChars: number): string {
	// Hardened sentence split: only splits on [.!?] when followed by whitespace AND an uppercase letter
	const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/)
	let result = ""
	for (const sentence of sentences) {
		const candidate = result ? `${result} ${sentence}` : sentence
		if (candidate.length <= maxChars) {
			result = candidate
		} else {
			break
		}
	}

	if (result.length > 0) {
		return result
	}

	// Fallback only if the first sentence alone exceeds maxChars
	return `${text.slice(0, maxChars - 3).trimEnd()}...`
}

/**
 * Resolves a concise summary for a skill, respecting a configurable max character limit:
 * 1. Checks author-provided summary/caveman_summary/compact (bounded by maxChars)
 * 2. Falls back to hardened sentence-packing from description
 * 3. Enforces maxChars bound across all paths
 *
 * @param skill - Skill metadata object containing description and optional summary
 * @param maxChars - Maximum character length (default: 256)
 */
export function resolveSkillSummary(skill: { summary?: string; description: string }, maxChars: number = 256): string {
	// 1. Author-provided compact summary (strictly bounded by maxChars)
	if (skill.summary?.trim()) {
		const sum = skill.summary.replace(/\s+/g, " ").trim()
		if (sum.length <= maxChars) {
			return sum
		}
		return packSentences(sum, maxChars)
	}

	if (!skill.description) return ""

	const normalized = skill.description.replace(/\s+/g, " ").trim()
	if (normalized.length <= maxChars) {
		return normalized
	}

	// 2. Fallback: hardened sentence-packing from description
	return packSentences(normalized, maxChars)
}

/**
 * Generate the skills section for the system prompt.
 * Only includes skills relevant to the current mode.
 * Format matches the modes section style.
 *
 * @param skillsManager - The SkillsManager instance
 * @param currentMode - The current mode slug (e.g., 'code', 'architect')
 * @param maxDescriptionLength - Maximum character length for skill descriptions (default: 256)
 */
export async function getSkillsSection(
	skillsManager: SkillsManagerLike | undefined,
	currentMode: string | undefined,
	maxDescriptionLength: number = 256,
): Promise<string> {
	if (!skillsManager || !currentMode) return ""

	// Get skills filtered by current mode (with override resolution)
	const skills = skillsManager.getSkillsForMode(currentMode)
	if (skills.length === 0) return ""

	const skillsXml = skills
		.map((skill) => {
			const name = escapeXml(skill.name)
			const description = escapeXml(resolveSkillSummary(skill, maxDescriptionLength))
			const locationLine = `\n    <location>${escapeXml(skill.path)}</location>`
			return `  <skill>\n    <name>${name}</name>\n    <description>${description}</description>${locationLine}\n  </skill>`
		})
		.join("\n")

	return `====

AVAILABLE SKILLS

<available_skills>
${skillsXml}
</available_skills>

<mandatory_skill_check>
REQUIRED PRECONDITION: Evaluate user request against <available_skills>.
If match found: select one, invoke \`skill\` tool to load (skip if already loaded in context), follow instructions.
If no match: proceed normally.
Linked files: read only on-demand.
</mandatory_skill_check>`
}
