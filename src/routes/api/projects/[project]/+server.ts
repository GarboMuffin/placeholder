import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import {validateOwnershipToken} from '$lib/server/utils';

export const GET: RequestHandler = async ({params}) => {
  return new Response(db.getProjectData(params.project));
};

export const DELETE: RequestHandler = async ({request, params}) => {
  const body = await request.formData();
  validateOwnershipToken(body.get('ownershipToken'), params.project);
  db.deleteProject(params.project);
  return json({});
};

export const POST: RequestHandler = async ({request, params}) => {
  const body = await request.formData();
  validateOwnershipToken(body.get('ownershipToken'), params.project);

  const title = body.get('title');
  if (typeof title === 'string') {
    db.setProjectTitle(params.project, title);
  }

  const description = body.get('description');
  if (typeof description === 'string') {
    db.setProjectDescription(params.project, description);
  }

  return json({});
};
