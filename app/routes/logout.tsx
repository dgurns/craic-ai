import { redirect } from '@remix-run/cloudflare';
import { destroySession, getSession } from '~/sessions';
import { type LoaderArgs } from '~/types/remix';

export async function loader({ request }: LoaderArgs) {
	const session = await getSession(request.headers.get('Cookie'));
	return redirect('/login', {
		headers: {
			'Set-Cookie': await destroySession(session),
		},
	});
}
