import sqlite from 'better-sqlite3';
import type {ParsedProject} from '$lib/parse';

const db = new sqlite('unshared.db');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  complete INT NOT NULL,
  data BLOB NOT NULL,
  expires INTEGER NOT NULL,
  ownership_token TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY NOT NULL,
  data BLOB NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS incomplete_assets (
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS complete_assets (
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  asset_id TEXT REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY(project_id, asset_id)
) STRICT;

CREATE TRIGGER IF NOT EXISTS remove_unused_assets AFTER DELETE ON complete_assets
BEGIN
  DELETE FROM assets WHERE id=OLD.asset_id AND
    NOT EXISTS (SELECT 1 FROM complete_assets WHERE asset_id=assets.id);
END;
`);

/**
 * All times in the database are in seconds since the unix epoch.
 */
export const now = (): number => Math.round(Date.now() / 1000);

interface IncompleteProject {
  id: string;
  expires: number;
  missingAssets: string[];
  ownershipToken: string;
}

const insertProjectStatement = db.prepare(`
  INSERT INTO projects (id, complete, data, expires, ownership_token) VALUES (?, FALSE, ?, ?, ?);
`);
export const createIncompleteProject = (encodedProjectJSON: Buffer, parsedProject: ParsedProject): IncompleteProject => {
  const projectId = crypto.randomUUID();
  const ownershipToken = `o:${crypto.randomUUID()}`;
  const expires = now() + 60 * 60 * 24;
  console.log(`Creating incomplete project ${projectId}`);

  insertProjectStatement.run(projectId, encodedProjectJSON, expires, ownershipToken);

  const missingAssets = [];
  for (const assetId of parsedProject.assets) {
    const doesAssetExist = doesAssetExistStatement.get(assetId);
    if (doesAssetExist) {
      addCompleteAssetConnection(projectId, assetId);
    } else {
      addIncompleteAsset(projectId, assetId);
      missingAssets.push(assetId);
    }
  }

  return {
    id: projectId,
    expires,
    missingAssets,
    ownershipToken
  };
};

const getOwnershipTokenStatement = db.prepare('SELECT ownership_token FROM projects WHERE id = ?;');
export const getOwnershipToken = (projectId: string): string => {
  const result = getOwnershipTokenStatement.get(projectId);
  if (!result) {
    throw new Error(`No project with ID ${projectId}`);
  }
  return result.ownership_token;
};

const finalizeProjectStatement = db.prepare('UPDATE projects SET complete=TRUE WHERE id=?;');
export const completeNewProject = (projectId: string): void => {
  console.log(`Completing ${projectId}`);
  finalizeProjectStatement.run(projectId);
};

const doesAssetExistStatement = db.prepare('SELECT 1 FROM assets WHERE id = ?;');
export const doesAssetExist = (assetId: string): boolean => {
  return !!doesAssetExistStatement(assetId);  
};

const insertIncompleteAssetStatement = db.prepare(`
  INSERT INTO incomplete_assets (project_id, asset_id) VALUES (?, ?);
`);
export const addIncompleteAsset = (projectId: string, assetId: string): void => {
  console.log(`Adding incomplete asset ${assetId} for ${projectId}`);
  insertIncompleteAssetStatement.run(projectId, assetId);
};

const insertAssetConnectionStatement = db.prepare(`INSERT INTO complete_assets (project_id, asset_id) VALUES (?, ?);`);
export const addCompleteAssetConnection = (projectId: string, assetId: string): void => {
  console.log(`Adding complete asset ${assetId} for ${projectId}`);
  insertAssetConnectionStatement.run(projectId, assetId);
};

const getIncompleteAssetStatement = db.prepare(`SELECT * FROM incomplete_assets WHERE project_id=? AND asset_id=?;`);
const deleteIncompleteAssetStatement = db.prepare(`DELETE FROM incomplete_assets WHERE project_id=? AND asset_id=?;`);
const insertAssetStatement = db.prepare(`INSERT INTO assets (id, data) VALUES (?, ?);`);
export const completeAsset = (projectId: string, assetId: string, data: Uint8Array) => {
  console.log(`Completing asset ${assetId} for ${projectId}`);
  const doesIncompleteAssetExist = getIncompleteAssetStatement.get(projectId, assetId);
  if (!doesIncompleteAssetExist) {
    throw new Error('Unknown asset or project');
  }
  deleteIncompleteAssetStatement.run(projectId, assetId);
  insertAssetStatement.run(assetId, data);
  addCompleteAssetConnection(projectId, assetId);
};

interface ProjectMetadata {
  complete: boolean;
  expires: number;
}

const getMetadataStatement = db.prepare('SELECT complete, expires FROM projects WHERE id=?;');
export const getProjectMetadata = (projectId: string): ProjectMetadata => {
  const projectMeta = getMetadataStatement.get(projectId);
  if (!projectMeta) {
    throw new Error('No project with ID');
  }
  return {
    complete: projectMeta.complete === 1,
    expires: projectMeta.expires
  };
};

const getProjectStatement = db.prepare('SELECT data FROM projects WHERE id=?;');
export const getProjectData = (projectId: string): Buffer => {
  const metadata = getProjectMetadata(projectId);
  if (!metadata.complete) {
    throw new Error('Project is incomplete');
  }
  const project = getProjectStatement.get(projectId);
  // we can assume project is defined because metadata exists
  return project.data;
};

export const getAssetData = (assetId: string): Buffer => {
  const asset = getAssetStatement.get(assetId);
  if (!asset) {
    throw new Error('No asset with ID');
  }
  return asset.data;
};
const getAssetStatement = db.prepare('SELECT data FROM assets WHERE id=?;');

export const deleteProject = (projectId: string): void => {
  console.log(`Deleting ${projectId}`);
  deleteProjectStatement.run(projectId);
};
const deleteProjectStatement = db.prepare(`DELETE FROM projects WHERE id=?;`);

export const removeExpiredProjects = (): void => {
  const deleted = deleteExpiredProjectsStatement.all(now());
  for (const project of deleted) {
    console.log(`Expiring ${project.id}`);
  }
};
const deleteExpiredProjectsStatement = db.prepare('DELETE FROM projects WHERE expires < ? RETURNING id;');
