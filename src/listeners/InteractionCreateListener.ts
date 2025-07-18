import type { CommandInteraction, Interaction } from "discord.js";
import { DiscordAPIError, MessageFlags, RESTJSONErrorCodes } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";
import { HybridCommand, SlashHybridContext } from "../base/command/Command.js";
import logger from "../libs/logger.js";

@useListener("interactionCreate")
export default class InteractionCreateListener extends Listener<"interactionCreate"> {
	public async execute(interaction: Interaction) {
		const { client } = this;

		if (interaction.isChatInputCommand()) {
			if (!interaction.inCachedGuild()) {
				return;
			}

			const { commandName } = interaction;
			const command = client.commandManager.slashCommands.get(commandName);

			if (!command) {
				logger.warn(`Unknown slash command: ${commandName}`);
				return;
			}

			try {
				if (command instanceof HybridCommand) {
					await command.execute(new SlashHybridContext(interaction), []);
				} else {
					await command.execute(interaction);
				}
			} catch (error) {
				await this.handleCommandInteractionError(interaction, error);
			}
		} else if (interaction.isContextMenuCommand()) {
			if (!interaction.inCachedGuild()) {
				return;
			}

			const { commandName } = interaction;
			const command = client.commandManager.contextMenuCommands.get(commandName);

			if (!command) {
				console.warn(`Unknown context menu command: ${commandName}`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				await this.handleCommandInteractionError(interaction, error);
			}
		} else if (interaction.isAutocomplete()) {
			if (!interaction.inCachedGuild()) {
				return;
			}

			const { commandName } = interaction;

			const command = client.commandManager.slashCommands.get(commandName);

			if (!command) {
				console.warn(`Unknown slash command: ${commandName}`);
				return;
			}

			if (!command.autocomplete) {
				console.warn(
					`Command '${commandName}' used autocomplete option but no methods were declared.`,
				);
				return;
			}

			try {
				await command.autocomplete(interaction);
			} catch (error) {
				logger.error("Failed to respond autocomplete:", error);
			}
		}
	}

	private async handleCommandInteractionError(interaction: CommandInteraction, error: unknown) {
		const { commandName } = interaction;

		logger.error(`An error occurred while executing '${commandName}':`, error);

		if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownInteraction) {
			return; // Too late to respond
		}

		if (interaction.isRepliable()) {
			const content = "An error occurred while executing this command.";

			try {
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
				} else {
					await interaction.reply({ content, flags: MessageFlags.Ephemeral });
				}
			} catch (replyError) {
				logger.error("Failed to notify user of command failure:", replyError);
			}
		}
	}
}
