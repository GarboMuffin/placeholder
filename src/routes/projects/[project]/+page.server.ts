import type { PageServerLoad } from './$types';
import * as db from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = ({params}) => {
  let projectMetadata;
  try {
    projectMetadata = db.getProjectMetadata(params.project);
  } catch (e) {
    throw error(404, 'Project does not exist');
  }

  const md5extsToSha256 = db.getMd5extToSha256(params.project);
  return {
    metadata: projectMetadata,
    md5extsToSha256
  };
};
