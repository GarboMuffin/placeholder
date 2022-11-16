import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import nodeCrypto from 'node:crypto';
import { getFileFromBody, validateOwnershipToken } from '$lib/server/utils';

export const POST: RequestHandler = async ({request, url, params}) => {
  const body = await request.formData();

  validateOwnershipToken(body.get('ownershipToken'), params.project);

  const assetFile = getFileFromBody(body, 'asset');
  if (!assetFile) {
    throw error(400, 'asset is not a file');
  }

  const assetData = new Uint8Array(await assetFile.arrayBuffer());
  const actualMd5sum = nodeCrypto
    .createHash('md5')
    .update(assetData)
    .digest('hex');
  const expectedMd5sum = params.asset.split('.')[0];
  if (actualMd5sum !== expectedMd5sum) {
    throw error(400, `expected md5 ${expectedMd5sum} but got ${actualMd5sum}`);
  }

  db.completeAsset(params.project, params.asset, assetData);

  return json({});
};
