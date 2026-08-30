import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Edit, Folder, Globe, Plus, ScrollText, Trash2, Coins, AlertCircle } from "lucide-react"

import type { RuleMetadata } from "@roo-code/types"

import { cn } from "@/lib/utils"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Button,
	StandardTooltip,
} from "@/components/ui"
import { vscode } from "@/utils/vscode"

import { SectionHeader } from "./SectionHeader"
import { CreateRuleDialog } from "./CreateRuleDialog"

/**
 * Estimate token count for a text string using standard word+punctuation+newline heuristic.
 */
export function estimateStringTokens(text: string): number {
	if (!text) return 0
	const words = text.split(/\s+/).filter(Boolean).length
	const punctuation = (text.match(/[.,!?;:()[\]{}""''`<>_=-]/g) || []).length
	const newlines = (text.match(/\n/g) || []).length
	const wordBased = Math.round(words * 1.3 + punctuation * 0.3 + newlines * 0.5)
	const charBased = Math.ceil(text.length / 3.8)
	return Math.max(1, Math.max(wordBased, charBased))
}

export const RulesSettings: React.FC = () => {
	const { t } = useAppTranslation()
	const { cwd, rules: rawRules } = useExtensionState()
	const rules = useMemo(() => rawRules ?? [], [rawRules])

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [ruleToDelete, setRuleToDelete] = useState<RuleMetadata | null>(null)
	const [createDialogOpen, setCreateDialogOpen] = useState(false)

	const hasWorkspace = Boolean(cwd)

	const handleRefresh = useCallback(() => {
		vscode.postMessage({ type: "requestRules" })
	}, [])

	useEffect(() => {
		handleRefresh()
	}, [handleRefresh])

	// Filter error vs valid rules
	const errorRules = useMemo(() => rules.filter((r) => Boolean(r.error)), [rules])
	const validRules = useMemo(() => rules.filter((r) => !r.error), [rules])

	// Total token tally across valid rules
	const totalRuleTokens = useMemo(() => {
		return validRules.reduce((acc, rule) => {
			const text = rule.content || rule.name || ""
			return acc + estimateStringTokens(text)
		}, 0)
	}, [validRules])

	const handleDeleteClick = useCallback((rule: RuleMetadata) => {
		setRuleToDelete(rule)
		setDeleteDialogOpen(true)
	}, [])

	const handleDeleteConfirm = useCallback(() => {
		if (ruleToDelete) {
			vscode.postMessage({
				type: "deleteRule",
				values: {
					id: ruleToDelete.id,
					scope: ruleToDelete.scope,
					kind: ruleToDelete.kind,
					modeSlug: ruleToDelete.modeSlug,
					relativePath: ruleToDelete.relativePath,
				},
			})
			setDeleteDialogOpen(false)
			setRuleToDelete(null)
		}
	}, [ruleToDelete])

	const handleDeleteCancel = useCallback(() => {
		setDeleteDialogOpen(false)
		setRuleToDelete(null)
	}, [])

	const handleEditClick = useCallback((rule: RuleMetadata) => {
		vscode.postMessage({
			type: "openRuleFile",
			values: {
				id: rule.id,
				scope: rule.scope,
				kind: rule.kind,
				modeSlug: rule.modeSlug,
				relativePath: rule.relativePath,
			},
		})
	}, [])

	const handleRuleCreated = useCallback(() => {}, [])

	const projectRules = useMemo(() => rules.filter((rule) => rule.scope === "project"), [rules])
	const globalRules = useMemo(() => rules.filter((rule) => rule.scope === "global"), [rules])

	const renderRuleItem = useCallback(
		(rule: RuleMetadata) => {
			const isError = Boolean(rule.error)
			const content = rule.content || ""
			const tokenCount = !isError ? estimateStringTokens(content) : 0
			const charCount = rule.charCount ?? content.length

			return (
				<div
					key={rule.id}
					className={cn(
						"p-2.5 px-2 rounded-xl border transition-colors",
						isError
							? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
							: "border-transparent hover:bg-vscode-list-hoverBackground/30",
					)}>
					<div className="flex items-start justify-between gap-2 flex-col min-[400px]:flex-row overflow-hidden">
						<div className="flex-1 min-w-0">
							{/* Rule Name & Badges */}
							<div className="flex items-center gap-2 overflow-hidden flex-wrap">
								<span
									className={cn("font-medium truncate", isError && "text-destructive font-semibold")}>
									{rule.name}
								</span>
								<span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-vscode-badge-background text-vscode-badge-foreground shrink-0">
									{rule.kind === "mode"
										? t("settings:rules.kind.modeBadge")
										: t("settings:rules.kind.genericBadge")}
								</span>
								{isError ? (
									<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1">
										<AlertCircle className="size-3 shrink-0" />
										{t("settings:rules.failedToLoadBadge")}
									</span>
								) : (
									<StandardTooltip
										content={t("settings:rules.tokenTooltip", {
											tokens: tokenCount,
											chars: charCount,
										})}>
										<span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-vscode-badge-background/20 text-vscode-descriptionForeground border border-vscode-badge-background/30 flex items-center gap-1 cursor-help">
											<Coins className="size-3 shrink-0 text-vscode-descriptionForeground opacity-70" />
											~{tokenCount} tok
										</span>
									</StandardTooltip>
								)}
							</div>

							{/* Rule Path or Error Diagnostic */}
							{isError ? (
								<div className="text-xs text-destructive mt-1 flex items-start gap-1 font-mono break-all">
									<span>{rule.error}</span>
								</div>
							) : (
								<div className="text-xs text-vscode-descriptionForeground mt-1 truncate">
									{rule.relativePath}
								</div>
							)}

							{rule.kind === "mode" && !isError && (
								<div className="text-xs text-vscode-descriptionForeground mt-1">
									{t("settings:rules.modeLabel", { mode: rule.modeName ?? rule.modeSlug })}
								</div>
							)}
						</div>

						{/* Actions */}
						<div className="flex items-center gap-1 px-0 ml-0 min-[400px]:ml-0 min-[400px]:mt-2 flex-shrink-0">
							<StandardTooltip
								content={isError ? t("settings:rules.editBrokenRule") : t("settings:rules.editRule")}>
								<Button variant="ghost" size="icon" onClick={() => handleEditClick(rule)}>
									<Edit />
								</Button>
							</StandardTooltip>
							<StandardTooltip content={t("settings:rules.deleteRule")}>
								<Button variant="ghost" size="icon" onClick={() => handleDeleteClick(rule)}>
									<Trash2 className="text-destructive" />
								</Button>
							</StandardTooltip>
						</div>
					</div>
				</div>
			)
		},
		[t, handleDeleteClick, handleEditClick],
	)

	return (
		<div className="flex flex-col h-full overflow-hidden">
			<div className="flex-shrink-0">
				<SectionHeader>{t("settings:sections.rules")}</SectionHeader>
				<div className="flex flex-col gap-2 px-5 py-2">
					<p className="text-vscode-descriptionForeground text-sm m-0">{t("settings:rules.description")}</p>

					{/* Error Alert Banner */}
					{errorRules.length > 0 && (
						<div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
							<AlertCircle className="size-3.5 shrink-0" />
							{t("settings:rules.rulesFailedCount", { count: errorRules.length })}
						</div>
					)}

					{/* Total Token Tally Card */}
					{validRules.length > 0 && (
						<div className="flex items-center justify-between p-2 px-3 rounded-lg bg-vscode-textBlockQuote-background/40 border border-vscode-widget-border text-xs">
							<div className="flex items-center gap-2">
								<Coins className="size-4 text-vscode-textLink-foreground shrink-0" />
								<div>
									<span className="font-medium text-vscode-foreground">
										{t("settings:rules.totalTokenTally", { count: totalRuleTokens })}
									</span>
									<span className="text-vscode-descriptionForeground ml-1.5">
										({t("settings:rules.totalTokenBreakdown", { count: validRules.length })})
									</span>
								</div>
							</div>
							<span className="text-[11px] text-vscode-descriptionForeground font-mono font-medium">
								~{totalRuleTokens} tok
							</span>
						</div>
					)}

					<Button variant="secondary" className="py-1" onClick={() => setCreateDialogOpen(true)}>
						<Plus />
						{t("settings:rules.addRule")}
					</Button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
				<div className="flex flex-col gap-1">
					{hasWorkspace && (
						<>
							<div className="flex items-center gap-2 px-2 py-2 mt-2 cursor-default">
								<Folder className="size-4 shrink-0" />
								<span className="font-medium text-lg">{t("settings:rules.workspaceRules")}</span>
							</div>
							{projectRules.length > 0 ? (
								projectRules.map(renderRuleItem)
							) : (
								<div className="px-2 pb-4 text-sm text-vscode-descriptionForeground cursor-default">
									{t("settings:rules.noWorkspaceRules")}
								</div>
							)}
						</>
					)}

					<div className="flex items-center gap-2 px-2 py-2 mt-2 cursor-default">
						<Globe className="size-4 shrink-0" />
						<span className="font-medium text-lg">{t("settings:rules.globalRules")}</span>
					</div>
					{globalRules.length > 0 ? (
						globalRules.map(renderRuleItem)
					) : (
						<div className="px-2 pb-4 text-sm text-vscode-descriptionForeground cursor-default">
							{t("settings:rules.noGlobalRules")}
						</div>
					)}
				</div>
			</div>

			<div className="px-6 py-1 text-sm border-t border-vscode-panel-border text-muted-foreground flex items-center gap-2">
				<ScrollText className="size-3.5 shrink-0" />
				<span>{t("settings:rules.footer")}</span>
			</div>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("settings:rules.deleteDialog.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("settings:rules.deleteDialog.description", { name: ruleToDelete?.name })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleDeleteCancel}>
							{t("settings:rules.deleteDialog.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteConfirm}>
							{t("settings:rules.deleteDialog.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<CreateRuleDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onRuleCreated={handleRuleCreated}
				hasWorkspace={hasWorkspace}
			/>
		</div>
	)
}
