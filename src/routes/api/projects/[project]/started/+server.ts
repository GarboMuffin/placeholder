import type { RequestHandler } from "./$types";
import * as db from '$lib/server/db';

export const PUT: RequestHandler = async ({request, params}) => {
  db.markProjectAsStarted(params.project);
  return new Response('ok');
};
