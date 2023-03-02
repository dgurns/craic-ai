import { json, redirect } from '@remix-run/cloudflare';
import { Link, useLoaderData } from '@remix-run/react';
import { createDBClient } from '~/db.server';
import { getSession } from '~/sessions';
import { type LoaderArgs } from '~/types/remix';

export async function loader({ request, params, context }: LoaderArgs) {
	const session = await getSession(request.headers.get('Cookie'));
	if (!session.get('userID')) {
		return redirect('/login');
	}
	const db = createDBClient(context.DB);
	const event = await db
		.selectFrom('events')
		.selectAll()
		.where('id', '=', Number(params.id))
		.executeTakeFirst();
	const invitees = await db
		.selectFrom('invitees')
		.leftJoin('users', 'invitees.user_id', 'users.id')
		.selectAll()
		.where('event_id', '=', Number(params.id))
		.execute();
	return json({ event, invitees });
}

export default function EventsByID() {
	const { event, invitees } = useLoaderData<typeof loader>();

	if (!event || !invitees)
		return <div className="text-red-500">Event not found</div>;

	const allInviteesResponded =
		invitees.length > 0 && invitees.every((invitee) => invitee.response);
	const allInviteesSentConfirmation =
		invitees.length > 0 &&
		invitees.every((invitee) => invitee.finalized_date_sent);

	return (
		<div className="flex flex-col">
			<Link to="/events">All Events</Link>
			<h1>Event Name: {event.name}</h1>
			<h2>Proposed Date: {event.proposed_date}</h2>
			<ul>
				<li>Step 1: Event name and rough date range - CONFIRMED</li>
				<li>
					Step 2: Email invitees about preferred dates -{' '}
					{!allInviteesResponded ? 'IN PROGRESS' : 'CONFIRMED'}
					<ul className="pl-4">
						{invitees.map((invitee) => (
							<li key={invitee.id}>
								{invitee.email}
								{' - '}
								{invitee.response
									? `Response: "${invitee.response}"`
									: 'No response yet'}
							</li>
						))}
					</ul>
				</li>
				<li>
					Step 3: Finalize date and time that most people can do -{' '}
					{event.finalized_date ? 'CONFIRMED' : 'NOT YET'}
				</li>
				<li>
					Step 4: Email calendar invites -{' '}
					{!allInviteesSentConfirmation ? 'NOT YET' : 'CONFIRMED'}
				</li>
			</ul>
		</div>
	);
}
