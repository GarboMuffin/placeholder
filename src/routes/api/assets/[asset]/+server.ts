import type {RequestHandler} from './$types';
import * as db from '$lib/server/db';

export const GET: RequestHandler = async ({params}) => {
  const data = db.getAssetData(params.asset);
  return new Response(data);
};
