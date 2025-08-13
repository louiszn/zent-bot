import type { GuildMember } from "discord.js";
import { Events } from "discord.js";
import { Listener, useListener } from "../../base/listener/Listener.js";
import CharacterManager from "../../libs/CharacterManager.js";

@useListener(Events.GuildMemberAdd)
export default class GuildMemberAddListener extends Listener<Events.GuildMemberAdd> {
	public override async execute(member: GuildMember): Promise<void> {
		const characterManager = CharacterManager.create(member.id);
		await characterManager.getAll();
	}
}
