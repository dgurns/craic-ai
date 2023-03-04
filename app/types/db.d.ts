import type { Generated } from 'kysely';

// Keeping track of this manually for now to ensure that the types are accurate

export interface Event {
	id: Generated<number>;
	organizer_id: number;
	state: Generated<
		| 'eventCreated'
		| 'checkingAvailability'
		| 'finalizingDate'
		| 'sendingFinalizedDate'
		| 'finalized'
	>;
	name: string;
	proposed_date: string;
	finalized_date: string | null;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface Invitee {
	id: Generated<number>;
	event_id: number;
	user_id: number;
	availability_sent: Generated<boolean>;
	availability_response: string | null;
	finalized_date_sent: Generated<boolean>;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface User {
	id: Generated<number>;
	email: string;
	hashed_password: string | null;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface DB {
	events: Event;
	invitees: Invitee;
	users: User;
}
