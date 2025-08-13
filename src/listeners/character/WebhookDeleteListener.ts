import type { GuildAuditLogsEntry } from "discord.js";
import { AuditLogEvent, Events } from "discord.js";
import { Listener, useListener } from "../../base/listener/Listener.js";
import CharacterManager from "../../libs/CharacterManager.js";

@useListener(Events.GuildAuditLogEntryCreate)
export default class WebhookDeleteListener extends Listener<Events.GuildAuditLogEntryCreate> {
	public async execute(entry: GuildAuditLogsEntry): Promise<void> {
		if (entry.action !== AuditLogEvent.WebhookDelete) {
			return;
		}

		const channelId = CharacterManager.webhooks.findKey((bw) => bw.id === entry.targetId);

		if (!channelId) {
			return;
		}

		CharacterManager.webhooks.delete(channelId);
	}
}
