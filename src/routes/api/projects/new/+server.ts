import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import { parseProject } from '$lib/parse';
import { getFileFromBody } from '$lib/server/utils';

export const POST: RequestHandler = async ({request, url}) => {
  const body = await request.formData();
  const projectDataFile = getFileFromBody(body, 'project');
  if (!projectDataFile) {
    throw error(400, 'missing file');
  }
  const projectData = await projectDataFile.text();

  const md5extsToSha256Text = body.get('md5exts');
  if (typeof md5extsToSha256Text !== 'string') {
    throw error(400, 'missing md5ext -> sha256 map');
  }
  const parsedMd5exts = JSON.parse(md5extsToSha256Text);

  const parsedProject = parseProject(projectData);
  for (const md5ext of parsedProject.md5exts) {
    if (typeof parsedMd5exts[md5ext] !== 'string') {
      throw error(400, `missing md5ext: ${md5ext}`);
    }
  }

  const title = body.get('title');
  if (typeof title !== 'string') {
    throw error(400, 'invalid or missing title');
  }

  const incompleteProject = db.createIncompleteProject(
    Buffer.from(projectData),
    parsedProject,
    parsedMd5exts,
    title
  );
  return json(incompleteProject);
};
