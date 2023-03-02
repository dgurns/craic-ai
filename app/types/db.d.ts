import type { Generated } from 'kysely';

// Keeping track of this manually for now to ensure that the types are accurate

export interface Events {
	id: Generated<number>;
	organizer_id: number;
	name: string;
	proposed_date: string;
	finalized_date: string | null;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface Invitees {
	id: Generated<number>;
	event_id: number;
	user_id: number;
	invite_sent: Generated<boolean>;
	response: string | null;
	finalized_date_sent: Generated<boolean>;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface Users {
	id: Generated<number>;
	email: string;
	hashed_password: string | null;
	created_at: Generated<string>;
	updated_at: Generated<string>;
}

export interface DB {
	events: Events;
	invitees: Invitees;
	users: Users;
}
