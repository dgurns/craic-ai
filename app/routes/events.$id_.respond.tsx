import { json, redirect } from '@remix-run/cloudflare';
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
} from '@remix-run/react';
import { createDBClient } from '~/db.server';
import { getSession } from '~/sessions';
import { type LoaderArgs, type ActionArgs } from '~/types/remix';
import { initStateMachine } from '~/utils/state-machine';
import { interpret } from 'xstate';

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
		.select(['e.name', 'e.proposed_date', 'e.organizer_id', 'u.email'])
		.where('e.id', '=', eventID)
		.executeTakeFirst();
	const invitees = await db
		.selectFrom('invitees')
		.innerJoin('users', 'invitees.user_id', 'users.id')
		.selectAll()
		.where('event_id', '=', eventID)
		.execute();
	if (!invitees.some((i) => i.user_id === userID)) {
		return json({
			error: 'You are not an invitee for this event',
			event: null,
			invitees: null,
		});
	}
	return json({ event, invitees, error: null });
}

type ActionData = {
	error: string | null;
};

export async function action({ request, context, params }: ActionArgs) {
	const session = await getSession(request.headers.get('Cookie'));
	const userID = session.get('userID');
	if (!userID) {
		return redirect('/login');
	}
	const eventID = Number(params.id);
	const db = createDBClient(context.DB);
	try {
		const invitee = await db
			.selectFrom('invitees')
			.selectAll()
			.where('event_id', '=', eventID)
			.where('user_id', '=', userID)
			.executeTakeFirst();
		if (!invitee) {
			return json<ActionData>(
				{
					error: 'Could not find your invitee record for this event',
				},
				{ status: 403 }
			);
		}
		// update the invitee record
		const formData = await request.formData();
		const response = String(formData.get('response') ?? '');
		await db
			.updateTable('invitees')
			.set({ availability_response: response })
			.where('id', '=', invitee.id)
			.execute();
		// TODO: call a separate route action via fetch to tell it that a response
		// has been received? Then it can handle calling OpenAI API, sending
		// confirmation emails, etc.
		return redirect(`/events/${eventID}`);
	} catch (e) {
		console.log(e);
		return json<ActionData>(
			{ error: 'Error responding to event' },
			{ status: 500 }
		);
	}
}

export default function RespondToEvent() {
	const {
		event,
		invitees,
		error: loaderError,
	} = useLoaderData<typeof loader>();
	const actionData = useActionData<ActionData>();
	const navigation = useNavigation();

	if (loaderError || actionData?.error) {
		return (
			<div className="text-red-500">{loaderError || actionData?.error}</div>
		);
	}

	if (!event || !invitees) {
		return <div className="text-red-500">Event not found</div>;
	}

	return (
		<div className="flex flex-col space-y-4">
			<h1>What's your availability for {event.name}?</h1>
			<h2>
				Organizer: {event.email}
				<br />
				Proposed Date: {event.proposed_date}
			</h2>
			<Form method="post" className="flex flex-col items-start space-y-4">
				<textarea
					name="response"
					className="w-full max-w-md"
					placeholder="I'm free, I'm away, I could do these dates and times ..."
					required
				/>
				{navigation.state === 'idle' ? (
					<button type="submit">Respond</button>
				) : (
					<span>Responding...</span>
				)}
			</Form>
		</div>
	);
}
