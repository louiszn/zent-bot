export function sanitize(input) {
    return input.replace(/[^\w]/g, "");
}
export function extractId(input) {
    const match = input.match(/\d{17,20}/);
    return match ? match[0] : null;
}
