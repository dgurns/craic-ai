import { useParams } from '@remix-run/react';

export default function EventsByID() {
	const params = useParams();

	return (
		<div className="flex flex-col">
			<h1>Event ID X</h1>
			<ul>
				<li>Step 1 (Done): Event name and rough date range confirmed</li>
				<li>Step 2 (): Email invitees about preferred dates</li>
				<li>Step 3: Finalize date and time that most people can do</li>
				<li>Step 4: Email calendar invites</li>
			</ul>
		</div>
	);
}
