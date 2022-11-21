import sqlite from 'better-sqlite3';
import type {ParsedProject} from '$lib/parse';

const db = new sqlite('unshared.db');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY NOT NULL,
  complete INT NOT NULL,
  data BLOB NOT NULL,
  expires INTEGER NOT NULL,
  ownership_token TEXT NOT NULL,
  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS assets (
  asset_sha256 TEXT PRIMARY KEY NOT NULL,
  data BLOB NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS incomplete_assets (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  asset_sha256 TEXT NOT NULL,
  asset_md5ext TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS complete_assets (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  asset_sha256 TEXT NOT NULL REFERENCES assets(asset_sha256) ON DELETE CASCADE,
  asset_md5ext TEXT NOT NULL,
  PRIMARY KEY(project_id, asset_sha256)
) STRICT;

CREATE TRIGGER IF NOT EXISTS remove_unused_assets AFTER DELETE ON complete_assets
BEGIN
  DELETE FROM assets WHERE asset_sha256=OLD.asset_sha256 AND
    NOT EXISTS (SELECT 1 FROM complete_assets WHERE asset_sha256=assets.asset_sha256);
END;
`);

/**
 * All times in the database are in seconds since the unix epoch.
 */
export const now = (): number => Math.round(Date.now() / 1000);

export interface IncompleteProject {
  projectId: string;
  expires: number;
  missingMd5exts: string[];
  ownershipToken: string;
}

const insertProjectStatement = db.prepare(`
  INSERT INTO projects (
    project_id,
    complete,
    data,
    expires,
    ownership_token,
    project_title,
    project_description
  ) VALUES (?, FALSE, ?, ?, ?, ?, ?);
`);
export const createIncompleteProject = (
  encodedProjectJSON: Buffer,
  parsedProject: ParsedProject,
  md5extsToSha256: Record<string, string>,
  projectTitle: string
): IncompleteProject => {
  const projectId = crypto.randomUUID();
  const ownershipToken = `o:${crypto.randomUUID()}`;
  const expires = now() + 60 * 60 * 24;
  const projectDescription = '';
  console.log(`Creating incomplete project ${projectId}`);

  insertProjectStatement.run(
    projectId,
    encodedProjectJSON,
    expires,
    ownershipToken,
    projectTitle,
    projectDescription
  );

  const missingMd5exts = [];
  for (const md5ext of parsedProject.md5exts) {
    const sha256 = md5extsToSha256[md5ext];
    if (doesAssetExist(sha256)) {
      addCompleteAssetConnection(projectId, md5ext, sha256);
    } else {
      addIncompleteAsset(projectId, md5ext, sha256);
      missingMd5exts.push(md5ext);
    }
  }

  return {
    projectId,
    expires,
    missingMd5exts,
    ownershipToken
  };
};

const getOwnershipTokenStatement = db.prepare('SELECT ownership_token FROM projects WHERE project_id=?;');
export const getOwnershipToken = (projectId: string): string => {
  const result = getOwnershipTokenStatement.get(projectId);
  if (!result) {
    throw new Error(`No project with ID ${projectId}`);
  }
  return result.ownership_token;
};

const finalizeProjectStatement = db.prepare('UPDATE projects SET complete=TRUE WHERE project_id=?;');
export const completeNewProject = (projectId: string): void => {
  console.log(`Completing ${projectId}`);
  finalizeProjectStatement.run(projectId);
};

const doesAssetExistStatement = db.prepare('SELECT 1 FROM assets WHERE asset_sha256=?;');
export const doesAssetExist = (sha256: string): boolean => {
  return !!doesAssetExistStatement.get(sha256);
};

const insertIncompleteAssetStatement = db.prepare(`
  INSERT INTO incomplete_assets (project_id, asset_md5ext, asset_sha256) VALUES (?, ?, ?);
`);
export const addIncompleteAsset = (projectId: string, md5ext: string, sha256: string): void => {
  console.log(`Adding incomplete asset ${md5ext}/${sha256} for ${projectId}`);
  insertIncompleteAssetStatement.run(projectId, md5ext, sha256);
};

const insertAssetConnectionStatement = db.prepare(`INSERT INTO complete_assets (project_id, asset_md5ext, asset_sha256) VALUES (?, ?, ?);`);
export const addCompleteAssetConnection = (projectId: string, md5ext: string, sha256: string): void => {
  console.log(`Adding complete asset ${md5ext}/${sha256} for ${projectId}`);
  insertAssetConnectionStatement.run(projectId, md5ext, sha256);
};

const getSha256Statement = db.prepare('SELECT asset_sha256 FROM incomplete_assets WHERE project_id=? AND asset_md5ext=?;');
export const getExpectedSha256 = (projectId: string, md5ext: string): string => {
  const asset = getSha256Statement.get(projectId, md5ext);
  if (!asset) {
    throw new Error('Unknown asset');
  }
  return asset.asset_sha256;
};

const getIncompleteAssetStatement = db.prepare('SELECT * FROM incomplete_assets WHERE project_id=? AND asset_md5ext=?;');
const deleteIncompleteAssetStatement = db.prepare('DELETE FROM incomplete_assets WHERE project_id=? AND asset_md5ext=?;');
const insertAssetStatement = db.prepare('INSERT INTO assets (asset_sha256, data) VALUES (?, ?);');
export const completeAsset = (projectId: string, md5ext: string, data: Uint8Array) => {
  console.log(`Completing asset ${md5ext} for ${projectId}`);
  const incompleteAsset = getIncompleteAssetStatement.get(projectId, md5ext);
  if (!incompleteAsset) {
    throw new Error('Unknown asset or project');
  }
  const sha256 = incompleteAsset.asset_sha256 as string;
  deleteIncompleteAssetStatement.run(projectId, md5ext);
  insertAssetStatement.run(sha256, data);
  addCompleteAssetConnection(projectId, md5ext, sha256);
};

interface ProjectMetadata {
  title: string;
  description: string;
  complete: boolean;
  expires: number;
}

const getMetadataStatement = db.prepare(`
  SELECT
    project_title,
    project_description,
    complete,
    expires
  FROM projects WHERE project_id=?;
`);
export const getProjectMetadata = (projectId: string): ProjectMetadata => {
  const projectMeta = getMetadataStatement.get(projectId);
  if (!projectMeta) {
    throw new Error('No project with ID');
  }
  return {
    title: projectMeta.project_title,
    description: projectMeta.project_description,
    complete: projectMeta.complete === 1,
    expires: projectMeta.expires
  };
};

const getProjectStatement = db.prepare('SELECT data FROM projects WHERE project_id=?;');
export const getProjectData = (projectId: string): Buffer => {
  const metadata = getProjectMetadata(projectId);
  if (!metadata.complete) {
    throw new Error('Project is incomplete');
  }
  const project = getProjectStatement.get(projectId);
  // we can assume project is defined because metadata exists
  return project.data;
};

const getCompleteAssetsStatement = db.prepare('SELECT asset_sha256, asset_md5ext FROM complete_assets WHERE project_id=?;');
export const getMd5extToSha256 = (projectId: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const assets = getCompleteAssetsStatement.all(projectId);
  for (const {asset_sha256, asset_md5ext} of assets) {
    result[asset_md5ext] = asset_sha256;
  }
  return result;
};

const getAssetStatement = db.prepare('SELECT data FROM assets WHERE asset_sha256=?;');
export const getAssetData = (sha256: string): Buffer => {
  const asset = getAssetStatement.get(sha256);
  if (!asset) {
    throw new Error('No asset with ID');
  }
  return asset.data;
};

const setProjectTitleStatement = db.prepare(`UPDATE projects SET project_title=? WHERE project_id=?;`);
export const setProjectTitle = (projectId: string, title: string): void => {
  setProjectTitleStatement.run(title, projectId);
};

const setProjectDescriptionStatement = db.prepare(`UPDATE projects SET project_description=? WHERE project_id=?;`);
export const setProjectDescription = (projectId: string, title: string): void => {
  setProjectDescriptionStatement.run(title, projectId);
};

const deleteProjectStatement = db.prepare(`DELETE FROM projects WHERE project_id=?;`);
export const deleteProject = (projectId: string): void => {
  console.log(`Deleting ${projectId}`);
  deleteProjectStatement.run(projectId);
};

const deleteExpiredProjectsStatement = db.prepare('DELETE FROM projects WHERE expires < ? RETURNING project_id;');
export const removeExpiredProjects = (): void => {
  const deleted = deleteExpiredProjectsStatement.all(now());
  for (const project of deleted) {
    console.log(`Expiring ${project.project_id}`);
  }
};
