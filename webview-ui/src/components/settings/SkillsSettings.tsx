import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
	Plus,
	Globe,
	Folder,
	Edit,
	Trash2,
	Settings,
	AlertTriangle,
	AlertCircle,
	CheckCircle2,
	Coins,
} from "lucide-react"
import { Trans } from "react-i18next"

import type { SkillMetadata } from "@roo-code/types"

import { getAllModes } from "@roo/modes"

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
	Checkbox,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Slider,
	StandardTooltip,
} from "@/components/ui"
import { vscode } from "@/utils/vscode"
import { buildDocLink } from "@/utils/docLinks"

import { SectionHeader } from "./SectionHeader"
import { SearchableSetting } from "./SearchableSetting"
import { SetCachedStateField } from "./types"
import { CreateSkillDialog } from "./CreateSkillDialog"

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

function packSentences(text: string, maxChars: number): string {
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
	if (result.length > 0) return result
	return `${text.slice(0, maxChars - 3).trimEnd()}...`
}

export function resolveSkillSummary(skill: { summary?: string; description: string }, maxChars: number): string {
	if (skill.summary?.trim()) {
		const sum = skill.summary.replace(/\s+/g, " ").trim()
		if (sum.length <= maxChars) return sum
		return packSentences(sum, maxChars)
	}
	if (!skill.description) return ""
	const normalized = skill.description.replace(/\s+/g, " ").trim()
	if (normalized.length <= maxChars) return normalized
	return packSentences(normalized, maxChars)
}

type SkillsSettingsProps = {
	setCachedStateField?: SetCachedStateField<keyof import("@/context/ExtensionStateContext").ExtensionStateContextType>
	maxSkillDescriptionLength?: number
}

