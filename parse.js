const DATA_FORMATS = [
  'png',
  'jpg',
  'svg',
  'mp3',
  'wav'
];

// intentionally not case insensitive
const ASSET_ID_REGEX = /^[0-9a-f]{32}$/;

const isObject = (i) => typeof i === 'object' && !!i;

/**
 * @typedef ParsedProject
 * @property {string[]} assets
 */

/**
 * @param {unknown} projectJSON
 * @returns {string[]} List of md5exts that the project contains.
 */
export const parseProject = (projectJSON) => {
  if (!isObject(projectJSON)) {
    throw new Error('project is not an object');
  }

  const targets = projectJSON.targets;
  if (!Array.isArray(targets)) {
    throw new Error('targets is not an array');
  }

  const md5exts = targets
    .map((target) => {
      const costumes = target.costumes;
      const sounds = target.sounds;
      return [...costumes, ...sounds];
    })
    .flat()
    .map((asset) => {
      if (!isObject(asset)) {
        throw new Error('asset is not an object');
      }

      const md5 = asset.assetId;
      if (typeof md5 !== 'string') {
        throw new Error('md5 is not string');
      }
      if (!ASSET_ID_REGEX.test(md5)) {
        throw new Error(`Invalid md5: ${md5}`);
      }

      const dataFormat = asset.dataFormat;
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
    assets: Array.from(new Set(md5exts))
  };
};
