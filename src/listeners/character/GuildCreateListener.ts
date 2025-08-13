import type { Guild } from "discord.js";
import { Events } from "discord.js";
import { Listener, useListener } from "../../base/listener/Listener.js";
import CharacterManager from "../../libs/CharacterManager.js";

@useListener(Events.GuildCreate)
export default class GuildCreateListener extends Listener<Events.GuildCreate> {
	public override async execute(guild: Guild): Promise<void> {
		await CharacterManager.initializeGuild(guild);
	}
}
