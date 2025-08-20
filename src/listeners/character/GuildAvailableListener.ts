import type { Guild } from "discord.js";
import { Events } from "discord.js";
import { Listener, useListener } from "../../base/listener/Listener.js";
import CharacterManager from "../../managers/CharacterManager.js";

@useListener(Events.GuildAvailable)
export default class GuildAvailableListener extends Listener<Events.GuildAvailable> {
	public override async execute(guild: Guild): Promise<void> {
		await CharacterManager.initializeGuild(guild);
	}
}
