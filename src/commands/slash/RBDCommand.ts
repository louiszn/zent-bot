import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { SlashCommand, useSlashCommand } from "../../base/command/Command.js";
import config from "../../config.js";
import prisma from "../../libs/prisma.js";
import type { Prisma } from "@prisma/client";

const EMOJIS_MAP: Record<number, string> = {
	1: ":first_place:",
	2: ":second_place:",
	3: ":third_place:",
};

@useSlashCommand(
	new SlashCommandBuilder()
		.setName("rbd")
		.setDescription("RBD command")
		.addSubcommand((subcommand) =>
			subcommand.setName("start").setDescription("Bắt đầu sự kiện"),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("stop").setDescription("Dừng sự kiện"),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("reset").setDescription("Reset bộ đếm"),
		)
		.addSubcommand((subcommand) => 
			subcommand.setName("leaderboard").setDescription("Xem bảng xếp hạng")
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
			case "reset":
				await this.onReset(interaction);
				break;
			case "leaderboard":
				await this.onLeaderboard(interaction);
				break;
		}
	}

	private async checkAdminAndreply(interaction: ChatInputCommandInteraction<"cached">) {
		if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
			await interaction.reply({
				content: "Cậu không có quyền để dùng lệnh này.",
				flags: MessageFlags.Ephemeral,
			});

			return false;
		}

		return true;
	}

	private async onStart(interaction: ChatInputCommandInteraction<"cached">) {
		if (!(await this.checkAdminAndreply(interaction))) {
			return;
		}

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

		await interaction.reply({
			content: "@everyone RBD đã bắt đầu!",
		});
	}

	private async onStop(interaction: ChatInputCommandInteraction<"cached">) {
		if (!(await this.checkAdminAndreply(interaction))) {
			return;
		}

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

		await interaction.channel.send({
			embeds: [this.getLeaderboardEmbed(counters)],
		});
	}

	private async onReset(interaction: ChatInputCommandInteraction<"cached">) {
		if (!(await this.checkAdminAndreply(interaction))) {
			return;
		}

		await prisma.rbdUserCount.deleteMany();

		await interaction.reply("Đã reset dữ liệu thành công");
	}

	private async onLeaderboard(interaction: ChatInputCommandInteraction<"cached">) {
		const counters = await prisma.rbdUserCount.findMany({
			orderBy: [{ count: "desc" }, { lastUpdated: "desc" }],
		});

		if (counters.length === 0) {
			await interaction.reply({
				content: "Không có dữ liệu nào được ghi nhận trong sự kiện RBD.",
			});
			return;
		}

		await interaction.reply({
			embeds: [this.getLeaderboardEmbed(counters)],
		});
	}

	private getLeaderboardEmbed(counters: Prisma.RbdUserCountCreateInput[]) {
		const embed = new EmbedBuilder()
			.setTitle("Bảng xếp hạng")
			.setDescription(
				counters
					.map((c, i) => `${EMOJIS_MAP[i + 1] || i + 1} <@${c.userId}> - ${c.count} tin nhắn`)
					.join("\n"),
			)
			.setColor(0xfacc15)
			.setTimestamp();

		return embed;
	}
}
