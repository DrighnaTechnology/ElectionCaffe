import { PrismaClient } from './packages/database/node_modules/.prisma/tenant-client/index.js';

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:admin@localhost:5333/EC_nitish?schema=public' } },
});

const TENANT_ID = '15f6739c-501d-49e9-a265-44a948343743';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(min + Math.random() * (max - min));
const phone = () => `9${randInt(100000000, 999999999)}`;
const pan = (i) => `${String.fromCharCode(65+randInt(0,26))}${String.fromCharCode(65+randInt(0,26))}CPK${1000+i}${String.fromCharCode(65+randInt(0,26))}`;

const donorFirstNames = [
  'Rajesh','Suresh','Nitish','Priya','Anita','Vikram','Deepak','Sunita','Ramesh','Kavita',
  'Arun','Meena','Sanjay','Pooja','Manoj','Rekha','Ravi','Geeta','Ashok','Neha',
  'Amit','Seema','Vivek','Anjali','Pankaj','Swati','Rahul','Divya','Mohit','Sneha',
  'Gaurav','Shweta','Rohit','Nisha','Karan','Jyoti','Sachin','Rina','Nitin','Sapna',
  'Harsh','Pallavi','Tarun','Komal','Manish','Reema','Sunil','Lata','Ajay','Mona',
];
const donorLastNames = [
  'Kumar','Sharma','Singh','Verma','Gupta','Patel','Jha','Mishra','Yadav','Pandey',
  'Tiwari','Dubey','Chaudhary','Srivastava','Thakur','Mehta','Jain','Agarwal','Chauhan','Saxena',
];
const areas = [
  'Gandhi Nagar','Rajendra Nagar','Nehru Colony','Patel Chowk','Subhash Marg',
  'Laxmi Nagar','Shanti Vihar','Vikas Puri','Janakpuri','Dwarka Sector 10',
  'MG Road','Station Road','Civil Lines','Sadar Bazaar','Old City',
];
const purposes = ['Campaign Support','Rally Expenses','Advertisement','General Fund','Booth Setup','Transport','Printing','Food & Refreshments','Office Supplies','Miscellaneous'];
const paymentModes = ['CASH','UPI','NEFT','CHEQUE','CARD'];

const expenseCategories = ['ADVERTISEMENT','RALLY','TRAVEL','FOOD','PRINTING','OFFICE','TRANSPORT','EQUIPMENT','WAGES','MISC','FUEL','RENT','TELECOM'];
const vendors = [
  'Sri Lakshmi Printers','Kumar Caterers','Arun Travels','Sivam Flex Works',
  'Murugan Transport','Raja Electronics','Anbu Tent House','Star Sound Systems',
  'National Printers','Fast Track Logistics','Digital Media House','City Fuel Station',
  'Metro Office Supplies','Singh Electrical','Sharma Construction','Patel Foods',
  'Quick Print Solutions','Royal Caterers','Express Courier','Tech Solutions India',
];
const expenseDescs = {
  ADVERTISEMENT: ['Facebook ad campaign','Newspaper advertisement','TV spot booking','Banner printing','Pamphlet distribution','LED screen rental','Radio jingle production'],
  RALLY: ['Rally stage setup','Sound system rental','Rally decoration','Rally refreshments','Rally transport arrangement','Rally security arrangement'],
  TRAVEL: ['Vehicle fuel for campaign','Driver salary','Toll charges','Vehicle maintenance','Flight booking for leader'],
  FOOD: ['Volunteer meals','Event catering','Tea and snacks for booth','Campaign dinner','Water bottles for rally'],
  PRINTING: ['Voter slip printing','Pamphlet printing 5000 copies','Poster printing','ID card printing','Manifesto booklet printing'],
  OFFICE: ['Office rent','Electricity bill','Internet bill','Office supplies','Furniture rental'],
  TRANSPORT: ['Bus rental for workers','Auto rickshaw charges','Tempo rental','Truck for materials','Vehicle hire for polling day'],
  EQUIPMENT: ['Mic and speaker purchase','Generator rental','Laptop purchase','Projector rental','Camera equipment'],
  WAGES: ['Volunteer stipend','Security guard salary','Office staff salary','Driver wages','Helper wages'],
  MISC: ['Miscellaneous campaign expense','Emergency expense','Contingency fund usage','Repair and maintenance','Gift items'],
  FUEL: ['Diesel for generator','Petrol for campaign vehicles','CNG refill','Fuel for transport fleet'],
  RENT: ['Venue rental for meeting','Godown rent','Office space rent','Stage rental','Tent house rental'],
  TELECOM: ['Mobile recharge for workers','Bulk SMS charges','WhatsApp business subscription','Internet data packs','Landline bill'],
};

