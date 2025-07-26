import type {
	AutocompleteInteraction,
	CommandInteraction,
	Interaction,
	MessageComponentInteraction,
	ModalSubmitInteraction,
} from "discord.js";
import { DiscordAPIError, MessageFlags, RESTJSONErrorCodes } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";
import { HybridCommand, SlashHybridContext } from "../base/command/Command.js";
import logger from "../libs/logger.js";

@useListener("interactionCreate")
export default class InteractionCreateListener extends Listener<"interactionCreate"> {
	public async execute(interaction: Interaction) {
		// Autocomplete is also handled by command
		if (interaction.isCommand() || interaction.isAutocomplete()) {
			await this.handleCommandInteraction(interaction);
		} else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
			await this.handleComponentInteraction(interaction);
		}
	}

	private async handleCommandInteraction(
		interaction: CommandInteraction | AutocompleteInteraction,
	) {
		const { client } = this;

		if (!interaction.inCachedGuild()) {
			return;
		}

		if (interaction.isChatInputCommand()) {
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
				await this.handleInteractionError(interaction, error);
			}
		} else if (interaction.isContextMenuCommand()) {
			if (!interaction.inCachedGuild()) {
				const { commandName } = interaction;
				const command = client.commandManager.contextMenuCommands.get(commandName);

				if (!command) {
					console.warn(`Unknown context menu command: ${commandName}`);
					return;
				}

				try {
					await command.execute(interaction);
				} catch (error) {
					await this.handleInteractionError(interaction, error);
				}
			} else if (interaction.isAutocomplete()) {
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
	}

	private async handleComponentInteraction(
		interaction: MessageComponentInteraction | ModalSubmitInteraction,
	) {
		const { client } = this;

		if (!interaction.inCachedGuild()) {
			return;
		}

		const [preCustomId, ...args] = interaction.customId.split(":");

		if (!preCustomId) {
			return;
		}

		const component = client.componentManager.components.get(preCustomId);

		if (!component) {
			logger.warn(`Unknown component: ${preCustomId}`);
			return;
		}

		try {
			if (interaction.isAnySelectMenu()) {
				await component.executeSelectMenu?.(interaction, args);
			} else if (interaction.isButton()) {
				await component.executeButton?.(interaction, args);
			} else if (interaction.isModalSubmit()) {
				await component.executeModalSubmit?.(interaction, args);
			}
		} catch (error) {
			await this.handleInteractionError(interaction, error);
		}
	}

	private async handleInteractionError(
		interaction:
			| CommandInteraction<"cached">
			| MessageComponentInteraction<"cached">
			| ModalSubmitInteraction<"cached">,
		error: unknown,
	) {
		let target: string;

		if ("commandName" in interaction) {
			target = interaction.commandName;
		} else {
			target = interaction.customId;
		}

		logger.error(`An error occurred while executing '${target}':`, error);

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
