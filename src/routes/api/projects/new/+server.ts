import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import { parseProject } from '$lib/parse';
import { getFileFromBody } from '$lib/server/utils';
import type { AssetInformation } from '$lib/server/db';
import { isNaughty } from '$lib/naughty';

const isSHA256 = (str: unknown) => typeof str === 'string' && /^[a-f0-9]{64}$/.test(str);

const isMd5ext = (str: unknown) => typeof str === 'string' && /^[a-f0-9]{32}\.[a-z0-9]{3}$/.test(str);

const isObject = (object: unknown): object is object => (
  !!object &&
  !Array.isArray(object) &&
  typeof object === 'object'
);

const isAssetInformation = (object: unknown): object is AssetInformation => {
  if (!isObject(object)) {
    return false;
  }
  for (const key of Object.keys(object)) {
    if (!isMd5ext(key)) {
      return false;
    }
    const asset = (object as any)[key] as unknown;
    if (!isObject(asset)) {
      return false;
    }
    const {sha256, size} = asset as any;
    if (!isSHA256(sha256) || typeof size !== 'number') {
      return false;
    }
  }
  return true;
};

export const POST: RequestHandler = async ({request, url}) => {
  const body = await request.formData();
  const projectDataFile = getFileFromBody(body, 'project');
  if (!projectDataFile) {
    throw error(400, 'missing file');
  }
  const projectData = await projectDataFile.text();

  const assetInformation = body.get('assetInformation');
  if (typeof assetInformation !== 'string') {
    throw error(400, 'missing asset information');
  }
  const parsedAssetInformation = JSON.parse(assetInformation) as unknown;
  if (!isAssetInformation(parsedAssetInformation)) {
    throw error(400, 'invalid asset information');
  }

  const parsedProject = parseProject(projectData);

  let title = body.get('title');
  if (typeof title !== 'string') {
    throw error(400, 'invalid or missing title');
  }
  if (isNaughty(title)) {
    title = 'Project';
  }

  const incompleteProject = db.createIncompleteProject(
    Buffer.from(projectData),
    parsedProject,
    parsedAssetInformation,
    title
  );
  return json(incompleteProject);
};
