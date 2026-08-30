import { getSharedToolUseSection } from "../tool-use"

describe("getSharedToolUseSection", () => {
	it("should include native tool-calling instructions in caveman style", () => {
		const section = getSharedToolUseSection()

		expect(section).toContain("Use native tool calls only. No XML.")
		expect(section).toContain("Call >=1 tool per action turn. Parallel tool calls preferred to minimize turns.")
		expect(section).toContain("Pick best tool per step (`list_files` over terminal `ls`).")
		expect(section).toContain("Execute iteratively based on prior outputs; never assume results.")
	})

	it("should NOT include legacy XML formatting instructions", () => {
		const section = getSharedToolUseSection()

		expect(section).not.toContain("<actual_tool_name>")
		expect(section).not.toContain("</actual_tool_name>")
	})
})
