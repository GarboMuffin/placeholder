import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';

export const GET: RequestHandler = async ({params}) => {
  // TODO: prevent hotlinking
  const data = db.getAssetData(params.sha256);
  return new Response(data, {
    headers: {
      'Cache-Control': 'public, max-age=31557600, immutable',
      'Content-Type': 'application/octet-stream',
      'Content-Security-Policy': 'default-src \'none\''
    }
  });
};
