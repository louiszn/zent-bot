import {
	EmbedBuilder,
	hyperlink,
	inlineCode,
	InteractionContextType,
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

		const embed = new EmbedBuilder()
			.setThumbnail(client.user.displayAvatarURL({ size: 128 }))
			.setAuthor({
				name: context.user.displayName,
				iconURL: context.user.displayAvatarURL({ size: 64 }),
			})
			.setColor(0x4752c4)
			.setDescription(
				"Zent Bot is a utility bot, originally made with love for our friends' server, especially for role-playing.",
			)
			.addFields([
				{
					name: "Uptime",
					value: `(${time(client.readyAt, TimestampStyles.RelativeTime)})`,
				},
			])
			.setTimestamp(new Date());

		if (commits.size === 0) {
			embed.addFields({
				name: "Recent Commits:",
				value: "*None*",
			});
		} else {
			const amount = 3;

			const recentCommits = commits.first(amount).map((commit) => {
				const message = truncate(commit.commit.message, 25);
				const commitId = inlineCode(commit.sha.slice(0, 7));
				const date = new Date(commit.commit.author?.date || Date.now());

				const formattedTimestamp = time(date, TimestampStyles.RelativeTime);

				return `> ${hyperlink(`${commitId} ${message}`, commit.html_url)} at ${formattedTimestamp}`;
			});

			const remainingCommits = Math.min(commits.size - amount, commits.size).toLocaleString();

			if (!CommitManager.repoURL) {
				logger.warn("Missing repository field in package.json");
				return;
			}

			const { owner, repo } = parseRepoURL(CommitManager.repoURL);
			const commitsURL = getRepoCommitsURL(owner, repo);

			recentCommits.push(
				`View more ${remainingCommits} commits at our [official repository commit history](${commitsURL})`,
			);

			embed.addFields({
				name: "Recent commits:",
				value: recentCommits.join("\n"),
			});
		}

		await context.send({
			embeds: [embed],
		});
	}
}
