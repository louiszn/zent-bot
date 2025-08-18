import {
	ButtonBuilder,
	ButtonStyle,
	codeBlock,
	ContainerBuilder,
	hyperlink,
	inlineCode,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
	time,
	TimestampStyles,
} from "discord.js";
import { HybridCommand, useHybridCommand } from "../../base/command/Command.js";
import type { HybridContext } from "../../base/command/HybridContext.js";
import CommitManager from "../../libs/CommitManager.js";
import { truncate } from "../../utils/string.js";

import { getRepoCommitsURL, parseRepoURL } from "../../utils/github.js";
import logger from "../../libs/logger.js";
import pkg from "../../libs/pkg.js";

import humanizeDuration from "humanize-duration";
import chalk from "chalk";

@useHybridCommand({
	applicationCommandData: new SlashCommandBuilder()
		.setName("information")
		.setDescription("Display all information about me :3")
		.setContexts(InteractionContextType.Guild),
	prefixTriggers: ["info", "infor"],
})
export default class InformationCommand extends HybridCommand {
	public override async execute(context: HybridContext) {
		const { client } = this;

		const commits = await CommitManager.getAll();

		const container = new ContainerBuilder().setAccentColor(0xfffdf6);

		container.addSectionComponents((section) =>
			section
				.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(
						[
							"### About me",
							"Hi, I'm Zent, your handy Discord server assistant! I can help with moderation, fun commands, and server utilities, especially about role-playing!",
							"",
							"To start using my features, you can use `/help` for the list of commands and information about them.",
						].join("\n"),
					),
				)
				.setThumbnailAccessory((thumbnail) =>
					thumbnail.setURL(client.user.displayAvatarURL({ size: 4096 })),
				),
		);

		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				"Have any issues or questions? Feel free to ask in our Discord server or open issues using the links below!",
			),
		);

		container.addActionRowComponents<ButtonBuilder>((row) =>
			row.setComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Link)
					.setLabel("Server")
					.setURL("https://discord.gg/pGnKbMfXke"),
				new ButtonBuilder()
					.setStyle(ButtonStyle.Link)
					.setLabel("Repository")
					.setURL("https://github.com/louiszn/zent-bot"),
			),
		);

		container.addSeparatorComponents((separator) => separator);

		container.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(
				[
					"**Stats:**",
					codeBlock(
						"ansi",
						[
							`- ${chalk.yellow.bold("Uptime:")}  ${chalk.reset.white(humanizeDuration(Date.now() - client.readyAt.getTime(), { round: true }))}`,
							`- ${chalk.yellow.bold("Servers:")} ${chalk.reset.white(client.guilds.cache.size.toLocaleString())}`,
							`- ${chalk.yellow.bold("Version:")} ${chalk.reset.white(pkg.version)}`,
							`- ${chalk.yellow.bold("Ping:")}    ${chalk.reset.white(`${client.ws.ping.toLocaleString()}ms`)}`,
						].join("\n"),
					),
				].join("\n"),
			),
		);

		container.addSeparatorComponents((separator) => separator);

		if (commits.size) {
			const amount = 3;

			const recentCommits = commits.first(amount).map((commit) => {
				const message = truncate(commit.commit.message, 25);
				const commitId = inlineCode(commit.sha.slice(0, 7));
				const date = new Date(commit.commit.author?.date || Date.now());

				const formattedTimestamp = time(date, TimestampStyles.RelativeTime);

				return `> ${hyperlink(`${commitId} ${message}`, commit.html_url)} ${formattedTimestamp}`;
			});

			const remainingCommits = Math.min(commits.size - amount, commits.size).toLocaleString();

			if (!CommitManager.repoURL) {
				logger.warn("Missing repository field in package.json");
				return;
			}

			const { owner, repo } = parseRepoURL(CommitManager.repoURL);
			const commitsURL = getRepoCommitsURL(owner, repo);

			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					[
						"**Recent commits:**",
						recentCommits.join("\n"),
						`View more ${remainingCommits} commits at our [official repository commit history](${commitsURL})`,
					].join("\n"),
				),
			);
		}

		container.addTextDisplayComponents((text) =>
			text.setContent("-# Made with ❤️ by [louiszn](https://github.com/louiszn)"),
		);

		await context.send({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}
}
