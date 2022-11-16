import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import {validateOwnershipToken} from '$lib/server/utils';

export const GET: RequestHandler = async ({params}) => {
  return new Response(db.getProjectData(params.project));
};

export const DELETE: RequestHandler = async ({request, params}) => {
  const body = await request.json();
  validateOwnershipToken(body.ownershipToken, params.project);
  db.deleteProject(params.project);
  return json({});
};
