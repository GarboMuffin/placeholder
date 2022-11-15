import express from 'express';
import multer from 'multer';
import path from 'path';
import {fileURLToPath} from 'url';
import * as db from './db.js';
import {parseProject} from './parse.js';

const app = express();
const upload = multer({
  storage: multer.memoryStorage()
});

app.use((req, res, next) => {
  res.header('X-Frame-Options', 'DENY')
  res.header('X-Content-Type-Options', 'nosniff');
  res.removeHeader('x-powered-by');
  next();
});

app.post('/api/projects/new', upload.single('project'), (req, res) => {
  if (!req.file) {
    res.status(400).send('Missing project');
    return;
  }

  const encodedData = req.file.buffer;
  let json;
  try {
    json = JSON.parse(encodedData.toString('utf-8'));
  } catch (e) {
    res.status(400).send(`Could not parse as JSON: ${e}`);
    return;
  }

  let parsedProject;
  try {
    parsedProject = parseProject(json);
  } catch (e) {
    res.status(400).send(`Could not parse project: ${e}`);
    return;
  }

  const incompleteProject = db.createIncompleteProject(encodedData, parsedProject);
  res.json(incompleteProject);
});

const jsonParser = express.json();

const requireOwnershipToken = (req, res, next) => {
  const projectId = req.params.project;
  const providedToken = req.body.ownershipToken;
  const realToken = db.getOwnershipToken(projectId);
  if (providedToken !== realToken) {
    res.status(401).send('Invalid ownership token');
    return;
  }
  next();
};

app.post('/api/projects/:project/complete', jsonParser, requireOwnershipToken, (req, res) => {
  db.completeNewProject(req.params.project);
  res.json({});
});

app.post('/api/projects/:project/assets/:asset/upload', upload.single('asset'), requireOwnershipToken, (req, res) => {
  if (!req.file) {
    res.status(400).send('Missing status');
    return;
  }

  const assetId = req.params.asset;
  const projectId = req.params.project;
  db.completeAsset(projectId, assetId, req.file.buffer);
  res.json({
    assetId,
    projectId
  });
});

app.delete('/api/projects/:project', jsonParser, requireOwnershipToken, (req, res) => {
  db.deleteProject(req.params.project);
});

app.get('/api/projects/:project/json', (req, res) => {
  const projectId = req.params.project;
  const data = db.getProjectData(projectId);
  res.type('application/json');
  res.send(data);
});

app.get('/api/projects/:project', (req, res) => {
  const projectId = req.params.project;
  const data = db.getProjectMetadata(projectId);
  res.type('application/json');
  res.send(data);
});

app.get('/api/assets/:asset/get', (req, res) => {
  const assetId = req.params.asset;
  const data = db.getAssetData(assetId);
  res.type('application/octet-stream');
  res.header('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(data);
});

app.get('/projects/:id', (req, res) => {
  res.sendFile(path.join(fileURLToPath(import.meta.url), '..', 'static', 'project.html'));
});

app.use(express.static('static'));

app.listen(8732);
