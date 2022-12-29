import type { RequestHandler } from "./$types";
import * as db from '$lib/server/db';
import { error } from "@sveltejs/kit";
import { MAX_REPORT_BODY_LENGTH } from "$lib/config/limits";

export const POST: RequestHandler = async ({request}) => {
  const body = await request.formData();

  const projectId = body.get('projectId');
  if (typeof projectId !== 'string') {
    throw error(400, 'invalid project ID');
  }

  const reportBody = body.get('body');
  if (typeof reportBody !== 'string') {
    throw error(400, 'invalid report body');
  }
  if (reportBody.length > MAX_REPORT_BODY_LENGTH) {
    throw error(400, 'report body too long');
  }

  db.createReport(projectId, reportBody);

  // No reason to respond with anything such as the report's ID.
  return new Response('ok');
};
