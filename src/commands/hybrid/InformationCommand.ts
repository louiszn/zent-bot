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

@useHybridCommand({
	applicationCommandData: new SlashCommandBuilder()
		.setName("information")
		.setDescription("Display all information about me :3")
		.setContexts(InteractionContextType.Guild),
	prefixTriggers: ["info", "infor"],
})
export default class InformationCommand extends HybridCommand {
	private totalCommit!: number;

	private async fecthCommit(amount: number) {
		const response = await fetch(
			"https://api.github.com/repos/louiszn/zent-bot/commits?per_page=100",
		);

		const body = (await response.json()) as CommitList;

		this.totalCommit = body.length;

		return body.slice(0, amount);
	}

	public override async execute(context: HybridContext) {
		const { client } = this;

		const Louis = await client.users.fetch("1019066895195971666");
		const commits = await this.fecthCommit(3);

		const commitPrettier = commits.map((commit): string => {
			const commitMessage =
				commit.commit.message.split("\n")[0].length > 31
					? commit.commit.message.split("\n")[0].slice(0, 30) + "..."
					: commit.commit.message.split("\n")[0];
			const commitID = commit.sha.slice(0, 7);

			return `> ${hyperlink(`${inlineCode(commitID)} ${commitMessage}`, commit.html_url)} at ${time(new Date(commit.commit.author!.date!), TimestampStyles.LongDate)}`;
		});

		const embed = new EmbedBuilder()
			.setThumbnail(client.user.displayAvatarURL({ size: 128 }))
			.setAuthor({
				name: context.user.displayName,
				iconURL: context.user.displayAvatarURL({ size: 64 }),
			})
			.setColor(0x4752c4)

			.setDescription(
				"Zent Bot is an utility bot, originally made for our friends server with love for role playing.",
			)
			.addFields([
				{
					name: "Uptime",
					value: `${time(client.readyAt, TimestampStyles.LongDateTime)} (${time(client.readyAt, TimestampStyles.RelativeTime)})`,
				},
				{
					name: "Recent commits:",
					value:
						commitPrettier.join("\n") +
						`\nView more **${Math.min(this.totalCommit - 3, this.totalCommit)}** commits at our ${hyperlink("official repository commit history", "https://github.com/louiszn/zent-bot/commits/main/")}`,
				},
			])

			.setFooter({
				text: "I make this bot btw",
				iconURL: Louis.displayAvatarURL({ size: 128 }),
			})
			.setTimestamp(new Date());

		await context.send({
			embeds: [embed],
		});
	}
}

/**
 * GitHub API Types for List Commits
 * Generated from GitHub API Response Schema
 */

// Base Git User type for author/committer information
export interface GitUser {
	name?: string;
	email?: string;
	date?: string;
}

// Simple User type for GitHub users
export interface SimpleUser {
	name?: string | null;
	email?: string | null;
	login: string;
	id: number;
	node_id: string;
	avatar_url: string;
	gravatar_id?: string | null;
	url: string;
	html_url: string;
	followers_url: string;
	following_url: string;
	gists_url: string;
	starred_url: string;
	subscriptions_url: string;
	organizations_url: string;
	repos_url: string;
	events_url: string;
	received_events_url: string;
	type: string;
	site_admin: boolean;
	starred_at?: string;
	user_view_type?: string;
}

// Empty object type
export type EmptyObject = object;

// Tree object in commit
export interface Tree {
	sha: string;
	url: string;
}

// Verification object
export interface Verification {
	verified: boolean;
	reason: string;
	payload: string | null;
	signature: string | null;
	verified_at: string | null;
}

// Inner commit object
export interface CommitObject {
	url: string;
	author: GitUser | null;
	committer: GitUser | null;
	message: string;
	comment_count: number;
	tree: Tree;
	verification?: Verification;
}

// Parent commit reference
export interface ParentCommit {
	sha: string;
	url: string;
	html_url?: string;
}

// Commit statistics
export interface CommitStats {
	additions?: number;
	deletions?: number;
	total?: number;
}

// File diff entry
export interface DiffEntry {
	sha: string;
	filename: string;
	status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
	additions: number;
	deletions: number;
	changes: number;
	blob_url: string;
	raw_url: string;
	contents_url: string;
	patch?: string;
	previous_filename?: string;
}

// Main Commit interface
export interface Commit {
	url: string;
	sha: string;
	node_id: string;
	html_url: string;
	comments_url: string;
	commit: CommitObject;
	author: SimpleUser | null;
	committer: SimpleUser | null;
	parents: ParentCommit[];
	stats?: CommitStats;
	files?: DiffEntry[];
}

// Type for the array response from List Commits API
export type CommitList = Commit[];

// Helper type guards
export const isSimpleUser = (user: SimpleUser | EmptyObject | null): user is SimpleUser => {
	return user !== null && "login" in user;
};

export const isEmptyObject = (user: SimpleUser | EmptyObject | null): user is EmptyObject => {
	return user !== null && !("login" in user) && Object.keys(user).length === 0;
};

// Example usage types
export interface CommitListParams {
	owner: string;
	repo: string;
	sha?: string;
	path?: string;
	author?: string;
	committer?: string;
	since?: string;
	until?: string;
	per_page?: number;
	page?: number;
}

export interface CommitListResponse {
	data: CommitList;
	status: number;
	headers: Record<string, string>;
}
