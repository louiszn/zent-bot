import type { GuildAuditLogsEntry } from "discord.js";
import { AuditLogEvent } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";

@useListener("guildAuditLogEntryCreate")
export default class WebhookDeleteListener extends Listener<"guildAuditLogEntryCreate"> {
	public async execute(entry: GuildAuditLogsEntry): Promise<void> {
		const { client } = this;

		if (entry.action !== AuditLogEvent.WebhookDelete) {
			return;
		}

		const channelId = client.botWebhooks.findKey((bw) => bw.id === entry.targetId);

		if (!channelId) {
			return;
		}

		// Delete the webhook from the cache so the bot won't try to use it if it's deleted.
		client.botWebhooks.delete(channelId);
	}
}
