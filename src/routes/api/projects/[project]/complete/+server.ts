import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import { validateOwnershipToken } from '$lib/server/utils';

export const POST: RequestHandler = async ({request, url, params}) => {
  const body = await request.json();
  validateOwnershipToken(body.ownershipToken, params.project);
  db.completeNewProject(params.project);
  return json({});
};
