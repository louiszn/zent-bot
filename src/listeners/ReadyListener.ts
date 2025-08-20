import { Events } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";
import logger from "../libs/logger.js";
import type ZentBot from "../base/ZentBot.js";
import CommitManager from "../managers/CommitManager.js";
import GuildManager from "../managers/GuildManager.js";

@useListener(Events.ClientReady)
export default class ReadyListener extends Listener<Events.ClientReady> {
	public override async execute(client: ZentBot<true>): Promise<void> {
		logger.success(`Successfully logged in as ${client.user.tag}`);

		await Promise.all([CommitManager.getAll(), GuildManager.getAll()]);

		CommitManager.startInterval();
	}
}
