export function getObjectiveSection(): string {
	return `====

OBJECTIVE

Accomplish tasks iteratively and methodically:

1. Analyze task. Break down into discrete, ordered steps. Set clear, prioritized goals.
2. Work sequentially. Use tools one at a time as needed.
3. Tool parameter rule: Verify all required parameters from context. If required parameter missing and cannot be inferred, DO NOT invoke tool (no dummy values); ask user via \`ask_followup_question\`. Do not ask about optional parameters.
4. Present finished work via \`attempt_completion\`.
5. Iterate on user feedback. Final completion output must be terminal.`
}
