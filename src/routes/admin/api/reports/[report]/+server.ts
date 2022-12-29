import type { RequestHandler } from "./$types";
import * as db from '$lib/server/db';
import { validateAdminPermissions } from "$lib/server/utils";
import { error } from "@sveltejs/kit";

export const DELETE: RequestHandler = ({cookies, params}) => {
  const adminToken = cookies.get('adminToken');
  validateAdminPermissions(adminToken);

  const reportId = +params.report;
  if (isNaN(reportId)) {
    throw error(400, 'invalid report ID');
  }

  db.deleteReport(reportId);

  return new Response('OK');
};
