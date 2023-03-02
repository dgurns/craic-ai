import { json, redirect } from '@remix-run/cloudflare';
import { Link, useLoaderData } from '@remix-run/react';
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
	const events = await db
		.selectFrom('events')
		.selectAll()
		.where('organizer_id', '=', userID)
		.orderBy('created_at', 'asc')
		.execute();
	return json({ events });
}

export default function Events() {
	const { events } = useLoaderData<typeof loader>();

	return (
		<div className="flex flex-col space-y-4">
			<h1>Events</h1>

			<Link to="/events/create">Create Event</Link>

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
