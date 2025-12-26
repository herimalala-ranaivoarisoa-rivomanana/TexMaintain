function sanitize(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6);
}

/**
 * Generate an asset code using recommended pattern
 * [SITE]-[ASSETCLASS]-[CATEGORY]-[TYPE]-[RANDOM]
 */
function generateAssetCode({ siteCode, assetClassCode, categoryName, typeName }) {
  const site = sanitize(siteCode);
  const cls = sanitize(assetClassCode);
  const cat = sanitize(categoryName).substring(0, 3);
  const typ = sanitize(typeName).substring(0, 3);
  const rand = String(Math.floor(Math.random() * 999)).padStart(3, '0');
  const parts = [site || 'SITE', cls || 'CLS', cat || 'CAT', typ || 'TYP', rand];
  return parts.join('-');
}

module.exports = { generateAssetCode };
