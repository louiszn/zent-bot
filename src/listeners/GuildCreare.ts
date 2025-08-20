import type { Guild } from "discord.js";
import { Events } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";
import GuildManager from "../managers/GuildManager.js";

@useListener(Events.GuildCreate)
export default class GuildCreate extends Listener<Events.GuildCreate> {
	public override async execute(guild: Guild): Promise<void> {
		await GuildManager.create(guild.id);
	}
}
