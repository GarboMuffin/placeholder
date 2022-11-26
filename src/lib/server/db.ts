import { error } from '@sveltejs/kit';
import sqlite from 'better-sqlite3';
import type {ParsedProject} from '$lib/parse';
import nodeCrypto from 'node:crypto';
import * as Limits from '../config/limits';

/*

Terminology:
 - SHA-256: A SHA-256 sum in hex format
   Example: 281b3e68790665fde7a4d952e9f43114ceb1778d1ce14fde31371b73db23cfdc
 - md5ext: A MD5 sum and a file extension
   Example: 4626b10e05ba7ec6386b1996e44b0a84.svg

 */

// TODO: testing
const db = new sqlite(process.env.TEST ? ':memory:' : 'unshared.db');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  -- unique ID for project, visible to user
  project_id TEXT PRIMARY KEY NOT NULL,

  -- 1 if all assets have been uploaded
  complete INT NOT NULL,

  -- raw project.json data
  data BLOB NOT NULL,

  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL
) STRICT;`);

db.exec(`
CREATE TABLE IF NOT EXISTS ownership_tokens (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,

  -- secret token to prove project ownership
  ownership_token TEXT NOT NULL,

  PRIMARY KEY(project_id, ownership_token)
) STRICT;`);

db.exec(`
CREATE TABLE IF NOT EXISTS assets (
  -- SHA-256 of data, has already been verified
  asset_sha256 TEXT PRIMARY KEY NOT NULL,

  -- raw asset data
  data BLOB NOT NULL
) STRICT;`);

db.exec(`
CREATE TABLE IF NOT EXISTS complete_project_assets (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,

  -- SHA-256 of the asset
  asset_sha256 TEXT NOT NULL REFERENCES assets(asset_sha256) ON DELETE CASCADE,

  -- user-provided md5ext with file extension
  asset_md5ext TEXT NOT NULL,

  PRIMARY KEY(project_id, asset_sha256)
) STRICT;`);

db.exec(`
CREATE TABLE IF NOT EXISTS incomplete_project_assets (
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,

  -- user-provided SHA-256 that this asset should have (untrusted)
  asset_sha256 TEXT NOT NULL,

  -- user-provided md5ext with file extension that this asset should have (untrusted)
  asset_md5ext TEXT NOT NULL,

  -- user-provided size in bytes that this asset should have (untrusted)
  asset_size INT NOT NULL,

  PRIMARY KEY(project_id, asset_md5ext)
) STRICT;`);

db.exec(`
CREATE TRIGGER IF NOT EXISTS remove_unused_assets AFTER DELETE ON complete_project_assets
BEGIN
  DELETE FROM assets WHERE asset_sha256=OLD.asset_sha256 AND
    NOT EXISTS (SELECT 1 FROM complete_project_assets WHERE asset_sha256=assets.asset_sha256);
END;`);

const _getTotalProjectDataSize = db.prepare('SELECT sum(length(data)) FROM projects;');
const _getTotalCompleteAssetSize = db.prepare('SELECT sum(length(data)) FROM assets;');
const _getTotalIncompleteAssetSize = db.prepare('SELECT sum(asset_size) FROM incomplete_project_assets;');
const getTotalSizeOfEverything = () => {
  return (
    _getTotalProjectDataSize.get()['sum(length(data))'] +
    _getTotalCompleteAssetSize.get()['sum(length(data))'] +
    _getTotalIncompleteAssetSize.get()['sum(asset_size)']
  );
};

export interface IncompleteProject {
  projectId: string;
  missingMd5exts: string[];
  ownershipToken: string;
}

/**
 * Maps the md5exts in a project to additional information about them.
 */
export type AssetInformation = Record<string, {
  sha256: string;
  size: number;
}>;

const insertProjectStatement = db.prepare(`
  INSERT INTO projects (
    project_id,
    complete,
    data,
    project_title,
    project_description
  ) VALUES (?, FALSE, ?, ?, '');
