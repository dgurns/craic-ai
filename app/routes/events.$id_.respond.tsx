import { json, redirect } from '@remix-run/cloudflare';
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
} from '@remix-run/react';
import { type Kysely } from 'kysely';
import { createDBClient } from '~/db.server';
import { getSession } from '~/sessions';
import { type DB } from '~/types/db';
import { type LoaderArgs, type ActionArgs } from '~/types/remix';

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

type FinalizeEventArgs = {
	db: Kysely<DB>;
	openAIAPIKey: string;
	event: {
		id: number;
		organizerEmail: string | null;
		name: string;
		proposedDate: string;
	};
	invitees: Array<{
		email: string | null;
		availabilityResponse: string | null;
	}>;
};

type OpenAIAPIResponse = {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
};

async function finalizeEvent({
	db,
	openAIAPIKey,
	event,
	invitees,
}: FinalizeEventArgs) {
	try {
		await db
			.updateTable('events')
			.set({ state: 'finalizingDate' })
			.where('id', '=', event.id)
			.execute();
		const systemMessage = `You are a casual, friendly assistant helping plan an event.`;
		const userMessage = `
			I'm trying to organize ${event.name} for ${event.proposedDate}. 
			Here are people's availabilities:
			${invitees.map((i) => `${i.email}: ${i.availabilityResponse}\n`)}
			Pick a date and time that works for me and as many other people as possible. 
			If no one specified a date, pick one.
			Compose a quick email body of a few sentences at most which I will send to everyone. 
			Sign it from ${event.organizerEmail}. Make sure to insert real dates and 
			times when applicable, in the format "March 12 at 3:30pm". If you need a
			reference point, today is ${new Date().toDateString()}.
		`;
		// call OpenAI API to finalize the date
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${openAIAPIKey}`,
			},
			body: JSON.stringify({
				model: 'gpt-3.5-turbo',
				messages: [
					{
						role: 'system',
						content: systemMessage,
					},
					{
						role: 'user',
						content: userMessage,
					},
				],
			}),
		});
		const resJSON = await res.json<OpenAIAPIResponse>();
		if (!Array.isArray(resJSON.choices) || resJSON.choices.length < 1) {
			throw new Error();
		}
		const finalizedEmailText = resJSON.choices[0].message.content;
		// update the event record
		await db
			.updateTable('events')
			.set({ finalized_email_text: finalizedEmailText, state: 'finalized' })
			.where('id', '=', event.id)
			.execute();
		// TODO: send emails to attendees
		console.log('Event finalized');
	} catch (e) {
		console.log('Error finalizing event', e);
	}
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
			.executeTakeFirstOrThrow();
		// update the invitee record
		const formData = await request.formData();
		const response = String(formData.get('response') ?? '');
		await db
			.updateTable('invitees')
			.set({ availability_response: response })
			.where('id', '=', invitee.id)
			.execute();
		// if all invitees have responded, finalize the event asynchronously
		const invitees = await db
			.selectFrom('invitees as i')
			.leftJoin('users as u', 'i.user_id', 'u.id')
			.where('event_id', '=', eventID)
			.select(['i.availability_response', 'u.email'])
			.execute();
		const allResponded = invitees.every(
			(i) => i.availability_response !== null
		);
		if (allResponded) {
			const event = await db
				.selectFrom('events as e')
				.leftJoin('users as u', 'e.organizer_id', 'u.id')
				.select(['e.id', 'e.name', 'u.email', 'e.proposed_date', 'e.state'])
				.where('e.id', '=', eventID)
				.executeTakeFirstOrThrow();
			if (event.state !== 'finalized') {
				finalizeEvent({
					db,
					openAIAPIKey: context.OPENAI_API_KEY,
					event: {
						id: event.id,
						organizerEmail: event.email,
						name: event.name,
						proposedDate: event.proposed_date,
					},
					invitees: invitees.map((i) => ({
						email: i.email,
						availabilityResponse: i.availability_response,
					})),
				});
			}
		}
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
