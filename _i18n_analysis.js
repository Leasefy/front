const fs = require('fs');
const path = require('path');

// 1. Flatten es.json keys
const esJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/lib/i18n/locales/es.json'), 'utf8'));

function flattenKeys(obj, prefix) {
  prefix = prefix || '';
  const keys = new Set();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const k of flattenKeys(value, fullKey)) keys.add(k);
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

const esKeys = flattenKeys(esJson);

// 2. Walk all .ts and .tsx files
function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.next' || file === '.git') continue;
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

const srcDir = path.join(__dirname, 'src');
const allFiles = walkDir(srcDir);

// 3. Extract t() keys
const staticKeys = new Map(); // key -> Set of files
const dynamicKeys = []; // {file, line, raw}

const staticRegex = /\bt\(\s*['"]([^'"]+)['"]\s*[),]/g;
const dynamicRegex = /\bt\(\s*`([^`]+)`\s*[),]/g;

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(__dirname, filePath);
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    // Static keys
    staticRegex.lastIndex = 0;
    while ((match = staticRegex.exec(line)) !== null) {
      const key = match[1];
      if (!staticKeys.has(key)) staticKeys.set(key, new Set());
      staticKeys.get(key).add(relPath);
    }

    // Dynamic keys
    dynamicRegex.lastIndex = 0;
    while ((match = dynamicRegex.exec(line)) !== null) {
      const raw = match[1];
      if (raw.includes('${')) {
        dynamicKeys.push({ file: relPath, lineNum: i + 1, raw: raw });
      }
    }
  }
}

// 4. Find missing keys
const missingKeys = new Map();
for (const [key, files] of staticKeys) {
  if (!esKeys.has(key)) {
    missingKeys.set(key, files);
  }
}

// 5. Group by file
const missingByFile = new Map();
for (const [key, files] of missingKeys) {
  for (const file of files) {
    if (!missingByFile.has(file)) missingByFile.set(file, []);
    missingByFile.get(file).push(key);
  }
}

// 6. Output
console.log('========================================');
console.log('   i18n TRANSLATION KEY ANALYSIS');
console.log('========================================');
console.log('');
console.log('SUMMARY:');
console.log('  Total unique static t() keys in code: ' + staticKeys.size);
console.log('  Total keys in es.json: ' + esKeys.size);
console.log('  Missing keys (in code, NOT in es.json): ' + missingKeys.size);
console.log('  Dynamic key patterns (template literals): ' + dynamicKeys.length);
console.log('');

if (missingKeys.size > 0) {
  console.log('========================================');
  console.log('   MISSING KEYS BY FILE');
  console.log('========================================');
  console.log('');

  const sortedFiles = [...missingByFile.keys()].sort();
  for (const file of sortedFiles) {
    const keys = [...new Set(missingByFile.get(file))].sort();
    console.log('FILE: ' + file);
    for (const k of keys) {
      console.log('  - ' + k);
    }
    console.log('');
  }
}

if (missingKeys.size > 0) {
  console.log('========================================');
  console.log('   ALL MISSING KEYS (sorted)');
  console.log('========================================');
  console.log('');
  const allMissing = [...missingKeys.keys()].sort();
  for (const k of allMissing) {
    const files = [...missingKeys.get(k)].join(', ');
    console.log('  ' + k);
    console.log('    used in: ' + files);
  }
  console.log('');
}

if (dynamicKeys.length > 0) {
  console.log('========================================');
  console.log('   DYNAMIC KEY PATTERNS');
  console.log('========================================');
  console.log('');

  for (const dk of dynamicKeys) {
    const prefixMatch = dk.raw.match(/^([^$]+)\$/);
    let prefix = '';
    let prefixExists = false;
    if (prefixMatch) {
      prefix = prefixMatch[1].replace(/\.$/, '');
      for (const k of esKeys) {
        if (k.startsWith(prefix + '.') || k.startsWith(prefix)) {
          prefixExists = true;
          break;
        }
      }
    }
    console.log('  File: ' + dk.file + ':' + dk.lineNum);
    console.log('  Pattern: t(`' + dk.raw + '`)');
    if (prefix) {
      console.log('  Prefix: ' + prefix + ' -> ' + (prefixExists ? 'EXISTS in es.json' : 'MISSING from es.json'));
    }
    console.log('');
  }
}

// Also check: keys in es.json NOT used in code (potential dead keys)
const unusedKeys = [];
for (const key of esKeys) {
  if (!staticKeys.has(key)) {
    // Check if any dynamic key could match
    let possibleDynamic = false;
    for (const dk of dynamicKeys) {
      const prefixMatch = dk.raw.match(/^([^$]+)\$/);
      if (prefixMatch) {
        const prefix = prefixMatch[1].replace(/\.$/, '');
        if (key.startsWith(prefix)) {
          possibleDynamic = true;
          break;
        }
      }
    }
    if (!possibleDynamic) {
      unusedKeys.push(key);
    }
  }
}

console.log('========================================');
console.log('   POTENTIALLY UNUSED KEYS IN es.json');
console.log('   (in es.json but NOT found via t() in code)');
console.log('========================================');
console.log('  Count: ' + unusedKeys.length);
console.log('  (Note: some may be used via programmatic access or other patterns)');
console.log('');
