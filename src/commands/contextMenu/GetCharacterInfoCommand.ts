import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	InteractionContextType,
	MessageContextMenuCommandInteraction,
	MessageFlags,
} from "discord.js";
import { ContextMenuCommand, useContextMenuCommand } from "../../base/Command.js";
import ZentBot from "../../base/ZentBot.js";
import prisma from "../../libs/prisma.js";
import { getCharacterInformationEmbed } from "../../libs/character.js";

@useContextMenuCommand(
	new ContextMenuCommandBuilder()
		.setName("Get character information")
		.setContexts(InteractionContextType.Guild)
		.setType(ApplicationCommandType.Message),
)
export default class GetCharacterInfoCommand extends ContextMenuCommand {
	public async execute(interaction: MessageContextMenuCommandInteraction<"cached">) {
		const characterMessage = await prisma.message.findFirst({
			where: { id: interaction.targetMessage.id },
			include: { character: true },
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
			embeds: [getCharacterInformationEmbed(characterMessage.character)],
			flags: MessageFlags.Ephemeral,
		});
	}
}
