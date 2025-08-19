export interface ParsedRepoURL {
	owner: string;
	repo: string;
}

export function parseRepoURL(url: string): ParsedRepoURL {
	const { pathname, hostname } = new URL(url);

	if (hostname !== "github.com") {
		throw Error("Invalid github url");
	}

	const [owner, repo] = pathname.split("/").filter(Boolean);

	return {
		owner,
		repo: repo.replace(/\.git$/, ""),
	};
}

export function getRepoCommitsURL(owner: string, repo: string) {
	return `https://github.com/${owner}/${repo}/commits`;
}
