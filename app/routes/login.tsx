import { Form, useActionData } from '@remix-run/react';
import { json, redirect } from '@remix-run/cloudflare';
import bcrypt from 'bcryptjs';
import { type LoaderArgs, type ActionArgs } from '~/types/remix';
import { createDBClient } from '~/db.server';
import { getSession, commitSession } from '~/sessions';

export async function loader({ request }: LoaderArgs) {
	const session = await getSession(request.headers.get('Cookie'));
	if (session.get('userID')) {
		return redirect('/events');
	}
	return json({});
}

type ActionData = {
	error?: string;
};

export async function action({ request, context }: ActionArgs) {
	const session = await getSession(request.headers.get('Cookie'));
	const formData = await request.formData();
	const email = String(formData.get('email') ?? '');
	const password = String(formData.get('password') ?? '');
	if (!email || !password) {
		return json<ActionData>(
			{ error: 'You must provide an email and password' },
			{ status: 400 }
		);
	}
	try {
		const db = createDBClient(context.DB);
		const user = await db
			.selectFrom('users')
			.selectAll()
			.where('email', '=', email)
			.executeTakeFirst();
		if (!user) {
			return json<ActionData>(
				{ error: 'Could not find user with that email' },
				{ status: 400 }
			);
		}
		if (!user.hashed_password) {
			return json<ActionData>(
				{ error: 'User does not have a password' },
				{ status: 400 }
			);
		}
		if (!bcrypt.compareSync(password, user.hashed_password)) {
			return json<ActionData>({ error: 'Incorrect password' }, { status: 400 });
		}
		session.set('userID', user.id);
		return redirect('/events', {
			headers: {
				'Set-Cookie': await commitSession(session),
			},
		});
	} catch (error) {
		return json<ActionData>({ error: 'Error logging in' }, { status: 500 });
	}
}

export default function Login() {
	const data = useActionData<ActionData>();

	return (
		<div className="flex flex-col space-y-4">
			<h1>Log in</h1>
			{/* add a form with email and password fields and a submit button */}
			<Form method="post" className="flex flex-col items-start space-y-2">
				<div className="flex flex-col space-y-1">
					<label htmlFor="email">Email</label>
					<input type="text" id="email" name="email" required />
				</div>
				<div className="flex flex-col space-y-1">
					<label htmlFor="password">Password</label>
					<input type="password" id="password" name="password" required />
				</div>
				<button type="submit">Log in</button>

				{data?.error && <p className="text-red-500">{data.error}</p>}
			</Form>
		</div>
	);
}
