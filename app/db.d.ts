import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export interface Events {
  id: Generated<number>;
  organizer_id: number;
  name: string;
  proposed_date: string;
  finalized_date: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Invitees {
  id: Generated<number>;
  event_id: number;
  user_id: number;
  invite_sent: Generated<number>;
  response: string | null;
  finalized_date_sent: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Users {
  id: Generated<number>;
  email: string;
  hashed_password: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface DB {
  events: Events;
  invitees: Invitees;
  users: Users;
}