async function main() {
  console.log('Checking accounts...');

  // First ensure accounts exist
  let accounts = await prisma.fundAccount.findMany({ where: { tenantId: TENANT_ID } });

  if (accounts.length === 0) {
    console.log('Creating fund accounts...');
    await prisma.fundAccount.createMany({
      data: [
        { id: 'fund-main', tenantId: TENANT_ID, accountName: 'Main Campaign Fund', accountType: 'BANK', bankName: 'Indian Bank', accountNumber: '1234567890', ifscCode: 'IDIB000K001', currentBalance: 500000, isDefault: true, isActive: true },
        { id: 'fund-donations', tenantId: TENANT_ID, accountName: 'Donations Account', accountType: 'BANK', bankName: 'SBI', accountNumber: '0987654321', ifscCode: 'SBIN0001234', currentBalance: 250000, isDefault: false, isActive: true },
        { id: 'fund-petty', tenantId: TENANT_ID, accountName: 'Petty Cash', accountType: 'CASH', currentBalance: 50000, isDefault: false, isActive: true },
      ],
    });
    accounts = await prisma.fundAccount.findMany({ where: { tenantId: TENANT_ID } });
  }

  console.log(`Found ${accounts.length} accounts`);
  const accountIds = accounts.map(a => a.id);

  // Clear existing data
  console.log('Clearing old donations & expenses...');
  await prisma.fundTransaction.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.fundDonation.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.fundExpense.deleteMany({ where: { tenantId: TENANT_ID } });

  // --- SEED 300 DONATIONS ---
  console.log('Seeding 300 donations...');
  const donations = [];
  let totalDonated = 0;

  for (let i = 0; i < 300; i++) {
    const firstName = pick(donorFirstNames);
    const lastName = pick(donorLastNames);
    const amount = randInt(500, 100000);
    const daysAgo = randInt(0, 180); // spread across 6 months
    const isAnon = Math.random() > 0.95;
    const acctId = Math.random() > 0.6 ? 'fund-donations' : 'fund-main';

    totalDonated += amount;
    donations.push({
      tenantId: TENANT_ID,
      accountId: acctId,
      donorName: `${firstName} ${lastName}`,
      donorContact: phone(),
      donorEmail: Math.random() > 0.4 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@gmail.com` : null,
      donorAddress: Math.random() > 0.3 ? `${randInt(1,500)}, ${pick(areas)}` : null,
      donorPan: Math.random() > 0.5 ? pan(i) : null,
      amount,
      paymentMode: pick(paymentModes),
      paymentRef: Math.random() > 0.3 ? `TXN${Date.now()}${i}` : null,
      donationDate: new Date(Date.now() - daysAgo * 86400000),
      receiptNo: `RCP2025${String(i + 1).padStart(5, '0')}`,
      isAnonymous: isAnon,
      purpose: pick(purposes),
      remarks: Math.random() > 0.7 ? 'Regular supporter' : null,
      createdBy: null,
    });
  }

  await prisma.fundDonation.createMany({ data: donations });
  console.log(`Created 300 donations, total: ₹${totalDonated.toLocaleString()}`);

  // --- SEED 100 EXPENSES ---
  console.log('Seeding 100 expenses...');
  const expenses = [];
  let totalSpent = 0;

  for (let i = 0; i < 100; i++) {
    const cat = pick(expenseCategories);
    const amount = randInt(500, 200000);
    const daysAgo = randInt(0, 180);
    const status = Math.random() > 0.15 ? 'approved' : (Math.random() > 0.5 ? 'pending' : 'rejected');
    const acctId = Math.random() > 0.3 ? 'fund-main' : 'fund-petty';

    if (status === 'approved') totalSpent += amount;

    expenses.push({
      tenantId: TENANT_ID,
      accountId: acctId,
      category: cat,
      description: pick(expenseDescs[cat] || expenseDescs.MISC),
      amount,
      paymentMode: pick(paymentModes),
      paymentRef: Math.random() > 0.4 ? `EXP${Date.now()}${i}` : null,
      expenseDate: new Date(Date.now() - daysAgo * 86400000),
      vendorName: pick(vendors),
      vendorContact: phone(),
      invoiceNo: `INV2025${String(i + 1).padStart(5, '0')}`,
      attachments: [],
      status,
      approvedBy: status === 'approved' ? null : null,
      approvedAt: status === 'approved' ? new Date(Date.now() - daysAgo * 86400000 + 86400000) : null,
      createdBy: null,
    });
  }

  await prisma.fundExpense.createMany({ data: expenses });
  console.log(`Created 100 expenses, approved total: ₹${totalSpent.toLocaleString()}`);

  // Update account balances
  const mainDonations = donations.filter(d => d.accountId === 'fund-main').reduce((s, d) => s + d.amount, 0);
  const donAccDonations = donations.filter(d => d.accountId === 'fund-donations').reduce((s, d) => s + d.amount, 0);
  const mainExpenses = expenses.filter(e => e.accountId === 'fund-main' && e.status === 'approved').reduce((s, e) => s + e.amount, 0);
  const pettyExpenses = expenses.filter(e => e.accountId === 'fund-petty' && e.status === 'approved').reduce((s, e) => s + e.amount, 0);

  await prisma.fundAccount.update({ where: { id: 'fund-main' }, data: { currentBalance: 500000 + mainDonations - mainExpenses } });
  await prisma.fundAccount.update({ where: { id: 'fund-donations' }, data: { currentBalance: 250000 + donAccDonations } });
  await prisma.fundAccount.update({ where: { id: 'fund-petty' }, data: { currentBalance: Math.max(0, 50000 - pettyExpenses) } });

  // Create summary transaction records
  await prisma.fundTransaction.create({
    data: { tenantId: TENANT_ID, accountId: 'fund-main', transactionType: 'DONATION', amount: mainDonations, balanceAfter: 500000 + mainDonations - mainExpenses, description: 'Seed: 300 donations + 100 expenses' },
  });

  const finalAccounts = await prisma.fundAccount.findMany({ where: { tenantId: TENANT_ID }, select: { accountName: true, currentBalance: true } });
  console.log('\nFinal balances:');
  finalAccounts.forEach(a => console.log(`  ${a.accountName}: ₹${Number(a.currentBalance).toLocaleString()}`));

  console.log('\nDone! 300 donations + 100 expenses seeded.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
