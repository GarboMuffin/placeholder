import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import {validateOwnership} from '$lib/server/utils';
import { isNaughty } from '$lib/naughty';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '$lib/config/limits';

export const GET: RequestHandler = async ({params}) => {
  const data = db.getProjectData(params.project);
  db.markProjectAsLoaded(params.project);
  return new Response(data);
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
    if (title.length > MAX_TITLE_LENGTH) {
      throw error(400, 'title is too long');
    }
    db.setProjectTitle(params.project, title);
  }

  const description = body.get('description');
  if (typeof description === 'string') {
    if (isNaughty(description)) {
      throw error(400, 'description is naughty');
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw error(400, 'description is too long');
    }
    db.setProjectDescription(params.project, description);
  }

  return json({});
};
