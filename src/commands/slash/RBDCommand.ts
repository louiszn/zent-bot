import type { ChatInputCommandInteraction } from "discord.js";
import {
	bold,
	ContainerBuilder,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { SlashCommand, useSlashCommand } from "../../base/command/Command.js";
import config from "../../config.js";
import prisma from "../../libs/prisma.js";
import type { RbdUserCount } from "@prisma/client";

@useSlashCommand(
	new SlashCommandBuilder()
		.setName("rbd")
		.setDescription("RBD command")
		.addSubcommand((subcommand) => subcommand.setName("start").setDescription("Bắt đầu sự kiện"))
		.addSubcommand((subcommand) => subcommand.setName("stop").setDescription("Dừng sự kiện"))
		.addSubcommand((subcommand) => subcommand.setName("reset").setDescription("Reset bộ đếm"))
		.addSubcommand((subcommand) =>
			subcommand.setName("leaderboard").setDescription("Xem bảng xếp hạng"),
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
			components: [this.getLeaderboardContainer(counters)],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: {
				parse: [],
			},
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
			components: [this.getLeaderboardContainer(counters, interaction.user.id)],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: {
				parse: [],
			},
		});
	}

	private getLeaderboardContainer(counters: RbdUserCount[], userId?: string) {
		const container = new ContainerBuilder().setAccentColor(0xfacc15);

		const medals = ["🥇", "🥈", "🥉"];

		const formatRank = (rank: number) => {
			return medals[rank - 1] ?? `${rank}.`;
		};

		const formatContent = (rank: number, counter: RbdUserCount) => {
			return `${formatRank(rank)} <@${counter.userId}> - ${counter.count.toLocaleString("vi")} tin nhắn${counter.userId === userId ? " <<<" : ""}`;
		};

		const topRanks: string[] = [];
		const ranks: string[] = [];

		for (const [i, counter] of counters.entries()) {
			const content = formatContent(i + 1, counter);

			if (i < 3) {
				topRanks.push(userId === counter.userId ? bold(content) : content);
			} else {
				ranks.push(userId === counter.userId ? bold(content) : content);
			}
		}

		container
			.addTextDisplayComponents((display) =>
				display.setContent(["## Bảng xếp hạng", topRanks.join("\n")].join("\n")),
			)
			.addSeparatorComponents((seperator) => seperator)
			.addTextDisplayComponents((display) => display.setContent(ranks.join("\n")));

		return container;
	}
}
