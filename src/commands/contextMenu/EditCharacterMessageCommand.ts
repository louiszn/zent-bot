import type { MessageContextMenuCommandInteraction } from "discord.js";
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	InteractionContextType,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";

import { ContextMenuCommand, useContextMenuCommand } from "../../base/command/Command.js";

import { MAX_MESSAGE_CONTENT_LENGTH } from "../../libs/character.js";
import { eq } from "drizzle-orm";

import db from "../../database/index.js";
import { characterMessagesTable } from "../../database/schema/character.js";

@useContextMenuCommand({
	data: new ContextMenuCommandBuilder()
		.setName("Edit character's message")
		.setContexts(InteractionContextType.Guild)
		.setType(ApplicationCommandType.Message),
})
export default class EditCharacterMessageCommand extends ContextMenuCommand {
	public async execute(interaction: MessageContextMenuCommandInteraction<"cached">) {
		const { targetMessage } = interaction;

		const characterMessage = await db.query.characterMessagesTable.findFirst({
			where: eq(characterMessagesTable.id, targetMessage.id),
			with: {
				character: true,
			},
		});

		if (!characterMessage || characterMessage.character?.userId !== interaction.user.id) {
			await interaction.reply({
				content: "You can't edit this message.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const modal = new ModalBuilder().setTitle("Edit message").setCustomId("character:edit-message");

		const contentInput = new TextInputBuilder()
			.setCustomId("content")
			.setLabel("Content")
			.setValue(characterMessage.content)
			.setStyle(TextInputStyle.Paragraph)
			.setMaxLength(MAX_MESSAGE_CONTENT_LENGTH);

		modal.setComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(contentInput));

		await interaction.showModal(modal);
	}
}
