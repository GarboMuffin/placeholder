import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import * as db from '$lib/server/db';

export const load: PageServerLoad = ({params}) => {
  const projectMetadata = db.getProjectMetadata(params.project);
  const md5extsToSha256 = db.getMd5extToSha256(params.project);
  return {
    metadata: projectMetadata,
    md5extsToSha256
  };
};
