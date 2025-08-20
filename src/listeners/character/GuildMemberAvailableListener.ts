import type { GuildMember, PartialGuildMember } from "discord.js";
import { Events } from "discord.js";
import { Listener, useListener } from "../../base/listener/Listener.js";
import CharacterManager from "../../managers/CharacterManager.js";

@useListener(Events.GuildMemberAvailable)
export default class GuildmemberAvailableListener extends Listener<Events.GuildMemberAvailable> {
	public override async execute(member: GuildMember | PartialGuildMember): Promise<void> {
		const characterManager = CharacterManager.create(member.id);
		await characterManager.getAll();
	}
}
