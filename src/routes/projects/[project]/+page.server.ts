import type { PageServerLoad } from './$types';
import * as db from '$lib/server/db';

export const load: PageServerLoad = ({params, cookies}) => {
  const projectMetadata = db.getCompleteProjectMetadata(params.project);
  const md5extsToSha256 = db.getMd5extToSha256(params.project);

  let adminOwnershipToken = null;
  const secretAdminToken = cookies.get('adminToken');
  if (typeof secretAdminToken === 'string') {
    const isValidAdminToken = db.isValidAdminToken(secretAdminToken);
    if (isValidAdminToken) {
      adminOwnershipToken = db.getAdminOwnershipToken(params.project);
    }
  }

  db.markProjectAsVisited(params.project);

  return {
    metadata: projectMetadata,
    md5extsToSha256,
    adminOwnershipToken
  };
};
