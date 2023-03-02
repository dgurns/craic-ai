import { Form, useActionData, useNavigation } from '@remix-run/react';
import { json, redirect } from '@remix-run/cloudflare';
import { useState } from 'react';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { type ActionArgs } from '~/types/remix';
import { createDBClient } from '~/db.server';
import { isValidEmail } from '~/utils';

type ActionData = {
	error?: string;
};

export async function action({ context, request }: ActionArgs) {
	const formData = Object.fromEntries(await request.formData());
	const formSchema = z.object({
		eventName: z.string(),
		roughDate: z.string(),
		invitees: z.string(),
		email: z.string().regex(/.+@.+\..+/),
		password: z.string().min(8),
	});
	const parsed = formSchema.safeParse(formData);
	if (!parsed.success) {
		const error = parsed.error.issues.map((i) => i.message).join(', ');
		return json<ActionData>({ error }, { status: 400 });
	}
	const invitees = parsed.data.invitees.split(',').map((email) => email.trim());
	if (invitees.length === 0) {
		return json<ActionData>(
			{ error: 'You must invite at least one person' },
			{ status: 400 }
		);
	}
	const db = createDBClient(context.DB);
	// create user for organizer
	let organizerId: number | undefined;
	try {
		const organizer = await db
			.insertInto('users')
			.values({
				email: parsed.data.email,
				hashed_password: bcrypt.hashSync(parsed.data.password),
			})
			.executeTakeFirstOrThrow();
		if (organizer) {
			organizerId = Number(organizer.insertId);
		}
	} catch {
		//
	}
	if (!organizerId) {
		return json<ActionData>(
			{
				error:
					'Unable to create user; do you already have an account for this email? If so, please login.',
			},
			{ status: 500 }
		);
	}
	// create event
	const event = await db
		.insertInto('events')
		.values({
			organizer_id: organizerId,
			name: parsed.data.eventName,
			proposed_date: parsed.data.roughDate,
		})
		.returning('id')
		.executeTakeFirst();
	if (!event?.id) {
		return json<ActionData>(
			{ error: 'Unable to create event' },
			{ status: 500 }
		);
	}
	// add the invitees. If any fail, continue to the next one.
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
				.executeTakeFirst();
			if (!inviteeUser?.id) {
				throw new Error('Unable to create user for invitee');
			}
			await db
				.insertInto('invitees')
				.values({
					event_id: event.id,
					user_id: inviteeUser.id,
				})
				.execute();
		} catch {
			//
		}
	}
	return redirect(`/events/${event.id}`);
}

export default function EventsCreate() {
	const { state } = useNavigation();
	const data = useActionData<ActionData>();

	const [showPasswordField, setShowPasswordField] = useState(false);

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
				action="/events/create"
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

				<div className="flex flex-col space-y-2 w-full max-w-lg">
					<label htmlFor="email">Your email</label>
					<input
						type="text"
						id="email"
						name="email"
						required
						placeholder="you@you.com"
						onChange={() => setShowPasswordField(true)}
					/>
				</div>

				{showPasswordField && (
					<div className="flex flex-col space-y-2 w-full max-w-lg">
						<label htmlFor="password">
							Choose a password (at least 8 characters)
						</label>
						<input type="password" id="password" name="password" required />
					</div>
				)}

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
