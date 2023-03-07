import {
	type LoaderArgs as RemixLoaderArgs,
	type ActionArgs as RemixActionArgs,
} from '@remix-run/cloudflare';

export type Context = {
	DB: D1Database;
	OPENAI_API_KEY: string;
};

export type LoaderArgs = RemixLoaderArgs & {
	context: Context;
};

export type ActionArgs = RemixActionArgs & {
	context: Context;
};
