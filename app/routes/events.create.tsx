import { Form } from '@remix-run/react';

export default function EventsCreate() {
	return (
		<div>
			<h1>Craic AI</h1>
			<p>
				Planning something with friends? Let AI handle the coordination. Sit
				back and get a confirmed date/time with calendar invites.
			</p>

			<Form className="flex flex-col space-y-6 items-start">
				<div className="flex flex-col space-y-2 w-full max-w-lg">
					<label htmlFor="event-name">What are you planning?</label>
					<input
						type="text"
						id="event-name"
						placeholder="Drinks, a walk, weekend in Portugal..."
					/>
				</div>

				<div className="flex flex-col space-y-2 w-full max-w-lg">
					<label htmlFor="rough-date">Roughly when?</label>
					<input
						type="text"
						id="rough-date"
						placeholder="Thurs or Fri, an evening next week at 8pm, a weekend in April..."
					/>
				</div>

				<div className="flex flex-col space-y-2 w-full max-w-lg">
					<label htmlFor="invitees">Who do you want to invite?</label>
					<textarea
						id="invitees"
						placeholder="john@gmail.com, sandy@aol.com..."
					/>
				</div>

				<div className="flex flex-col space-y-2 w-full max-w-lg">
					<label htmlFor="your-email">Your email</label>
					<input type="text" id="your-email" placeholder="you@you.com" />
				</div>

				<button type="submit">Plan it!</button>

				<h2>How does it work?</h2>
				<ul>
					<li>
						We'll email the invitees to find a date that most people can do
					</li>
					<li>
						Then we'll finalize the details and send everyone calendar invites
					</li>
				</ul>
			</Form>
		</div>
	);
}
