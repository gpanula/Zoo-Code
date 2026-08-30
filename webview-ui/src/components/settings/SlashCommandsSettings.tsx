import React, { useState, useCallback, useMemo, useEffect } from "react"
import { Plus, Globe, Folder, Edit, Trash2, AlertCircle } from "lucide-react"
import { Trans } from "react-i18next"

import type { Command } from "@roo-code/types"

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
import { buildDocLink } from "@/utils/docLinks"

import { SectionHeader } from "./SectionHeader"
import { CreateSlashCommandDialog } from "./CreateSlashCommandDialog"

export const SlashCommandsSettings: React.FC = () => {
	const { t } = useAppTranslation()
	const { commands: rawCommands, cwd } = useExtensionState()
	const commands = useMemo(() => rawCommands ?? [], [rawCommands])

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [commandToDelete, setCommandToDelete] = useState<Command | null>(null)
	const [createDialogOpen, setCreateDialogOpen] = useState(false)

	// Check if we're in a workspace/project
	const hasWorkspace = Boolean(cwd)

	const handleRefresh = useCallback(() => {
		vscode.postMessage({ type: "requestCommands" })
	}, [])

	// Request commands when component mounts
	useEffect(() => {
		handleRefresh()
	}, [handleRefresh])

	// Filter error vs valid commands
	const errorCommands = useMemo(() => commands.filter((cmd) => Boolean(cmd.error)), [commands])

	const handleDeleteClick = useCallback((command: Command) => {
		setCommandToDelete(command)
		setDeleteDialogOpen(true)
	}, [])

	const handleDeleteConfirm = useCallback(() => {
		if (commandToDelete) {
			vscode.postMessage({
				type: "deleteCommand",
				text: commandToDelete.name,
				values: { source: commandToDelete.source },
			})
			setDeleteDialogOpen(false)
			setCommandToDelete(null)
			// Refresh the commands list after deletion
			setTimeout(handleRefresh, 100)
		}
	}, [commandToDelete, handleRefresh])

	const handleDeleteCancel = useCallback(() => {
		setDeleteDialogOpen(false)
		setCommandToDelete(null)
	}, [])

	const handleEditClick = useCallback((command: Command) => {
		if (command.filePath) {
			vscode.postMessage({
				type: "openFile",
				text: command.filePath,
			})
		} else {
			// Fallback: request to open command file by name and source
			vscode.postMessage({
				type: "openCommandFile",
				text: command.name,
				values: { source: command.source },
			})
		}
	}, [])

	// No-op callback - the backend sends updated commands list via ExtensionStateContext
	const handleCommandCreated = useCallback(() => {
		setTimeout(handleRefresh, 500)
	}, [handleRefresh])

	// Group commands by source
	const projectCommands = useMemo(() => commands.filter((cmd) => cmd.source === "project"), [commands])
	const globalCommands = useMemo(() => commands.filter((cmd) => cmd.source === "global"), [commands])

	// Render a single command item
	const renderCommandItem = useCallback(
		(command: Command) => {
			const isBuiltIn = command.source === "built-in"
			const isError = Boolean(command.error)

			return (
				<div
					key={`${command.source}-${command.name}`}
					className={cn(
						"p-2.5 px-2 rounded-xl border transition-colors",
						isError
							? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
							: "border-transparent hover:bg-vscode-list-hoverBackground/30",
					)}>
					<div className="flex items-start justify-between gap-2 flex-col min-[400px]:flex-row overflow-hidden">
						<div className="flex-1 min-w-0">
							{/* Command name & Error Badge */}
							<div className="flex items-center gap-2 overflow-hidden flex-wrap">
								<span
									className={cn("font-medium truncate", isError && "text-destructive font-semibold")}>
									{command.name}
								</span>
								{isError && (
									<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1">
										<AlertCircle className="size-3 shrink-0" />
										{t("settings:slashCommands.failedToLoadBadge")}
									</span>
								)}
							</div>

							{/* Command description or Error Diagnostic */}
							{isError ? (
								<div className="text-xs text-destructive mt-1 flex items-start gap-1 font-mono break-all">
									<span>{command.error}</span>
								</div>
							) : (
								command.description && (
									<div className="text-xs text-vscode-descriptionForeground mt-1 line-clamp-3">
										{command.description}
									</div>
								)
							)}
						</div>

						{/* Actions */}
						<div className="flex items-center gap-1 px-0 ml-0 min-[400px]:ml-0 min-[400px]:mt-2 flex-shrink-0">
							<StandardTooltip
								content={
									isError
										? t("settings:slashCommands.editBrokenCommand")
										: t("settings:slashCommands.editCommand")
								}>
								<Button variant="ghost" size="icon" onClick={() => handleEditClick(command)}>
									<Edit />
								</Button>
							</StandardTooltip>

							{!isBuiltIn && (
								<StandardTooltip content={t("settings:slashCommands.deleteCommand")}>
									<Button variant="ghost" size="icon" onClick={() => handleDeleteClick(command)}>
										<Trash2 className="text-destructive" />
									</Button>
								</StandardTooltip>
							)}
						</div>
					</div>
				</div>
			)
		},
		[t, handleEditClick, handleDeleteClick],
	)

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Fixed Header */}
			<div className="flex-shrink-0">
				<SectionHeader>{t("settings:sections.slashCommands")}</SectionHeader>
				<div className="flex flex-col gap-2 px-5 py-2">
					<p className="text-vscode-descriptionForeground text-sm m-0">
						<Trans
							i18nKey="settings:slashCommands.description"
							components={{
								DocsLink: (
									<a
										href={buildDocLink("features/slash-commands", "slash_commands_settings")}
										target="_blank"
										rel="noopener noreferrer"
										className="text-vscode-textLink-foreground hover:underline">
										Docs
									</a>
								),
							}}
						/>
					</p>

					{/* Error Alert Banner */}
					{errorCommands.length > 0 && (
						<div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
							<AlertCircle className="size-3.5 shrink-0" />
							{t("settings:slashCommands.commandsFailedCount", { count: errorCommands.length })}
						</div>
					)}

					{/* Add Command button */}
					<Button variant="secondary" className="py-1" onClick={() => setCreateDialogOpen(true)}>
						<Plus />
						{t("settings:slashCommands.addCommand")}
					</Button>
				</div>
			</div>

			{/* Scrollable List Area */}
			<div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
				<div className="flex flex-col gap-1">
					{/* Project Commands Section - Only show if in a workspace */}
					{hasWorkspace && (
						<>
							<div className="flex items-center gap-2 px-2 py-2 mt-2 cursor-default">
								<Folder className="size-4 shrink-0" />
								<span className="font-medium text-lg">
									{t("settings:slashCommands.workspaceCommands")}
								</span>
							</div>
							{projectCommands.length > 0 ? (
								projectCommands.map(renderCommandItem)
							) : (
								<div className="px-2 pb-4 text-sm text-vscode-descriptionForeground cursor-default">
									{t("settings:slashCommands.noWorkspaceCommands")}
								</div>
							)}
						</>
					)}

					{/* Global Commands Section */}
					<div className="flex items-center gap-2 px-2 py-2 mt-2 cursor-default">
						<Globe className="size-4 shrink-0" />
						<span className="font-medium text-lg">{t("settings:slashCommands.globalCommands")}</span>
					</div>
					{globalCommands.length > 0 ? (
						globalCommands.map(renderCommandItem)
					) : (
						<div className="px-2 pb-4 text-sm text-vscode-descriptionForeground cursor-default">
							{t("settings:slashCommands.noGlobalCommands")}
						</div>
					)}
				</div>
			</div>

			{/* Fixed Footer */}
			<div className="px-6 py-1 text-sm border-t border-vscode-panel-border text-muted-foreground">
				{t("settings:slashCommands.footer")}
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("settings:slashCommands.deleteDialog.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("settings:slashCommands.deleteDialog.description", { name: commandToDelete?.name })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleDeleteCancel}>
							{t("settings:slashCommands.deleteDialog.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteConfirm}>
							{t("settings:slashCommands.deleteDialog.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Create Command Dialog */}
			<CreateSlashCommandDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onCommandCreated={handleCommandCreated}
				hasWorkspace={hasWorkspace}
			/>
		</div>
	)
}
