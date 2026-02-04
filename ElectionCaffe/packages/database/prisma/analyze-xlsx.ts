/**
 * Analyze the Karaikudi Master Data Excel file
 */

import * as XLSX from 'xlsx';

const filePath = '/Users/datacaffe.ai/Documents/ElectionSoft/DataXls/184_Karaikudi_Master_Data.xlsx';

const workbook = XLSX.readFile(filePath);

console.log('=== Excel File Analysis ===\n');
console.log('Sheet Names:', workbook.SheetNames);
console.log('\n');

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`\n=== Sheet: ${sheetName} ===`);
  console.log(`Total Rows: ${data.length}`);

  if (data.length > 0) {
    console.log('\nColumn Headers (First Row):');
    console.log(data[0]);

    if (data.length > 1) {
      console.log('\nSample Data (Row 2-5):');
      for (let i = 1; i < Math.min(5, data.length); i++) {
        console.log(`Row ${i + 1}:`, data[i]);
      }
    }

    // Also show as JSON for first few records
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    if (jsonData.length > 0) {
      console.log('\nFirst Record as JSON:');
      console.log(JSON.stringify(jsonData[0], null, 2));

      if (jsonData.length > 1) {
        console.log('\nSecond Record as JSON:');
        console.log(JSON.stringify(jsonData[1], null, 2));
      }
    }
  }

  console.log('\n' + '='.repeat(60));
}
