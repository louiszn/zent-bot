import type { Guild } from "discord.js";
import { Events } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";
import GuildManager from "../managers/GuildManager.js";

@useListener(Events.GuildAvailable)
export default class GuildAvailable extends Listener<Events.GuildAvailable> {
	public override async execute(guild: Guild): Promise<void> {
		await GuildManager.create(guild.id);
	}
}
