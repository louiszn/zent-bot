import type { MessageContextMenuCommandInteraction } from "discord.js";
import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	InteractionContextType,
	MessageFlags,
} from "discord.js";
import { ContextMenuCommand, useContextMenuCommand } from "../../base/command/Command.js";

import logger from "../../libs/logger.js";
import db from "../../database/index.js";
import { eq } from "drizzle-orm";
import { characterMessagesTable } from "../../database/schema/character.js";

@useContextMenuCommand({
	data: new ContextMenuCommandBuilder()
		.setName("Delete character's message")
		.setContexts(InteractionContextType.Guild)
		.setType(ApplicationCommandType.Message),
})
export default class DeleteCharMessageCommand extends ContextMenuCommand {
	public async execute(interaction: MessageContextMenuCommandInteraction<"cached">) {
		const { targetMessage } = interaction;

		await interaction.deferReply({
			flags: MessageFlags.Ephemeral,
		});

		if (!targetMessage.webhookId) {
			await interaction.followUp({
				content: "This message isn't sent by a character.",
			});

			return;
		}

		const characterMessage = await db.query.characterMessagesTable.findFirst({
			where: eq(characterMessagesTable.id, targetMessage.id),
			with: {
				character: true,
			},
		});

		if (!characterMessage) {
			await interaction.followUp({
				content: "This message isn't sent by a character or isn't in the database.",
			});

			return;
		}

		if (!characterMessage.character || characterMessage.character.userId !== interaction.user.id) {
			await interaction.followUp({
				content: "You don't have permissions to delete this message.",
			});

			return;
		}

		try {
			await targetMessage.delete();

			await interaction.deleteReply();

			await db
				.delete(characterMessagesTable)
				.where(eq(characterMessagesTable.id, targetMessage.id));
		} catch (error) {
			logger.error(`Failed to delete message ${characterMessage.id} from database:`, error);

			await interaction.followUp({
				content: "Failed to delete character message.",
			});
		}
	}
}
