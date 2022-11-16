import {error, json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';
import { getFileFromBody, validateOwnershipToken } from '$lib/server/utils';
import nodeCrypto from 'node:crypto';

export const POST: RequestHandler = async ({request, url, params}) => {
  const body = await request.formData();

  validateOwnershipToken(body.get('ownershipToken'), params.project);

  const assetFile = getFileFromBody(body, 'asset');
  if (!assetFile) {
    throw error(400, 'asset is not a file');
  }

  const assetData = new Uint8Array(await assetFile.arrayBuffer());

  const actualMd5 = nodeCrypto
    .createHash('md5')
    .update(assetData)
    .digest('hex');
  const expectedMd5 = params.asset.split('.')[0];
  if (actualMd5 !== expectedMd5) {
    throw error(400, `expected md5 ${expectedMd5} but got ${actualMd5}`);
  }

  const actualSha256 = nodeCrypto
    .createHash('sha256')
    .update(assetData)
    .digest('hex');
  const expectedSha256 = db.getExpectedSha256(params.project, params.asset);
  if (actualSha256 !== expectedSha256) {
    throw error(400, `expected sha256 ${expectedSha256} but got ${actualSha256}`);
  }

  db.completeAsset(params.project, params.asset, assetData);

  return json({});
};
