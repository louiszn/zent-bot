import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { HybridCommand, useHybridCommand } from "../../base/command/Command.js";
import type { HybridContext } from "../../base/command/HybridContext.js";
import GuildManager from "../../managers/GuildManager.js";

@useHybridCommand({
	applicationCommandData: new SlashCommandBuilder()
		.setName("prefix")
		.setDescription("Display the current prefix or set a new one for this server")
		.addStringOption((option) =>
			option.setName("new-prefix").setDescription("New prefix to modify"),
		),
	prefixTriggers: ["prefix"],
})
export default class PrefixCommand extends HybridCommand {
	public override async execute(context: HybridContext, args: string[]): Promise<void> {
		const prefixToSet = context.isInteraction()
			? context.source.options.getString("new-prefix")
			: args[1];

		if (prefixToSet) {
			const guild = await GuildManager.update(context.guild.id, {
				prefix: prefixToSet,
			});

			if (!guild?.prefix) {
				await context.send({
					content: "An error occurred while trying to update prefix.",
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			await context.send(`Successfully set prefix of this server to \`${guild.prefix}\``);
		} else {
			const guild = await GuildManager.get(context.guild.id);

			if (!guild) {
				await context.send({
					content: "An error occurred while trying to get guild prefix.",
					flags: MessageFlags.Ephemeral,
				});

				return;
			}

			await context.send(`The current prefix of this server is \`${guild.prefix || "_"}\``);
		}
	}
}
