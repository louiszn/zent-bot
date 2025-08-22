import type {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	CommandInteraction,
	ContextMenuCommandInteraction,
	Interaction,
	MessageComponentInteraction,
	ModalSubmitInteraction,
} from "discord.js";
import { DiscordAPIError, Events, MessageFlags, RESTJSONErrorCodes } from "discord.js";

import { Listener, useListener } from "../base/listener/Listener.js";
import type { HybridCommandConstructor, SlashCommandConstructor } from "../base/command/Command.js";
import { HybridCommand } from "../base/command/Command.js";

import logger from "../libs/logger.js";
import { SlashHybridContext } from "../base/command/HybridContext.js";
import { DummyArgumentResolver } from "../base/command/argument/ArgumentResolver.js";

@useListener(Events.InteractionCreate)
export default class InteractionCreateListener extends Listener<Events.InteractionCreate> {
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
		if (!interaction.inCachedGuild()) {
			return;
		}

		if (interaction.isAutocomplete()) {
			await this.handleAutocomplete(interaction);
			return;
		}

		if (interaction.isChatInputCommand()) {
			await this.handleChatInputCommand(interaction);
			return;
		}

		if (interaction.isContextMenuCommand()) {
			await this.handleContextMenuCommand(interaction);
			return;
		}
	}

	private async handleAutocomplete(interaction: AutocompleteInteraction<"cached">): Promise<void> {
		const { client } = this;
		const { managers } = client;
		const { commandName } = interaction;

		const command = managers.commands.slashes.get(commandName);

		if (!command) {
			logger.warn(`Unknown slash command: ${commandName}`);
			return;
		}

		if (!command.autocomplete) {
			logger.warn(
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

	private async handleChatInputCommand(interaction: ChatInputCommandInteraction<"cached">) {
		const { client } = this;
		const { managers } = client;

		const { commandName } = interaction;

		const command = managers.commands.slashes.get(commandName);

		if (!command) {
			logger.warn(`Unknown slash command: ${commandName}`);
			return;
		}

		try {
			if (command instanceof HybridCommand) {
				const context = new SlashHybridContext(interaction);

				const dummyArgs = new DummyArgumentResolver();

				await command.execute(context, dummyArgs);

				await (command.constructor as HybridCommandConstructor).subcommands.handle(
					command,
					context,
					dummyArgs,
				);
			} else {
				await command.execute(interaction);

				await (command.constructor as SlashCommandConstructor).subcommands.handle(
					command,
					interaction,
				);
			}
		} catch (error) {
			await this.handleRepliableInteractionError(interaction, error);
		}
	}

	private async handleContextMenuCommand(
		interaction: ContextMenuCommandInteraction<"cached">,
	): Promise<void> {
		const { client } = this;
		const { managers } = client;

		const { commandName } = interaction;

		const command = managers.commands.contextMenus.get(commandName);

		if (!command) {
			logger.warn(`Unknown context menu command: ${commandName}`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			await this.handleRepliableInteractionError(interaction, error);
		}
	}

	private async handleComponentInteraction(
		interaction: MessageComponentInteraction | ModalSubmitInteraction,
	): Promise<void> {
		const { client } = this;
		const { managers } = client;

		if (!interaction.inCachedGuild()) {
			return;
		}

		const [preCustomId, ...args] = interaction.customId.split(":");

		if (!preCustomId) {
			return;
		}

		const component = managers.components.get(preCustomId);

		if (!component) {
			logger.warn(`Unknown component: ${preCustomId}`);
			return;
		}

		try {
			if (interaction.isAnySelectMenu()) {
				await component.executeSelectMenu?.(interaction, args);
				return;
			}

			if (interaction.isButton()) {
				await component.executeButton?.(interaction, args);
				return;
			}

			if (interaction.isModalSubmit()) {
				await component.executeModalSubmit?.(interaction, args);
				return;
			}
		} catch (error) {
			await this.handleRepliableInteractionError(interaction, error);
		}
	}

	private async handleRepliableInteractionError(
		interaction:
			| CommandInteraction<"cached">
			| MessageComponentInteraction<"cached">
			| ModalSubmitInteraction<"cached">,
		error: unknown,
	): Promise<void> {
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
