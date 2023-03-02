import { json, redirect } from '@remix-run/cloudflare';
import { Link, useLoaderData, useLocation } from '@remix-run/react';
import { createDBClient } from '~/db.server';
import { getSession } from '~/sessions';
import { type LoaderArgs } from '~/types/remix';

export async function loader({ request, context }: LoaderArgs) {
	const session = await getSession(request.headers.get('Cookie'));
	const userID = session.get('userID');
	if (!userID) {
		return redirect('/login');
	}
	const db = createDBClient(context.DB);
	const createdEvents = await db
		.selectFrom('events')
		.selectAll()
		.where('organizer_id', '=', userID)
		.orderBy('created_at', 'desc')
		.execute();
	// select events where i am an invitee
	const invitedEvents = await db
		.selectFrom('events')
		.selectAll()
		.where('id', 'in', (db) =>
			db.selectFrom('invitees').select('event_id').where('user_id', '=', userID)
		)
		.orderBy('events.created_at', 'desc')
		.execute();
	return json({ createdEvents, invitedEvents });
}

export default function Events() {
	const { createdEvents, invitedEvents } = useLoaderData<typeof loader>();

	const { search } = useLocation();
	const params = new URLSearchParams(search);
	const tab = params.get('tab') || 'created';

	const events = tab === 'created' ? createdEvents : invitedEvents;

	return (
		<div className="flex flex-col items-start space-y-4">
			<h1>Events</h1>

			<Link to="/events/create">Create Event</Link>

			<div className="flex space-x-4 rounded border border-gray-300 p-2">
				<Link
					to="/events"
					className={`${tab === 'created' ? 'text-blue-500' : 'text-gray-400'}`}
				>
					My Events
				</Link>
				<Link
					to="/events?tab=invited"
					className={`${tab === 'invited' ? 'text-blue-500' : 'text-gray-400'}`}
				>
					Events I'm Invited To
				</Link>
			</div>

			<ul className="space-y-4">
				{events.map((event) => (
					<li key={event.id}>
						<a href={`/events/${event.id}`}>{event.name}</a>
						<p>{event.proposed_date}</p>
					</li>
				))}
			</ul>
		</div>
	);
}
