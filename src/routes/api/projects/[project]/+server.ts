import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import {validateOwnership} from '$lib/server/utils';
import { isNaughty } from '$lib/naughty';

export const GET: RequestHandler = async ({params}) => {
  return new Response(db.getProjectData(params.project));
};

export const DELETE: RequestHandler = async ({request, params}) => {
  const body = await request.formData();
  validateOwnership(params.project, body.get('ownershipToken'));
  db.deleteProject(params.project);
  return json({});
};

export const POST: RequestHandler = async ({request, params}) => {
  const body = await request.formData();
  validateOwnership(params.project, body.get('ownershipToken'));

  const title = body.get('title');
  if (typeof title === 'string') {
    if (isNaughty(title)) {
      throw error(400, 'title is naughty');
    }
    db.setProjectTitle(params.project, title);
  }

  const description = body.get('description');
  if (typeof description === 'string') {
    if (isNaughty(description)) {
      throw error(400, 'description is naughty');
    }
    db.setProjectDescription(params.project, description);
  }

  return json({});
};
