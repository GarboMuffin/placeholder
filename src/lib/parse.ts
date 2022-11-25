const DATA_FORMATS = [
  'png',
  'jpg',
  'svg',
  'mp3',
  'wav'
];

// intentionally not case insensitive
const ASSET_ID_REGEX = /^[0-9a-f]{32}$/;

const isObject = (i: unknown): i is object => typeof i === 'object' && !!i;

export interface ParsedProject {
  md5exts: string[];
}

export const parseProject = (projectData: string): ParsedProject => {
  const projectJSON: unknown = JSON.parse(projectData);

  if (!isObject(projectJSON)) {
    throw new Error('project is not an object');
  }

  const targets = (projectJSON as any).targets;
  if (!Array.isArray(targets)) {
    throw new Error('targets is not an array');
  }

  const md5exts = targets
    .map((target) => {
      const costumes = target.costumes;
      if (!Array.isArray(costumes)) {
        throw new Error('costumes is not an array');
      }

      const sounds = target.sounds;
      if (!Array.isArray(sounds)) {
        throw new Error('sounds is not an array');
      }

      return [...costumes, ...sounds];
    })
    .flat()
    .map((asset) => {
      if (!isObject(asset)) {
        throw new Error('asset is not an object');
      }

      const md5 = (asset as any).assetId;
      if (typeof md5 !== 'string') {
        throw new Error('md5 is not string');
      }
      if (!ASSET_ID_REGEX.test(md5)) {
        throw new Error(`Invalid md5: ${md5}`);
      }

      const dataFormat = (asset as any).dataFormat;
      if (typeof dataFormat !== 'string') {
        throw new Error('dataFormat is not string');
      }
      if (!DATA_FORMATS.includes(dataFormat.toLowerCase())) {
        throw new Error(`Unknown data format: ${dataFormat}`)
      }

      const assetId = `${md5}.${dataFormat}`;
      return assetId;
    });

  return {
    md5exts: Array.from(new Set(md5exts))
  };
};
