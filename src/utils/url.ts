export function isValidHttpUrl(url: string): boolean {
	try {
		const u = new URL(url);
		return u.protocol === "http:" || u.protocol === "https:";
	} catch {
		return false;
	}
}


export async function isImageUrl(url: string): Promise<boolean> {
	if (!isValidHttpUrl(url)) {
		return false;
	}

	try {
		const res = await fetch(url, { method: "HEAD", redirect: "follow" });
		const type = res.headers.get("content-type");
		return type?.startsWith("image/") ?? false;
	} catch {
		return false;
	}
}
