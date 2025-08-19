export function sanitize(input: string): string {
	return input.replace(/[^\w]/g, "");
}

export function extractId(input: string): string | null {
	const match = input.match(/\d{17,20}/);
	return match ? match[0] : null;
}

export function formatTime(date: Date): string {
	return date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});
}

export function truncate(input: string, length: number): string {
	if (input.length < length) {
		return input;
	}

	return input.slice(0, length - 3) + "...";
}
