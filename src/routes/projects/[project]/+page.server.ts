import type { PageServerLoad } from './$types';
import * as db from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = ({params}) => {
  const projectMetadata = db.getCompleteProjectMetadata(params.project);
  const md5extsToSha256 = db.getMd5extToSha256(params.project);
  return {
    metadata: projectMetadata,
    md5extsToSha256
  };
};