`);
export const createIncompleteProject = db.transaction((
  encodedProjectJSON: Buffer,
  parsedProject: ParsedProject,
  assetInformation: AssetInformation,
  projectTitle: string
): IncompleteProject => {
  if (encodedProjectJSON.byteLength > Limits.MAX_PROJECT_DATA_SIZE) {
    throw error(400, 'project.json too large');
  }

  const projectId = crypto.randomUUID();
  insertProjectStatement.run(
    projectId,
    encodedProjectJSON,
    projectTitle
  );

  const ownershipToken = createOwnershipToken(projectId);

  const missingMd5exts: string[] = [];
  let totalSize = 0;

  for (const md5ext of parsedProject.md5exts) {
    const asset = assetInformation[md5ext];

    if (asset.size > Limits.MAX_ASSET_SIZE) {
      throw error(400, `asset is too large: ${md5ext}`);
    }

    const completeAsset = getCompleteAssetMetadata(asset.sha256);
    if (completeAsset) {
      const knownSize = completeAsset.size;
      if (asset.size !== knownSize) {
        throw error(400, 'size of preexisting asset does not match');
      }
      createCompleteAssetConnection(projectId, asset.sha256, md5ext);
    } else {
      missingMd5exts.push(md5ext);
      createIncompleteAssetConnection(projectId, asset.sha256, md5ext, asset.size);
    }

    totalSize += asset.size;
  }

  if (totalSize > Limits.MAX_TOTAL_PROJECT_SIZE) {
    throw error(400, 'total project size is too large');
  }

  if (getTotalSizeOfEverything() > Limits.MAX_EVERYTHING_SIZE) {
    throw error(400, 'the server is out of space');
  }

  return {
    projectId,
    missingMd5exts,
    ownershipToken
  };
});

const _insertOwnershipToken = db.prepare(`
  INSERT INTO ownership_tokens (ownership_token, project_id) VALUES (?, ?);
`);
const createOwnershipToken = (projectId: string): string => {
  const token = crypto.randomUUID();
  _insertOwnershipToken.run(token, projectId);
  return token;
};

interface CompleteAssetMetadata {
  size: number;
}
const _isCompleteAsset = db.prepare(`
  SELECT length(data) FROM assets WHERE asset_sha256=?;
`)
const getCompleteAssetMetadata = (sha256: string): CompleteAssetMetadata | null => {
  const result = _isCompleteAsset.get(sha256);
  if (!result) {
    return null;
  }
  const size = result['length(data)'];
  return {
    size
  };
};

const _createCompleteAssetConnection = db.prepare(`
  INSERT INTO complete_project_assets (project_id, asset_sha256, asset_md5ext) VALUES (?, ?, ?);
`);
const createCompleteAssetConnection = (projectId: string, sha256: string, md5ext: string): void => {
  _createCompleteAssetConnection.run(projectId, sha256, md5ext);
};

const _createIncompleteAssetConnection = db.prepare(`
  INSERT INTO incomplete_project_assets (project_id, asset_sha256, asset_md5ext, asset_size) VALUES (?, ?, ?, ?);
`);
const createIncompleteAssetConnection = (projectId: string, sha256: string, md5ext: string, size: number): void => {
  _createIncompleteAssetConnection.run(projectId, sha256, md5ext, size);
};

interface IncompleteAssetMetadata {
  sha256: string;
  size: number;
}
const _getIncompleteAssetMetadata = db.prepare(`
  SELECT asset_sha256, asset_size FROM incomplete_project_assets WHERE project_id=? AND asset_md5ext=?;
`)
const getIncompleteAssetMetadata = (projectId: string, md5ext: string): IncompleteAssetMetadata => {
  const metadata = _getIncompleteAssetMetadata.get(projectId, md5ext);
  if (!metadata) {
    throw error(400, 'unknown asset');
  }
  return {
    sha256: metadata.asset_sha256,
    size: metadata.asset_size
  };
};

const _deleteIncompleteAsset = db.prepare(`
  DELETE FROM incomplete_project_assets WHERE project_id=? AND asset_md5ext=?;
`);
const _createAsset = db.prepare(`
  INSERT INTO assets (asset_sha256, data) VALUES (?, ?);
