const XLSX = require('xlsx');

// --- Config ---
const TOTAL_ROWS = 1000;
const VALID_PARTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const GENDERS_VALID = ['MALE', 'FEMALE', 'TRANSGENDER', 'M', 'F'];
const FIRST_NAMES = ['Rajesh', 'Sunita', 'Amit', 'Priya', 'Vikram', 'Neha', 'Suresh', 'Kavita', 'Ravi', 'Anita', 'Manoj', 'Rekha', 'Deepak', 'Sita', 'Arun', 'Geeta', 'Mohan', 'Meena', 'Rahul', 'Pooja', 'Sanjay', 'Laxmi', 'Ramesh', 'Asha', 'Vijay', 'Saroj', 'Dinesh', 'Usha', 'Prakash', 'Kamla'];
const LAST_NAMES = ['Kumar', 'Sharma', 'Singh', 'Devi', 'Yadav', 'Gupta', 'Verma', 'Thakur', 'Prasad', 'Mishra', 'Pandey', 'Jha', 'Sinha', 'Roy', 'Das', 'Mandal', 'Paswan', 'Ram', 'Chaudhary', 'Tiwari'];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function randomMobile() { return String(pick([6,7,8,9])) + String(rand(100000000, 999999999)); }
function randomEpic() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[rand(0,25)] + letters[rand(0,25)] + letters[rand(0,25)] + String(rand(1000000, 9999999));
}

// Error types to inject
const ERROR_TYPES = [
  'missing_name',        // required field missing
  'short_name',          // name < 2 chars
  'invalid_gender',      // gender not in enum
  'age_too_young',       // age < 18
  'age_too_old',         // age > 120
  'age_not_number',      // age is text
  'invalid_mobile',      // mobile wrong format
  'mobile_short',        // mobile < 10 digits
  'invalid_part',        // part number doesn't exist
  'missing_part',        // required part number missing
  'negative_sl',         // slNumber < 1
  'epic_too_long',       // EPIC > 20 chars
  'empty_row',           // completely empty row
];

const rows = [];

for (let i = 0; i < TOTAL_ROWS; i++) {
  // ~25% of rows will have errors (rows 4,8,12,16... plus some random)
  const shouldError = (i % 4 === 3) || (i % 17 === 0);

  if (shouldError) {
    const errorType = pick(ERROR_TYPES);
    const row = makeErrorRow(i, errorType);
    rows.push(row);
  } else {
    rows.push(makeValidRow(i));
  }
}

function makeValidRow(i) {
  return {
    'Full Name': `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    'Name (Local)': '',
    'Gender': pick(GENDERS_VALID),
    'Age': rand(18, 85),
    'EPIC Number': randomEpic(),
    'Mobile': randomMobile(),
    'Serial No': i + 1,
    'Part Number': pick(VALID_PARTS),
  };
}

function makeErrorRow(i, errorType) {
  // Start with a valid row, then break it
  const row = makeValidRow(i);

  switch (errorType) {
    case 'missing_name':
      row['Full Name'] = '';
      break;
    case 'short_name':
      row['Full Name'] = 'A'; // only 1 char, needs >= 2
      break;
    case 'invalid_gender':
      row['Gender'] = pick(['UNKNOWN', 'X', 'NONE', 'ABC', '123', 'male123']);
      break;
    case 'age_too_young':
      row['Age'] = rand(1, 17);
      break;
    case 'age_too_old':
      row['Age'] = rand(121, 200);
      break;
    case 'age_not_number':
      row['Age'] = pick(['twenty', 'N/A', 'abc', '??']);
      break;
    case 'invalid_mobile':
      row['Mobile'] = pick(['1234567890', '0987654321', '5555555555', '+919876543210', '12345']);
      break;
    case 'mobile_short':
      row['Mobile'] = String(rand(100000, 999999)); // only 6 digits
      break;
    case 'invalid_part':
      row['Part Number'] = pick([0, 99, 100, 55, -1, 999]);
      break;
    case 'missing_part':
      row['Part Number'] = '';
      break;
    case 'negative_sl':
      row['Serial No'] = pick([-5, -1, 0, -100]);
      break;
    case 'epic_too_long':
      row['EPIC Number'] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'; // way over 20
      break;
    case 'empty_row':
      return {
        'Full Name': '',
        'Name (Local)': '',
        'Gender': '',
        'Age': '',
        'EPIC Number': '',
        'Mobile': '',
        'Serial No': '',
        'Part Number': '',
      };
    default:
      row['Full Name'] = '';
      break;
  }

  return row;
}

// Build Excel
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows);
ws['!cols'] = [
  { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 8 },
  { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
];
XLSX.utils.book_append_sheet(wb, ws, 'Voters');

const outPath = __dirname + '/../test-voter-upload-1000.xlsx';
XLSX.writeFile(wb, outPath);

// Count errors
let errorCount = 0;
rows.forEach(r => {
  const name = r['Full Name'];
  const part = r['Part Number'];
  if (!name || !part) errorCount++;
});

console.log(`Generated ${TOTAL_ROWS} rows -> ${outPath}`);
console.log(`Approximately ${rows.filter((_, i) => (i % 4 === 3) || (i % 17 === 0)).length} rows have intentional errors`);
console.log('Error types spread across: missing name, short name, bad gender, age out of range, bad mobile, invalid part, missing part, negative serial, long EPIC, empty rows');
