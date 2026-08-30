import { getToolUseGuidelinesSection } from "../tool-use-guidelines"

describe("getToolUseGuidelinesSection", () => {
	it("should return empty string as guidelines are merged into tool-use", () => {
		const guidelines = getToolUseGuidelinesSection()
		expect(guidelines).toBe("")
	})
})
