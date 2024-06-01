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

  if (process.env.REPORT_WEBHOOK) {
    fetch(process.env.REPORT_WEBHOOK, {
      method: 'POST',
      body: JSON.stringify({
        content: '<@751651888205922348> Someone reported a project on placeholder <https://share.turbowarp.org/admin/reports>'
      }),
      headers: {
        'content-type': 'application/json'
      }
    }).then(r => {
      console.log('webhook status', r.status);
    });
  }

  // No reason to respond with anything such as the report's ID.
  return new Response('ok');
};
