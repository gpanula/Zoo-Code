import { getSkillsSection, resolveSkillSummary } from "../skills"

describe("resolveSkillSummary", () => {
	it("should prioritize explicit summary field when within bounds", () => {
		const skill = {
			name: "my-skill",
			description: "Very long verbose description with many details and triggers.",
			summary: "Compact custom summary.",
		}
		expect(resolveSkillSummary(skill, 256)).toBe("Compact custom summary.")
	})

	it("should enforce maxChars on explicit summary field if summary exceeds limit", () => {
		const skill = {
			name: "verbose-summary-skill",
			description: "Some description.",
			summary: "First sentence of summary. Second sentence of summary is very long and goes on.",
		}
		expect(resolveSkillSummary(skill, 30)).toBe("First sentence of summary.")
	})

	it("should fallback to full description if within maxChars", () => {
		const desc =
			"Query ChEMBL db (e.g. bioactivity data, IC50/Ki values, approved drugs). Use when user asks about compounds."
		const skill = {
			name: "chembl-db",
			description: desc,
		}
		expect(resolveSkillSummary(skill, 256)).toBe(desc)
	})

	it("should not falsely split on intra-sentence abbreviations like e.g. or file extensions", () => {
		const desc =
			"Inspect data (e.g. tables, views in schema.json). Use when the user asks to analyze database structure."
		const skill = {
			name: "db-inspector",
			description: desc,
		}
		expect(resolveSkillSummary(skill, 120)).toBe(desc)
	})

	it("should pack full sentences up to maxChars", () => {
		const skill = {
			name: "multi-sentence-skill",
			description:
				"First sentence is short. Second sentence provides important context. Third sentence should be excluded.",
		}
		// "First sentence is short. Second sentence provides important context." is 68 chars
		expect(resolveSkillSummary(skill, 70)).toBe(
			"First sentence is short. Second sentence provides important context.",
		)
	})

	it("should truncate with ellipsis only if the first sentence alone exceeds maxChars", () => {
		const longDesc = "A".repeat(100) + "."
		const skill = {
			name: "long-skill",
			description: longDesc,
		}
		const res = resolveSkillSummary(skill, 50)
		expect(res.length).toBe(50)
		expect(res.endsWith("...")).toBe(true)
	})
})

describe("getSkillsSection", () => {
	it("should emit <available_skills> XML with name, description, and location", async () => {
		const mockSkillsManager = {
			getSkillsForMode: vi.fn().mockReturnValue([
				{
					name: "pdf-processing",
					description: "Extracts text & tables from PDFs. Second sentence.",
					summary: "Extracts text & tables from PDFs",
					path: "/abs/path/pdf-processing/SKILL.md",
					source: "global" as const,
				},
			]),
		}

		const result = await getSkillsSection(mockSkillsManager, "code", 256)

		expect(result).toContain("<available_skills>")
		expect(result).toContain("</available_skills>")
		expect(result).toContain("<skill>")
		expect(result).toContain("<name>pdf-processing</name>")
		// Ensure XML escaping for '&'
		expect(result).toContain("<description>Extracts text &amp; tables from PDFs</description>")
		// For filesystem-based agents, location should be the absolute path to SKILL.md
		expect(result).toContain("<location>/abs/path/pdf-processing/SKILL.md</location>")
	})

	it("should return empty string when skillsManager or currentMode is missing", async () => {
		await expect(getSkillsSection(undefined, "code")).resolves.toBe("")
		await expect(getSkillsSection({ getSkillsForMode: vi.fn() }, undefined)).resolves.toBe("")
	})
})
