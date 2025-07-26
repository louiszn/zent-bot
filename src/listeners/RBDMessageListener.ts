import type { Message } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";
import config from "../config.js";
import prisma from "../libs/prisma.js";

@useListener("messageCreate")
export default class RBDMessageListener extends Listener<"messageCreate"> {
	public override async execute(message: Message): Promise<void> {
		if (
			message.guildId !== config.rbd.guildId ||
			message.channelId !== config.rbd.channelId ||
			message.author.bot ||
			!message.channel.isSendable()
		) {
			return;
		}

		const withoutSpoilers = message.content.replace(/\|\|.*?\|\|/gs, "");
		const hasUnspoileredLinks = /https?:\/\/\S+/gi.test(withoutSpoilers);
		const allMediaSpoilered = message.attachments.every((a) => a.spoiler);

		if (hasUnspoileredLinks || !allMediaSpoilered) {
			await message.delete();
			await message.channel.send(`${message.author} các nội dung chứa link, ảnh hay video phải được làm ẩn.`);
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
}
