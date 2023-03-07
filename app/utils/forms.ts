export function isValidEmail(email?: string): boolean {
	if (!email || !email.includes('@') || !email.includes('.')) {
		return false;
	}
	return true;
}

export function isValidPassword(password?: string): boolean {
	if (!password || password.length < 8) {
		return false;
	}
	return true;
}

export function extractEmails(rawText: string): string[] {
	const emails = rawText.match(/[\w.]+@[\w.]+/g);
	return emails || [];
}
