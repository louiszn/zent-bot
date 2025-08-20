import type { MessageContextMenuCommandInteraction } from "discord.js";
import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	InteractionContextType,
	MessageFlags,
} from "discord.js";

import { ContextMenuCommand, useContextMenuCommand } from "../../base/command/Command.js";
import db from "../../database/index.js";
import { characterMessagesTable } from "../../database/schema/character.js";
import { eq } from "drizzle-orm";
import CharacterManager from "../../managers/CharacterManager.js";

@useContextMenuCommand({
	data: new ContextMenuCommandBuilder()
		.setName("Get character information")
		.setContexts(InteractionContextType.Guild)
		.setType(ApplicationCommandType.Message),
})
export default class GetCharacterInfoCommand extends ContextMenuCommand {
	public async execute(interaction: MessageContextMenuCommandInteraction<"cached">) {
		const { targetMessage } = interaction;

		const characterMessage = await db.query.characterMessagesTable.findFirst({
			where: eq(characterMessagesTable.id, targetMessage.id),
			with: { character: true },
		});

		if (!characterMessage) {
			await interaction.reply({
				content: "This message is not sent by a character or not in my database.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		if (!characterMessage.character) {
			await interaction.reply({
				content: "This character doesn't exist anymore.",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		await interaction.reply({
			embeds: [CharacterManager.getInformationEmbed(characterMessage.character)],
			flags: MessageFlags.Ephemeral,
		});
	}
}
