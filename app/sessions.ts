import { createCookieSessionStorage } from '@remix-run/cloudflare';

const { getSession, commitSession, destroySession } =
	createCookieSessionStorage({
		cookie: {
			name: '__session',
			httpOnly: true,
			path: '/',
			sameSite: 'lax',
			secrets: ['super-sekrit'],
			secure: true,
		},
	});

export { getSession, commitSession, destroySession };
