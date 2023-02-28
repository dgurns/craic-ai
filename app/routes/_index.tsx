import { type LoaderFunction, redirect } from '@remix-run/cloudflare';
import { createDBClient } from '~/db.server';

export const loader: LoaderFunction = async () => {
	return redirect('/events/create');
	// if logged in, redirect to /events
};