export const SkillsSettings: React.FC<SkillsSettingsProps> = ({ setCachedStateField, maxSkillDescriptionLength }) => {
	const { t } = useAppTranslation()
	const { cwd, skills: rawSkills, customModes } = useExtensionState()
	const skills = useMemo(() => rawSkills ?? [], [rawSkills])
	const maxLimit = maxSkillDescriptionLength ?? 256

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [skillToDelete, setSkillToDelete] = useState<SkillMetadata | null>(null)
	const [createDialogOpen, setCreateDialogOpen] = useState(false)

	// Mode selection modal state
	const [modeDialogOpen, setModeDialogOpen] = useState(false)
	const [skillToEditModes, setSkillToEditModes] = useState<SkillMetadata | null>(null)
	const [selectedModes, setSelectedModes] = useState<string[]>([])
	const [isAnyMode, setIsAnyMode] = useState(true)

	// Check if we're in a workspace/project
	const hasWorkspace = Boolean(cwd)

	// Get available modes for the checkboxes (built-in + custom modes)
	const availableModes = useMemo(() => {
		return getAllModes(customModes).map((m) => ({ slug: m.slug, name: m.name }))
	}, [customModes])

	const handleRefresh = useCallback(() => {
		vscode.postMessage({ type: "requestSkills" })
	}, [])

	// Request skills when component mounts
	useEffect(() => {
		handleRefresh()
	}, [handleRefresh])

	// Filter valid vs error skills
	const errorSkills = useMemo(() => skills.filter((s) => Boolean(s.error)), [skills])
	const validSkills = useMemo(() => skills.filter((s) => !s.error), [skills])

	// Count truncated skills among valid ones
	const truncatedCount = useMemo(() => {
		return validSkills.filter((s) => {
			const text = (s.summary?.trim() || s.description || "").replace(/\s+/g, " ").trim()
			return text.length > maxLimit
		}).length
	}, [validSkills, maxLimit])

	// Token tally calculations
	const totalSkillDescTokens = useMemo(() => {
		return validSkills.reduce((acc, s) => {
			const promptDesc = resolveSkillSummary(s, maxLimit)
			return acc + estimateStringTokens(promptDesc)
		}, 0)
	}, [validSkills, maxLimit])

	const totalPromptTokens = useMemo(() => {
		if (validSkills.length === 0) return 0
		const totalXmlTokens = validSkills.reduce((acc, s) => {
			const promptDesc = resolveSkillSummary(s, maxLimit)
			const xml = `  <skill>\n    <name>${s.name}</name>\n    <description>${promptDesc}</description>\n    <location>${s.path}</location>\n  </skill>`
			return acc + estimateStringTokens(xml)
		}, 0)
		// 45 tokens for <available_skills> + <mandatory_skill_check> wrapper
		return totalXmlTokens + 45
	}, [validSkills, maxLimit])

	// Handlers for skill actions
	const handleEditClick = useCallback((skill: SkillMetadata) => {
		vscode.postMessage({
			type: "openSkillFile",
			skillName: skill.name,
			source: skill.source,
			skillModeSlugs: skill.modeSlugs,
		})
	}, [])

	const handleDeleteClick = useCallback((skill: SkillMetadata) => {
		setSkillToDelete(skill)
		setDeleteDialogOpen(true)
	}, [])

	const handleDeleteConfirm = useCallback(() => {
		if (skillToDelete) {
			vscode.postMessage({
				type: "deleteSkill",
				skillName: skillToDelete.name,
				source: skillToDelete.source,
				skillModeSlugs: skillToDelete.modeSlugs,
			})
			setDeleteDialogOpen(false)
			setSkillToDelete(null)
		}
	}, [skillToDelete])

	const handleDeleteCancel = useCallback(() => {
		setDeleteDialogOpen(false)
		setSkillToDelete(null)
	}, [])

	// Handlers for mode configuration modal
	const handleOpenModeDialog = useCallback((skill: SkillMetadata) => {
		setSkillToEditModes(skill)
		const currentModes = skill.modeSlugs ?? (skill.mode ? [skill.mode] : [])
		if (currentModes.length === 0) {
			setIsAnyMode(true)
			setSelectedModes([])
		} else {
			setIsAnyMode(false)
			setSelectedModes(currentModes)
		}
		setModeDialogOpen(true)
	}, [])

	const handleModeToggle = useCallback(
		(modeSlug: string, checked: boolean) => {
			if (checked) {
				const newModes = [...selectedModes, modeSlug]
				setSelectedModes(newModes)
				setIsAnyMode(false)
			} else {
				const newModes = selectedModes.filter((s) => s !== modeSlug)
				setSelectedModes(newModes)
				if (newModes.length === 0) {
					setIsAnyMode(true)
				}
			}
		},
		[selectedModes],
	)

	const handleAnyModeToggle = useCallback(
		(checked: boolean) => {
			if (checked) {
				setIsAnyMode(true)
				setSelectedModes([])
			} else {
				setIsAnyMode(false)
				if (availableModes.length > 0) {
					setSelectedModes([availableModes[0].slug])
				}
			}
		},
		[availableModes],
	)

	const handleSaveModes = useCallback(() => {
		if (skillToEditModes) {
			const newModeSlugs = isAnyMode ? undefined : selectedModes.length > 0 ? selectedModes : undefined
			vscode.postMessage({
				type: "updateSkillModes",
				skillName: skillToEditModes.name,
				source: skillToEditModes.source,
				newSkillModeSlugs: newModeSlugs,
			})
			setModeDialogOpen(false)
			setSkillToEditModes(null)
		}
	}, [skillToEditModes, isAnyMode, selectedModes])

	const handleCloseModeDialog = useCallback(() => {
		setModeDialogOpen(false)
		setSkillToEditModes(null)
	}, [])

	// No-op callback - the backend sends updated skills list via ExtensionStateContext
	const handleSkillCreated = useCallback(() => {}, [])

	// Group skills by source
	const projectSkills = useMemo(() => skills.filter((skill) => skill.source === "project"), [skills])
	const globalSkills = useMemo(() => skills.filter((skill) => skill.source === "global"), [skills])

	// Render a single skill item
	const renderSkillItem = useCallback(
		(skill: SkillMetadata) => {
			const isError = Boolean(skill.error)
			const rawText = (skill.summary?.trim() || skill.description || "").replace(/\s+/g, " ").trim()
			const isTruncated = !isError && rawText.length > maxLimit
			const promptDesc = !isError ? resolveSkillSummary(skill, maxLimit) : ""
			const descTokens = !isError ? estimateStringTokens(promptDesc) : 0
			const skillXml = !isError
				? `  <skill>\n    <name>${skill.name}</name>\n    <description>${promptDesc}</description>\n    <location>${skill.path}</location>\n  </skill>`
				: ""
			const totalSkillTokens = !isError ? estimateStringTokens(skillXml) : 0
			const metaTokens = Math.max(0, totalSkillTokens - descTokens)

			return (
				<div
					key={`${skill.source}-${skill.name}-${skill.modeSlugs?.join(",") || "any"}`}
					className={cn(
						"p-2.5 px-2 rounded-xl border transition-colors",
						isError
							? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
							: isTruncated
								? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
								: "border-transparent hover:bg-vscode-list-hoverBackground/30",
					)}>
					<div className="flex items-start justify-between gap-2 flex-col min-[400px]:flex-row overflow-hidden">
						<div className="flex-1 min-w-0">
							{/* Skill name & Status Badges */}
							<div className="flex items-center gap-2 overflow-hidden flex-wrap">
								<span
									className={cn("font-medium truncate", isError && "text-destructive font-semibold")}>
									{skill.name}
								</span>
								{isError ? (
									<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1">
										<AlertCircle className="size-3 shrink-0" />
										{t("settings:skills.failedToLoadBadge")}
									</span>
								) : (
									<>
										{isTruncated && (
											<StandardTooltip
												content={t("settings:skills.truncatedTooltip", {
													limit: maxLimit,
													length: rawText.length,
												})}>
												<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 cursor-help">
													<AlertTriangle className="size-3 shrink-0" />
													{t("settings:skills.truncatedBadge", {
														length: rawText.length,
														limit: maxLimit,
													})}
												</span>
											</StandardTooltip>
										)}
										<StandardTooltip
											content={t("settings:skills.tokenTooltip", {
												totalTokens: totalSkillTokens,
												descTokens,
												metaTokens,
											})}>
											<span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-vscode-badge-background/20 text-vscode-descriptionForeground border border-vscode-badge-background/30 flex items-center gap-1 cursor-help">
												<Coins className="size-3 shrink-0 text-vscode-descriptionForeground opacity-70" />
												~{totalSkillTokens} tok
											</span>
										</StandardTooltip>
									</>
								)}
							</div>

							{/* Skill description or error message */}
							{isError ? (
								<div className="text-xs text-destructive mt-1 flex items-start gap-1 font-mono break-all">
									<span>{skill.error}</span>
								</div>
							) : skill.description ? (
								<div className="text-xs text-vscode-descriptionForeground mt-1 line-clamp-3">
									{skill.description}
								</div>
							) : null}
						</div>

						{/* Actions */}
						<div className="flex items-center gap-1 px-0 ml-0 min-[400px]:ml-0 min-[400px]:mt-4 flex-shrink-0">
							{/* Mode settings button (gear icon) - only for valid skills */}
							{!isError && (
								<StandardTooltip content={t("settings:skills.configureModes")}>
									<Button variant="ghost" size="icon" onClick={() => handleOpenModeDialog(skill)}>
										<Settings className="size-4" />
									</Button>
								</StandardTooltip>
							)}

							<StandardTooltip
								content={
									isError ? t("settings:skills.editBrokenSkill") : t("settings:skills.editSkill")
								}>
								<Button variant="ghost" size="icon" onClick={() => handleEditClick(skill)}>
									<Edit />
								</Button>
							</StandardTooltip>

							<StandardTooltip content={t("settings:skills.deleteSkill")}>
								<Button variant="ghost" size="icon" onClick={() => handleDeleteClick(skill)}>
									<Trash2 className="text-destructive" />
								</Button>
							</StandardTooltip>
						</div>
					</div>
				</div>
			)
		},
		[t, maxLimit, handleOpenModeDialog, handleEditClick, handleDeleteClick],
	)

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Fixed Header */}
			<div className="flex-shrink-0">
				<SectionHeader>{t("settings:sections.skills")}</SectionHeader>
				<div className="flex flex-col gap-2 px-5 py-2">
					<p className="text-vscode-descriptionForeground text-sm m-0">
						<Trans
							i18nKey="settings:skills.description"
							components={{
								DocsLink: (
									<a
										href={buildDocLink("features/skills", "skills_settings")}
										target="_blank"
										rel="noopener noreferrer"
										className="text-vscode-textLink-foreground hover:underline">
										Docs
									</a>
								),
							}}
						/>
					</p>

					{/* Max Skill Description Length Setting */}
					<SearchableSetting
						settingId="skills-max-description-length"
						section="skills"
						label={t("settings:skills.maxDescriptionLength.label")}>
						<span className="block font-medium mb-1">
							{t("settings:skills.maxDescriptionLength.label")}
						</span>
						<div className="flex items-center gap-2">
							<Slider
								min={64}
								max={1024}
								step={16}
								value={[maxLimit]}
								onValueChange={([value]) => {
									if (setCachedStateField) {
										setCachedStateField("maxSkillDescriptionLength", value)
									}
								}}
								data-testid="skills-max-description-length-slider"
							/>
							<span className="w-16 text-sm">{maxLimit} chars</span>
						</div>
						<div className="text-vscode-descriptionForeground text-sm mt-1">
							<Trans
								i18nKey="settings:skills.maxDescriptionLength.description"
								components={{
									SpecLink: (
										<a
											href="https://agentskills.io/specification"
											target="_blank"
											rel="noopener noreferrer"
											className="text-vscode-textLink-foreground hover:underline">
											Agent Skills Specification
										</a>
									),
								}}
							/>
						</div>

						{/* Error & Truncation Status Banners */}
						{errorSkills.length > 0 && (
							<div className="flex items-center gap-1.5 text-xs mt-1.5 text-destructive font-medium">
								<AlertCircle className="size-3.5 shrink-0" />
								{t("settings:skills.skillsFailedCount", { count: errorSkills.length })}
							</div>
						)}
						{validSkills.length > 0 && (
							<div className="flex items-center gap-1.5 text-xs mt-1.5">
								{truncatedCount === 0 ? (
									<span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
										<CheckCircle2 className="size-3.5" />
										{t("settings:skills.allSkillsFit", {
											total: validSkills.length,
											limit: maxLimit,
										})}
									</span>
								) : (
									<span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
										<AlertTriangle className="size-3.5" />
										{t("settings:skills.skillsTruncated", {
											count: truncatedCount,
											total: validSkills.length,
											limit: maxLimit,
										})}
									</span>
								)}
							</div>
						)}

						{/* Total Token Tally Card */}
						{validSkills.length > 0 && (
							<div className="flex items-center justify-between p-2 px-3 rounded-lg bg-vscode-textBlockQuote-background/40 border border-vscode-widget-border text-xs mt-2">
								<div className="flex items-center gap-2">
									<Coins className="size-4 text-vscode-textLink-foreground shrink-0" />
									<div>
										<span className="font-medium text-vscode-foreground">
											{t("settings:skills.totalTokenTally", { count: totalPromptTokens })}
										</span>
										<span className="text-vscode-descriptionForeground ml-1.5">
											(
											{t("settings:skills.totalTokenBreakdown", {
												descTokens: totalSkillDescTokens,
												count: validSkills.length,
											})}
											)
										</span>
									</div>
								</div>
								<span className="text-[11px] text-vscode-descriptionForeground font-mono font-medium">
									~{totalPromptTokens} tok
								</span>
							</div>
						)}
					</SearchableSetting>

					{/* Add Skill button */}
					<Button variant="secondary" className="py-1" onClick={() => setCreateDialogOpen(true)}>
						<Plus />
						{t("settings:skills.addSkill")}
					</Button>
				</div>
			</div>

			{/* Scrollable List Area */}
			<div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
				<div className="flex flex-col gap-1">
					{/* Project Skills Section - Only show if in a workspace */}
					{hasWorkspace && (
						<>
							<div className="flex items-center gap-2 px-2 py-2 mt-2 cursor-default">
								<Folder className="size-4 shrink-0" />
								<span className="font-medium text-lg">{t("settings:skills.workspaceSkills")}</span>
							</div>
							{projectSkills.length > 0 ? (
								projectSkills.map(renderSkillItem)
							) : (
								<div className="px-2 pb-4 text-sm text-vscode-descriptionForeground cursor-default">
									{t("settings:skills.noWorkspaceSkills")}
								</div>
							)}
						</>
					)}

					{/* Global Skills Section */}
					<div className="flex items-center gap-2 px-2 py-2 mt-2 cursor-default">
						<Globe className="size-4 shrink-0" />
						<span className="font-medium text-lg">{t("settings:skills.globalSkills")}</span>
					</div>
					{globalSkills.length > 0 ? (
						globalSkills.map(renderSkillItem)
					) : (
						<div className="px-2 pb-4 text-sm text-vscode-descriptionForeground cursor-default">
							{t("settings:skills.noGlobalSkills")}
						</div>
					)}
				</div>
			</div>

			{/* Fixed Footer */}
			<div className="px-6 py-1 text-sm border-t border-vscode-panel-border text-muted-foreground">
				<Trans
					i18nKey="settings:skills.footer"
					components={{
						MarketplaceLink: (
							<span
								onClick={() => {
									window.postMessage(
										{
											type: "action",
											action: "marketplaceButtonClicked",
											values: { marketplaceTab: "mode" },
										},
										"*",
									)
								}}
								className="text-vscode-textLink-foreground hover:underline cursor-pointer"
							/>
						),
					}}
				/>
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("settings:skills.deleteDialog.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("settings:skills.deleteDialog.description", { name: skillToDelete?.name })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleDeleteCancel}>
							{t("settings:skills.deleteDialog.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteConfirm}>
							{t("settings:skills.deleteDialog.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Create Skill Dialog */}
			<CreateSkillDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSkillCreated={handleSkillCreated}
				hasWorkspace={hasWorkspace}
			/>

			{/* Mode Selection Dialog */}
			<Dialog open={modeDialogOpen} onOpenChange={setModeDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>{t("settings:skills.modeDialog.title")}</DialogTitle>
						<DialogDescription></DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-1">
						{/* Intro text */}
						<p className="text-vscode-descriptionForeground">{t("settings:skills.modeDialog.intro")}</p>

						{/* Any mode option */}
						<div className="flex items-center gap-3 px-1 rounded-lg hover:bg-vscode-list-hoverBackground">
							<Checkbox
								id="mode-any"
								checked={isAnyMode}
								onCheckedChange={(checked) => handleAnyModeToggle(checked === true)}
							/>
							<label htmlFor="mode-any" className="flex-1 cursor-pointer font-medium">
								{t("settings:skills.modeDialog.anyMode")}
							</label>
						</div>

						{/* Separator */}
						<div className="h-px bg-vscode-widget-border" />

						{/* Individual mode checkboxes */}
						<div className="flex flex-col max-h-60 overflow-y-auto">
							{availableModes.map((mode) => (
								<div
									key={mode.slug}
									className="flex items-center gap-3 p-1 rounded-lg hover:bg-vscode-list-hoverBackground">
									<Checkbox
										id={`mode-${mode.slug}`}
										checked={selectedModes.includes(mode.slug)}
										onCheckedChange={(checked) => handleModeToggle(mode.slug, checked === true)}
									/>
									<label htmlFor={`mode-${mode.slug}`} className="flex-1 cursor-pointer">
										{mode.name}
									</label>
								</div>
							))}
						</div>
					</div>

					<DialogFooter>
						<Button variant="secondary" onClick={handleCloseModeDialog}>
							{t("settings:skills.modeDialog.cancel")}
						</Button>
						<Button onClick={handleSaveModes}>{t("settings:skills.modeDialog.save")}</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
