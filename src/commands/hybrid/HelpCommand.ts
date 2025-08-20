import { EmbedBuilder, InteractionContextType, SlashCommandBuilder } from "discord.js";
import { HybridCommand, useHybridCommand } from "../../base/command/Command.js";
import type { HybridContext } from "../../base/command/HybridContext.js";

@useHybridCommand({
	applicationCommandData: new SlashCommandBuilder()
		.setName("help")
		.setDescription("")
		.setContexts(InteractionContextType.Guild),
	prefixTriggers: ["help", "h"],
})
export default class HelpCommand extends HybridCommand {
	public async execute(context: HybridContext) {
		const embed = new EmbedBuilder().setDescription("ok.com").setTimestamp(new Date());

		await context.send({
			embeds: [embed],
		});
	}
}
