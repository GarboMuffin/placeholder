import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import { getFileFromBody, validateOwnership } from '$lib/server/utils';

export const POST: RequestHandler = async ({request, url, params}) => {
  const body = await request.formData();

  validateOwnership(params.project, body.get('ownershipToken'));

  const assetFile = getFileFromBody(body, 'asset');
  if (!assetFile) {
    throw error(400, 'asset is not a file');
  }

  const assetData = Buffer.from(await assetFile.arrayBuffer());
  db.finishIncompleteAsset(params.project, params.md5ext, assetData);

  return json({});
};
