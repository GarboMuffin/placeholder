import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import { validateOwnership } from '$lib/server/utils';

export const POST: RequestHandler = async ({request, params}) => {
  const body = await request.json();
  validateOwnership(params.project, body.ownershipToken);
  db.finishIncompleteProject(params.project);
  return json({});
};
