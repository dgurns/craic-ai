CREATE TABLE users (
	id INTEGER PRIMARY KEY NOT NULL,
	email TEXT UNIQUE NOT NULL,
	hashed_password TEXT,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE events (
	id INTEGER PRIMARY KEY NOT NULL,
	organizer_id INTEGER NOT NULL,
	name TEXT NOT NULL,
	proposed_date TEXT NOT NULL,
	finalized_date TEXT,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (organizer_id) REFERENCES users(id)
);

CREATE TABLE invitees (
	id INTEGER PRIMARY KEY NOT NULL,
	event_id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	invite_sent BOOLEAN NOT NULL DEFAULT FALSE,
	response TEXT,
	finalized_date_sent BOOLEAN NOT NULL DEFAULT FALSE,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (event_id) REFERENCES events(id),
	FOREIGN KEY (user_id) REFERENCES users(id)
);
