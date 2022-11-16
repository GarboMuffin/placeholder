import {error} from '@sveltejs/kit';
import * as db from './db';

export const validateOwnershipToken = (givenToken: unknown, projectId: string) => {
  if (typeof givenToken !== 'string') {
    throw error(400, 'ownership token missing or invalid type');
  }

  const actualToken = db.getOwnershipToken(projectId);
  // TODO: do we have to make this constant time?
  if (givenToken !== actualToken) {
    throw error(401, 'invalid ownership token');
  }
};

export const getFileFromBody = (formData: FormData, filename: string): File | null => {
  const file = formData.get(filename) as File;
  if (!file.arrayBuffer) {
    return null;
  }
  return file;
};
