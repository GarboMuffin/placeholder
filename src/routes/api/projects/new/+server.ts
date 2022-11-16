import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import { parseProject } from '$lib/parse';

export const POST: RequestHandler = async ({request, url}) => {
  const body = await request.formData();
  const projectData = await body.get('project').text();
  const parsedProject = parseProject(projectData);
  const incompleteProject = db.createIncompleteProject(Buffer.from(projectData), parsedProject);
  return json(incompleteProject);
};
