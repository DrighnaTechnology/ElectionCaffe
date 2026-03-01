const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'apps', 'web', 'src', 'pages');

const files = [
  'VulnerabilityPage.tsx',
  'BLA2Page.tsx',
  'BoothCommitteePage.tsx',
  'FamilyCaptainPage.tsx',
  'PollDayPage.tsx',
  'SectionsPage.tsx',
  'VoterSlipPage.tsx',
  'AIAnalyticsPage.tsx',
  'AnalyticsPage.tsx',
];

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  if (!fs.existsSync(filePath)) {
    console.log('SKIP (not found):', file);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix interface field types
  content = content.replace(/partNo\??: number/g, 'partNumber: number');
  content = content.replace(/partNameEn\??: string/g, 'boothName: string');
  content = content.replace(/boothAddress\??: string/g, 'address: string');

  // Fix fallback patterns like: x.partNumber || x.partNo → x.partNumber
  content = content.replace(/(\w+)\.partNumber\s*\|\|\s*\1\.partNo/g, '$1.partNumber');
  // Fix: x.partName || x.partNameEn → x.boothName
  content = content.replace(/(\w+)\.partName\s*\|\|\s*\1\.partNameEn/g, '$1.boothName');
  content = content.replace(/(\w+)\.partName\s*\|\|\s*\1\.boothName/g, '$1.boothName');

  // Direct field access replacements
  content = content.replace(/\.partNo\b/g, '.partNumber');
  content = content.replace(/\.partNameEn\b/g, '.boothName');
  content = content.replace(/\.boothAddress\b/g, '.address');

  // Fix .partName (not .partNameLocal) → .boothName on object access
  content = content.replace(/(\w+)\.partName\b(?!Local)/g, '$1.boothName');

  // Fix SectionsPage map: p.partNumber || p.partNumber → p.partNumber
  content = content.replace(/p\.partNumber\s*\|\|\s*p\.partNumber/g, 'p.partNumber');

  // Fix CSV/template keys: key: 'partNo' → key: 'partNumber' (only in template column defs)
  // Actually don't change the template key 'partNo' for voters - that's the Excel column name mapping

  // Remove duplicate interface lines after replace
  const lines = content.split('\n');
  let prevLine = '';
  const filtered = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed === 'partNumber?: number;' && prevLine.trim() === 'partNumber: number;') {
      return false;
    }
    if (trimmed === 'partNumber: number;' && prevLine.trim() === 'partNumber: number;') {
      return false;
    }
    prevLine = line;
    return true;
  });
  content = filtered.join('\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('FIXED:', file);
  } else {
    console.log('NO CHANGES:', file);
  }
});
