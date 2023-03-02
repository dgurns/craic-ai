import { Form, useActionData, useNavigation } from '@remix-run/react';
import { json, redirect } from '@remix-run/cloudflare';
import { type ActionArgs, type LoaderArgs } from '~/types/remix';
import { createDBClient } from '~/db.server';
import { isValidEmail, isValidPassword } from '~/utils/forms';
import { getSession } from '~/sessions';

export async function loader({ request }: LoaderArgs) {
	const session = await getSession(request.headers.get('Cookie'));
	if (!session.get('userID')) {
		return redirect('/login');
	}
}

type ActionData = {
	error?: string;
};

export async function action({ context, request }: ActionArgs) {
	const session = await getSession(request.headers.get('Cookie'));
	const userID = session.get('userID');
	if (!userID) {
		return redirect('/login');
	}
	const formData = await request.formData();
	const eventName = String(formData.get('eventName') ?? '');
	if (!eventName) {
		return json<ActionData>(
			{ error: 'You must provide an event name' },
			{ status: 400 }
		);
	}
	const roughDate = String(formData.get('roughDate') ?? '');
	if (!roughDate) {
		return json<ActionData>(
			{ error: 'You must provide a rough date' },
			{ status: 400 }
		);
	}
	const invitees = String(formData.get('invitees') ?? '');
	const inviteeEmails = invitees.split(',').map((email) => email.trim());
	if (!invitees || inviteeEmails.length === 0) {
		return json<ActionData>(
			{ error: 'You must invite at least one email address' },
			{ status: 400 }
		);
	}
	const email = String(formData.get('email') ?? '');
	if (!isValidEmail(email)) {
		return json<ActionData>(
			{ error: 'Your email address is invalid' },
			{ status: 400 }
		);
	}
	const password = String(formData.get('password') ?? '');
	if (!isValidPassword(password)) {
		return json<ActionData>(
			{ error: 'Password must be at least 8 characters' },
			{ status: 400 }
		);
	}
	try {
		const db = createDBClient(context.DB);
		// get organizer user
		const organizer = await db
			.selectFrom('users')
			.selectAll()
			.where('id', '=', userID)
			.executeTakeFirstOrThrow();
		// create event
		const event = await db
			.insertInto('events')
			.values({
				organizer_id: organizer.id,
				name: eventName,
				proposed_date: roughDate,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		// add the Emails. If any fail, continue to the next one.
		for (const email of invitees) {
			// create user and invitee record
			try {
				if (!isValidEmail(email)) {
					throw new Error('Invalid email; skipping');
				}
				const inviteeUser = await db
					.insertInto('users')
					.values({
						email,
					})
					.returning('id')
					.executeTakeFirstOrThrow();
				await db
					.insertInto('invitees')
					.values({
						event_id: event.id,
						user_id: inviteeUser.id,
					})
					.executeTakeFirstOrThrow();
			} catch {
				//
			}
		}
		return redirect(`/events/${event.id}`);
	} catch (e) {
		console.log(e);
		return json<ActionData>({ error: 'Error creating event' }, { status: 500 });
	}
}

export default function EventsCreate() {
	const { state } = useNavigation();
	const data = useActionData<ActionData>();

	return (
		<div>
			<h1>Craic AI</h1>
			<p>Planning something with friends? Let AI handle the coordination.</p>
			<h2>How does it work?</h2>
			<ul>
				<li>
					We'll email the invitees and find a date that most people can do
				</li>
				<li>
					Then we'll finalize the details and send everyone calendar invites
				</li>
			</ul>

			<Form
				method="post"
				action="/"
				className="flex flex-col space-y-6 items-start"
			>
				<div className="flex flex-col space-y-2 w-full max-w-lg">
					<label htmlFor="eventName">What are you planning?</label>
					<input
						type="text"
						id="eventName"
						name="eventName"
						required
						placeholder="Drinks, a walk, weekend in Portugal..."
					/>
				</div>

				<div className="flex flex-col space-y-2 w-full max-w-lg">
					<label htmlFor="roughDate">Roughly when?</label>
					<input
						type="text"
						id="roughDate"
						name="roughDate"
						required
						placeholder="Thurs or Fri, an evening next week at 8pm, a weekend in April..."
					/>
				</div>

				<div className="flex flex-col space-y-2 w-full max-w-lg">
					<label htmlFor="invitees">Who do you want to invite?</label>
					<textarea
						id="invitees"
						name="invitees"
						required
						placeholder="john@gmail.com, sandy@aol.com..."
					/>
				</div>

				{state === 'idle' ? (
					<button type="submit">Plan it!</button>
				) : (
					<p>Creating...</p>
				)}

				{data?.error && <p className="text-red-500">{data.error}</p>}
			</Form>
		</div>
	);
}
