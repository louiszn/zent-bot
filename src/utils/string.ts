export function sanitize(input: string): string {
	return input.replace(/[^\w]/g, "");
}

export function extractId(input: string): string | null {
	const match = input.match(/\d{17,20}/);
	return match ? match[0] : null;
}

export function formatDate(date: Date): string {
	const day = date.getDate().toString().padStart(2, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const year = date.getFullYear().toString().slice(-2);

	return `${day}/${month}/${year} ${formatTime(date)}`;
}

export function formatTime(date: Date): string {
	return date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});
}