`);
export const finishIncompleteAsset = db.transaction((projectId: string, md5ext: string, data: Buffer): void => {
  const metadata = getIncompleteAssetMetadata(projectId, md5ext);

  if (data.byteLength !== metadata.size) {
    throw error(400, 'size mismatch');
  }

  const expectedMd5 = md5ext.split('.')[0];
  const actualMd5 = nodeCrypto
    .createHash('md5')
    .update(data)
    .digest('hex');
  if (expectedMd5 !== actualMd5) {
    throw error(400, 'md5 mismatch');
  }

  const expectedSha256 = metadata.sha256;
  const actualSha256 = nodeCrypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
  if (expectedSha256 !== actualSha256) {
    throw error(400, 'sha256 mismatch');
  }

  _deleteIncompleteAsset.run(projectId, md5ext);
  _createAsset.run(metadata.sha256, data);
  createCompleteAssetConnection(projectId, metadata.sha256, md5ext);
});

const _hasIncompleteAssets = db.prepare(`
  SELECT 1 FROM incomplete_project_assets WHERE project_id=?;
`);
const _finishIncompleteProject = db.prepare(`
  UPDATE projects SET complete=TRUE WHERE project_id=?;
`);
export const finishIncompleteProject = db.transaction((projectId: string): void => {
  const hasIncompleteAssets = !!_hasIncompleteAssets.get(projectId);
  if (hasIncompleteAssets) {
    throw error(400, 'project is not complete');
  }
  _finishIncompleteProject.run(projectId);
});

const _isValidOwnershipToken = db.prepare(`
  SELECT 1 FROM ownership_tokens WHERE project_id=? AND ownership_token=?;
`)
export const isValidOwnershipToken = (projectId: string, ownershipToken: string): boolean => {
  return !!_isValidOwnershipToken.run(projectId, ownershipToken);
};

interface ProjectMetadata {
  title: string;
  description: string;
}
const _getCompleteProjectMetadata = db.prepare(`
  SELECT project_title, project_description FROM projects WHERE project_id=? AND complete=TRUE;
`);
export const getCompleteProjectMetadata = (projectId: string): ProjectMetadata => {
  const projectMeta = _getCompleteProjectMetadata.get(projectId);
  if (!projectMeta) {
    throw error(404, 'project does not exist');
  }
  return {
    title: projectMeta.project_title,
    description: projectMeta.project_description
  };
};

const _getCompleteAssets = db.prepare(`
  SELECT asset_sha256, asset_md5ext FROM complete_project_assets WHERE project_id=?;
`)
export const getMd5extToSha256 = (projectId: string): Record<string, string> => {
  const assets = _getCompleteAssets.all(projectId);
  const record: Record<string, string> = {};
  for (const {asset_sha256, asset_md5ext} of assets) {
    record[asset_md5ext] = asset_sha256;
  }
  return record;
};

const _doesProjectExist = db.prepare('SELECT 1 FROM projects WHERE project_id=? AND complete=TRUE;');
const _getProjectData = db.prepare('SELECT data FROM projects WHERE project_id=?;');
export const getProjectData = (projectId: string): Buffer => {
  if (!_doesProjectExist.get(projectId)) {
    throw error(404, 'project does not exist');
  }
  const project = _getProjectData.get(projectId);
  return project.data;
};

const _getAssetData = db.prepare('SELECT data FROM assets WHERE asset_sha256=?;');
export const getAssetData = (sha256: string): Buffer => {
  const asset = _getAssetData.get(sha256);
  if (!asset) {
    throw error(404, 'asset does not exist');
  }
  return asset.data;
};

const _setProjectTitle = db.prepare(`UPDATE projects SET project_title=? WHERE project_id=?;`);
export const setProjectTitle = (projectId: string, title: string): void => {
  _setProjectTitle.run(title, projectId);
};

const _setProjectDescription = db.prepare(`UPDATE projects SET project_description=? WHERE project_id=?;`);
export const setProjectDescription = (projectId: string, title: string): void => {
  _setProjectDescription.run(title, projectId);
};

const _deleteProject = db.prepare(`DELETE FROM projects WHERE project_id=?;`);
export const deleteProject = (projectId: string): void => {
  _deleteProject.run(projectId);
};
