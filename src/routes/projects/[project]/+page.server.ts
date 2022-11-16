import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import * as db from '$lib/server/db';

export const load: PageServerLoad = ({params}) => {
  const projectMetadata = db.getProjectMetadata(params.project);
  return projectMetadata;
};
