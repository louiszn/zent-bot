import { Events, type Message, type MessageSnapshot } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";
import config from "../config.js";
import prisma from "../libs/prisma.js";

const WHITELISTED_DOMAINS = ["tenor.com"] as const;

const LINK_REGEX = /https?:\/\/\S+/gi;

@useListener(Events.MessageCreate)
export default class RBDMessageListener extends Listener<Events.MessageCreate> {
	public override async execute(message: Message): Promise<void> {
		if (
			message.guildId !== config.rbd.guildId ||
			message.channelId !== config.rbd.channelId ||
			message.author.bot ||
			!message.channel.isSendable()
		) {
			return;
		}

		if (!this.isMessageSpoilered(message)) {
			await message.delete();
			await message.channel.send(
				`${message.author} các nội dung chứa link, ảnh hay video phải được làm ẩn.`,
			);
			return;
		}

		await prisma.rbdUserCount.upsert({
			where: { userId: message.author.id },
			update: {
				count: { increment: 1 },
			},
			create: {
				userId: message.author.id,
				count: 1,
			},
		});
	}

	private isMessageSpoilered(message: Message | MessageSnapshot) {
		// Remove all text between double pipes (||), which is used in Discord to mark spoilers.
		// This leaves only unspoilered content for us to check for unspoilered links.
		const withoutSpoilersContent = message.content.replace(/\|\|.*?\|\|/gs, "");

		// Find all unspoilered links in the content.
		const unspoileredLinks = [...withoutSpoilersContent.matchAll(LINK_REGEX)];

		// Check if any of these links are not whitelisted
		const hasUnspoileredLinks = unspoileredLinks.some((match) => {
			const url = match[0];

			try {
				const { hostname } = new URL(url);

				return !WHITELISTED_DOMAINS.some(
					(domain) => hostname === domain || hostname.endsWith(`.${domain}`),
				);
			} catch {
				return true;
			}
		});

		// Check for any attachments that are not marked as spoilered.
		const hasUnspoileredMedia = message.attachments.some((a) => !a.spoiler);

		return (
			!hasUnspoileredLinks &&
			!hasUnspoileredMedia &&
			// Recursively check forwarded (snapshot) messages
			message.messageSnapshots?.every(this.isMessageSpoilered)
		);
	}
}
