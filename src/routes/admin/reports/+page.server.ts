import type { PageServerLoad } from './$types';
import * as db from '$lib/server/db';

export const load: PageServerLoad = () => {
  const reports = db.getAllReports();
  return {
    reports
  };
};
