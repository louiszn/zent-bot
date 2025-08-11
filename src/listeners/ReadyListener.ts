import { Events } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";
import logger from "../libs/logger.js";
import type ZentBot from "../base/ZentBot.js";

@useListener(Events.ClientReady)
export default class ReadyListener extends Listener<Events.ClientReady> {
	public override async execute(client: ZentBot<true>): Promise<void> {
		logger.success(`Successfully logged in as ${client.user.tag}`);
	}
}
