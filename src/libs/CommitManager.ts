import type { RestEndpointMethodTypes } from "@octokit/rest";
import { Octokit } from "@octokit/rest";

import { Collection } from "discord.js";
import logger from "./logger.js";

import pkg from "./pkg.js";
import { parseRepoURL } from "../utils/github.js";

const octokit = new Octokit();

export type RepoCommit =
	RestEndpointMethodTypes["repos"]["listCommits"]["response"]["data"][number];

export default class CommitManager {
	public static commits = new Collection<string, RepoCommit>();

	private static intervalId?: NodeJS.Timeout;

	private static initialized = false;

	public static repoURL = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;

	public static async getAll(force = false): Promise<Collection<string, RepoCommit>> {
		if (force || !this.initialized) {
			try {
				if (!this.repoURL) {
					logger.warn("Missing repository field in package.json");
					return this.commits;
				}

				const { owner, repo } = parseRepoURL(this.repoURL);

				const iterator = octokit.paginate.iterator(octokit.repos.listCommits, {
					owner,
					repo,
					per_page: 100,
				});

				const newCommits = new Collection<string, RepoCommit>();

				for await (const response of iterator) {
					const { data: commits } = response;

					for (const commit of commits) {
						newCommits.set(commit.sha, commit);
					}
				}

				this.commits = newCommits;

				this.initialized = true;
			} catch (error) {
				logger.error("An error occurred while fetching commits:", error);
			}
		}

		return this.commits;
	}

	public static startInterval() {
		this.intervalId = setInterval(() => {
			void this.getAll(true);
		}, 5 * 60_000);
	}

	public static stopInterval() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
		}
	}
}
