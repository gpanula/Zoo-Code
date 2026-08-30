import { getObjectiveSection } from "../objective"

describe("getObjectiveSection", () => {
	it("should include proper numbered structure", () => {
		const objective = getObjectiveSection()

		// Check that all numbered items are present
		expect(objective).toContain("1. Analyze task")
		expect(objective).toContain("2. Work sequentially")
		expect(objective).toContain("3. Tool parameter rule")
		expect(objective).toContain("4. Present finished work via `attempt_completion`")
		expect(objective).toContain("5. Iterate on user feedback")
	})

	it("should include parameter inference guidance", () => {
		const objective = getObjectiveSection()

		expect(objective).toContain("Verify all required parameters")
		expect(objective).toContain("DO NOT invoke tool (no dummy values)")
		expect(objective).toContain("ask_followup_question")
	})

	it("should include terminal completion guidance", () => {
		const objective = getObjectiveSection()

		expect(objective).toContain("Final completion output must be terminal")
	})

	it("should include the OBJECTIVE header", () => {
		const objective = getObjectiveSection()

		expect(objective).toContain("OBJECTIVE")
		expect(objective).toContain("Accomplish tasks iteratively and methodically")
	})
})
