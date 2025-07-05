import type { GuildTextBasedChannel, Webhook } from "discord.js";
import type ZentBot from "../base/ZentBot.js";

export async function getWebhook(channel: GuildTextBasedChannel) {
	const client = channel.client as ZentBot<true>;

	let baseChannel;

	// Threads can send wehook messages using its parent channel and threadId option.
	if (channel.isThread()) {
		if (!channel.parent?.isTextBased()) {
			return null;
		}

		baseChannel = channel.parent;
	} else {
		baseChannel = channel;
	}

	let webhook: Webhook | undefined = client.botWebhooks.get(baseChannel.id);

	if (!webhook) {
		const webhooks = await baseChannel.fetchWebhooks();
		webhook = webhooks.find((w) => w.owner?.id === client.user.id);

		if (!webhook) {
			webhook = await baseChannel.createWebhook({
				name: client.user.displayName,
			});
		}

		client.botWebhooks.set(baseChannel.id, webhook); // Cache the webhook so we don't have to re-fetch it
	}

	return webhook;
}
