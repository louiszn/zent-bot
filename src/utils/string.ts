export function sanitize(input: string): string {
	return input.replace(/[^\w]/g, "");
}

export function extractId(input: string): string | null {
	const match = input.match(/\d{17,20}/);
	return match ? match[0] : null;
}