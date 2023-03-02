export function isValidEmail(email?: string): boolean {
	if (!email) {
		return false;
	}
	const re = /\S+@\S+\.\S+/;
	return re.test(email);
}

export function isValidPassword(password?: string): boolean {
	if (!password || password.length < 8) {
		return false;
	}
	return true;
}
