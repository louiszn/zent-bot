import { EmbedBuilder, InteractionContextType, SlashCommandBuilder } from "discord.js";
import { HybridCommand, useHybridCommand } from "../../base/command/Command.js";
import type { HybridContext } from "../../base/command/HybridContext.js";

@useHybridCommand({
	applicationCommandData: new SlashCommandBuilder()
		.setName("information")
		.setDescription("Display all information about me :3")
		.setContexts(InteractionContextType.Guild),
	prefixTriggers: ["info", "infor"],
})
export default class InformationCommand extends HybridCommand {
	public override async execute(context: HybridContext) {
		const { client } = this;

		const louis = await client.users.fetch("1019066895195971666");

		const embed = new EmbedBuilder()
			.setThumbnail(client.user.displayAvatarURL({ size: 128 }))
			.setAuthor({
				name: context.user.displayName,
				iconURL: context.user.displayAvatarURL({ size: 64 }),
			})
			.setColor(0x4752c4)
			.setFooter({
				text: "I make this bot btw",
				iconURL: louis.displayAvatarURL({ size: 128 }),
			})
			.setTimestamp(new Date());

		await context.send({
			embeds: [embed],
		});
	}
}
