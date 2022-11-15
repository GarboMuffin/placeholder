import sqlite from 'better-sqlite3';
import {v4 as uuid} from 'uuid';

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
  asset_id TEXT REFERENCES assets(id) ON DELETE CASCADE
) STRICT;
`);

/**
 * All time values stored in the database are in seconds since the UNIX epoch.
 * @returns {number}
 */
export const now = () => Math.round(Date.now() / 1000);

/**
 * @typedef IncompleteProject
 * @property {string} id
 * @property {number} expires
 * @property {string[]} missingAssets List of md5exts that the server is not yet aware of.
 * @property {string} ownershipToken A special token that can later be used to prove ownership of the project
 */

/**
 * @param {Buffer} encodedProjectJSON
 * @param {import('./parse').ParsedProject} parsedProject
 * @returns {IncompleteProject}
 */
export const createIncompleteProject = (encodedProjectJSON, parsedProject) => {
  const projectId = uuid();
  const ownershipToken = `o:${uuid()}`;
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
const insertProjectStatement = db.prepare(`
  INSERT INTO projects (id, complete, data, expires, ownership_token) VALUES (?, FALSE, ?, ?, ?);
`);

/**
 * @param {string} projectId
 * @returns {string}
 */
export const getOwnershipToken = (projectId) => {
  const result = getOwnershipTokenStatement.get(projectId);
  if (!result) {
    throw new Error(`No project with ID ${projectId}`);
  }
  return result.ownership_token;
};
const getOwnershipTokenStatement = db.prepare('SELECT ownership_token FROM projects WHERE id = ?;');

/**
 * @param {string} projectId
 */
export const completeNewProject = (projectId) => {
  console.log(`Completing ${projectId}`);
  finalizeProjectStatement.run(projectId);
};
const finalizeProjectStatement = db.prepare('UPDATE projects SET complete=TRUE WHERE id=?;');

/**
 * @param {string} assetId
 * @returns {boolean}
 */
export const doesAssetExist = (assetId) => {
  return !!doesAssetExistStatement(assetId);  
};
const doesAssetExistStatement = db.prepare('SELECT 1 FROM assets WHERE id = ?;');

/**
 * @param {string} projectId
 * @param {string} assetId
 */
export const addIncompleteAsset = (projectId, assetId) => {
  console.log(`Adding incomplete asset ${assetId} for ${projectId}`);
  insertIncompleteAssetStatement.run(projectId, assetId);
};
const insertIncompleteAssetStatement = db.prepare(`
  INSERT INTO incomplete_assets (project_id, asset_id) VALUES (?, ?);
`);

/**
 * @param {string} projectId
 * @param {string} assetId
 */
export const addCompleteAssetConnection = (projectId, assetId) => {
  console.log(`Adding complete asset ${assetId} for ${projectId}`);
  insertAssetConnectionStatement.run(projectId, assetId);
};
const insertAssetConnectionStatement = db.prepare(`INSERT INTO complete_assets (project_id, asset_id) VALUES (?, ?);`);

/**
 * @param {string} projectId
 * @param {string} assetId
 * @param {Buffer} data
 */
export const completeAsset = (projectId, assetId, data) => {
  console.log(`Completing asset ${assetId} for ${projectId}`);
  const doesIncompleteAssetExist = getIncompleteAssetStatement.get(projectId, assetId);
  if (!doesIncompleteAssetExist) {
    throw new Error('Unknown asset or project');
  }
  deleteIncompleteAssetStatement.run(projectId, assetId);
  insertAssetStatement.run(assetId, data);
  addCompleteAssetConnection(projectId, assetId);
};
const getIncompleteAssetStatement = db.prepare(`SELECT * FROM incomplete_assets WHERE project_id=? AND asset_id=?;`);
const deleteIncompleteAssetStatement = db.prepare(`DELETE FROM incomplete_assets WHERE project_id=? AND asset_id=?;`);
const insertAssetStatement = db.prepare(`INSERT INTO assets (id, data) VALUES (?, ?);`);

/**
 * @typedef ProjectMetadata
 * @property {boolean} complete
 * @property {number} expires
 */

/**
 * @param {string} projectId
 */
export const getProjectMetadata = (projectId) => {
  const projectMeta = getMetadataStatement.get(projectId);
  if (!projectMeta) {
    throw new Error('No project with ID');
  }
  return {
    complete: projectMeta.complete === 1,
    expires: projectMeta.expires
  };
};
const getMetadataStatement = db.prepare('SELECT complete, expires FROM projects WHERE id=?;');

/**
 * @param {string} projectId
 * @returns {Buffer}
 */
export const getProjectData = (projectId) => {
  const metadata = getProjectMetadata(projectId);
  if (!metadata.complete) {
    throw new Error('Project is incomplete');
  }
  const project = getProjectStatement.get(projectId);
  // we can assume project is defined because metadata exists
  return project.data;
};
const getProjectStatement = db.prepare('SELECT data FROM projects WHERE id=?;');

/**
 * @param {string} assetId
 * @returns {Buffer}
 */
export const getAssetData = (assetId) => {
  const asset = getAssetStatement.get(assetId);
  if (!asset) {
    throw new Error('No asset with ID');
  }
  return asset.data;
};
const getAssetStatement = db.prepare('SELECT data FROM assets WHERE id=?;');

/**
 * @param {string} projectId
 */
export const deleteProject = (projectId) => {
  console.log(`Deleting ${projectId}`);
  deleteProjectStatement.run(projectId);
};
const deleteProjectStatement = db.prepare(`DELETE FROM projects WHERE id=?;`);
