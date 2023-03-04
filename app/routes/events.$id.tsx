import { json, redirect } from '@remix-run/cloudflare';
import { Link, useLoaderData } from '@remix-run/react';
import { useMemo } from 'react';
import { createDBClient } from '~/db.server';
import { getSession } from '~/sessions';
import { type LoaderArgs } from '~/types/remix';

export async function loader({ request, params, context }: LoaderArgs) {
	const session = await getSession(request.headers.get('Cookie'));
	const userID = session.get('userID');
	if (!userID) {
		return redirect('/login');
	}
	const eventID = Number(params.id);
	const db = createDBClient(context.DB);
	const event = await db
		.selectFrom('events as e')
		.leftJoin('users as u', 'e.organizer_id', 'u.id')
		.select([
			'e.name',
			'e.proposed_date',
			'e.state',
			'e.organizer_id',
			'u.email',
		])
		.where('e.id', '=', eventID)
		.executeTakeFirst();
	const invitees = await db
		.selectFrom('invitees')
		.innerJoin('users', 'invitees.user_id', 'users.id')
		.selectAll()
		.where('event_id', '=', eventID)
		.execute();
	if (
		event?.organizer_id !== userID &&
		!invitees.some((i) => i.user_id === userID)
	) {
		return json({
			error: 'You are not authorized to view this event',
			event: null,
			invitees: null,
		});
	}
	return json({ event, invitees, error: null });
}

export default function EventsByID() {
	const { event, invitees, error } = useLoaderData<typeof loader>();

	const step2Status = useMemo(() => {
		if (invitees?.every((i) => i.availability_response)) {
			return 'DONE';
		}
		return 'IN PROGRESS';
	}, [invitees]);

	const step3Status = useMemo(() => {
		switch (event?.state) {
			case 'finalizingDate':
				return 'IN PROGRESS';
			case 'sendingFinalizedDate':
			case 'finalized':
				return 'DONE';
			default:
				return 'NOT YET';
		}
	}, [event]);

	const step4Status = useMemo(() => {
		switch (event?.state) {
			case 'sendingFinalizedDate':
				return 'IN PROGRESS';
			case 'finalized':
				return 'DONE';
			default:
				return 'NOT YET';
		}
	}, [event]);

	if (error) {
		return <div className="text-red-500">{error}</div>;
	}

	if (!event || !invitees) {
		return <div className="text-red-500">Event not found</div>;
	}

	return (
		<div className="flex flex-col">
			<Link to="/events">All Events</Link>
			<h1>Event Name: {event.name}</h1>
			<h2>
				Organizer: {event.email}
				<br />
				Proposed Date: {event.proposed_date}
			</h2>
			<ul>
				<li>Step 1: Event name and rough date range - DONE</li>
				<li>
					Step 2: Email invitees about preferred dates - {step2Status}
					<ul className="pl-4">
						{invitees.map((invitee) => (
							<li key={invitee.id}>
								{invitee.email}
								{' - '}
								{invitee.availability_response
									? `Response: "${invitee.availability_response}"`
									: 'No response yet'}
							</li>
						))}
					</ul>
				</li>
				<li>
					Step 3: Finalize date and time that most people can do - {step3Status}
				</li>
				<li>Step 4: Email calendar invites - {step4Status}</li>
			</ul>
		</div>
	);
}
