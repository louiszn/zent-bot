import { InteractionContextType, SlashCommandBuilder } from "discord.js";
import type { HybridContext } from "../../base/Command.js";
import { HybridCommand, useHybridCommand } from "../../base/Command.js";

@useHybridCommand({
	applicationCommandData: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Displays bot latency.")
		.setContexts(InteractionContextType.Guild),
	prefixTriggers: ["ping"],
})
export default class PingCommand extends HybridCommand {
	public async execute(context: HybridContext) {
		await context.send(`Pong! ${this.client.ws.ping}ms!`);
	}
}
