import type { MessageContextMenuCommandInteraction } from "discord.js";
import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	InteractionContextType,
	MessageFlags,
} from "discord.js";
import { ContextMenuCommand, useContextMenuCommand } from "../../base/command/Command.js";
import prisma from "../../libs/prisma.js";
import logger from "../../libs/logger.js";

@useContextMenuCommand(
	new ContextMenuCommandBuilder()
		.setName("Delete character's message")
		.setContexts(InteractionContextType.Guild)
		.setType(ApplicationCommandType.Message),
)
export default class DeleteCharMessageCommand extends ContextMenuCommand {
	public async execute(interaction: MessageContextMenuCommandInteraction<"cached">) {
		const { targetMessage } = interaction;

		if (!targetMessage.webhookId) {
			await interaction.reply({
				content: "This message isn't sent by a character.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const characterMessage = await prisma.message.findFirst({
			where: { id: targetMessage.id },
			include: {
				character: true,
			},
		});

		if (!characterMessage) {
			await interaction.reply({
				content: "This message isn't sent by a character or isn't in the database.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (!characterMessage.character || characterMessage.character.userId !== interaction.user.id) {
			await interaction.reply({
				content: "You don't have permissions to delete this message.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		await interaction.deferReply({
			flags: MessageFlags.Ephemeral,
		});

		await targetMessage.delete();

		await interaction.deleteReply();

		try {
			await prisma.message.delete({
				where: { id: characterMessage.id },
			});
		} catch (error) {
			logger.error(`Failed to delete message ${characterMessage.id} from database:`, error);
		}
	}
}
