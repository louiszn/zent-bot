import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { SlashCommand, useSlashCommand } from "../../base/command/Command.js";
import config from "../../config.js";
import prisma from "../../libs/prisma.js";

const EMOJIS_MAP: Record<number, string> = {
	1: ":first_place:",
	2: ":second_place:",
	3: ":third_place:",
};

@useSlashCommand(
	new SlashCommandBuilder()
		.setName("rbd")
		.setDescription("RBD command")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((subcommand) =>
			subcommand.setName("start").setDescription("Start the event and counter"),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("stop").setDescription("Stop the event andd reset database"),
		),
)
export default class RBDCommand extends SlashCommand {
	public override async execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void> {
		if (
			interaction.guildId !== config.rbd.guildId ||
			interaction.channelId !== config.rbd.channelId
		) {
			return;
		}

		switch (interaction.options.getSubcommand()) {
			case "start":
				await this.onStart(interaction);
				break;
			case "stop":
				await this.onStop(interaction);
				break;
		}
	}

	private async onStart(interaction: ChatInputCommandInteraction<"cached">) {
		if (
			!interaction.channel ||
			!interaction.channel.isTextBased() ||
			interaction.channel.isThread()
		) {
			return;
		}

		await interaction.channel.permissionOverwrites.edit(interaction.guildId, {
			SendMessages: true,
			AddReactions: true,
		});

		await interaction.channel.send({
			content: "@everyone RBD đã bắt đầu!",
		});
	}

	private async onStop(interaction: ChatInputCommandInteraction<"cached">) {
		if (
			!interaction.channel ||
			!interaction.channel.isTextBased() ||
			interaction.channel.isThread()
		) {
			return;
		}

		await interaction.channel.permissionOverwrites.edit(interaction.guildId, {
			SendMessages: false,
			AddReactions: false,
		});

		await interaction.reply({
			content: "@everyone RBD đã kết thúc! Đang tính kết quả...",
		});

		const counters = await prisma.rbdUserCount.findMany({
			orderBy: [{ count: "desc" }, { lastUpdated: "desc" }],
		});

		if (counters.length === 0) {
			await interaction.channel.send({
				content: "Không có dữ liệu nào được ghi nhận trong sự kiện RBD.",
			});
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle("Bảng xếp hạng")
			.setDescription(
				counters
					.map((c, i) => `${EMOJIS_MAP[i + 1] || i + 1} <@${c.userId}> - ${c.count} tin nhắn`)
					.join("\n"),
			)
			.setColor(0xfacc15)
			.setTimestamp();

		await interaction.channel.send({
			embeds: [embed],
		});

		await prisma.rbdUserCount.deleteMany();
	}
}
