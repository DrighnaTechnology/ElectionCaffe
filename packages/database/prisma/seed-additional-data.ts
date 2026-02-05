/**
 * Comprehensive Additional Data Seed Script
 *
 * This script adds interconnected data for each tenant:
 * - Cadres with assignments and location tracking
 * - Parties and political alliances
 * - Castes and sub-castes with religion links
 * - Surveys with voter responses
 * - Feedback issues linked to voters
 * - Party events with attendees and tasks
 * - Fund accounts, donations, and expenses
 * - Inventory items and allocations
 * - News, broadcasts, and speech points
 * - Internal notifications and chat
 * - AI credits and analytics results
 * - Links voters to master data (religion, caste, party, category)
 */

import { PrismaClient as TenantPrismaClient } from '../node_modules/.prisma/tenant-client/index.js';
import { Decimal } from '@prisma/client/runtime/library';

// Tenant configurations
interface TenantConfig {
  slug: string;
  name: string;
  state: string;
  databaseUrl: string;
  partyName: string;
  partyShortName: string;
  partyColor: string;
  allianceName: string;
  oppositionParties: { name: string; shortName: string; color: string }[];
}

const TENANTS: TenantConfig[] = [
  {
    slug: 'bjp-tn',
    name: 'BJP Tamil Nadu',
    state: 'Tamil Nadu',
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/EC_BJP_TN?schema=public',
    partyName: 'Bharatiya Janata Party',
    partyShortName: 'BJP',
    partyColor: '#FF9933',
    allianceName: 'NDA',
    oppositionParties: [
      { name: 'Dravida Munnetra Kazhagam', shortName: 'DMK', color: '#FF0000' },
      { name: 'Indian National Congress', shortName: 'INC', color: '#00BFFF' },
      { name: 'All India Anna Dravida Munnetra Kazhagam', shortName: 'AIADMK', color: '#008000' },
    ],
  },
  {
    slug: 'bjp-up',
    name: 'BJP Uttar Pradesh',
    state: 'Uttar Pradesh',
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/EC_BJP_UP?schema=public',
    partyName: 'Bharatiya Janata Party',
    partyShortName: 'BJP',
    partyColor: '#FF9933',
    allianceName: 'NDA',
    oppositionParties: [
      { name: 'Samajwadi Party', shortName: 'SP', color: '#FF0000' },
      { name: 'Bahujan Samaj Party', shortName: 'BSP', color: '#0000FF' },
      { name: 'Indian National Congress', shortName: 'INC', color: '#00BFFF' },
    ],
  },
  {
    slug: 'aidmk-tn',
    name: 'AIDMK Tamil Nadu',
    state: 'Tamil Nadu',
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/EC_AIDMK_TN?schema=public',
    partyName: 'All India Anna Dravida Munnetra Kazhagam',
    partyShortName: 'AIADMK',
    partyColor: '#008000',
    allianceName: 'AIADMK Alliance',
    oppositionParties: [
      { name: 'Dravida Munnetra Kazhagam', shortName: 'DMK', color: '#FF0000' },
      { name: 'Bharatiya Janata Party', shortName: 'BJP', color: '#FF9933' },
      { name: 'Indian National Congress', shortName: 'INC', color: '#00BFFF' },
    ],
  },
];

// Helper functions
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(startDate: Date, endDate: Date): Date {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return new Date(start + Math.random() * (end - start));
}

function generatePhone(): string {
  const prefixes = ['70', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
  const prefix = getRandomElement(prefixes);
  const number = Math.floor(10000000 + Math.random() * 90000000).toString();
  return prefix + number;
}

// State-specific caste data
const CASTE_DATA = {
  'Tamil Nadu': {
    castes: [
      { category: 'General', castes: ['Brahmin', 'Mudaliar', 'Chettiar', 'Naicker'] },
      { category: 'OBC', castes: ['Vanniyar', 'Thevar', 'Gounder', 'Nadar', 'Yadav'] },
      { category: 'SC', castes: ['Paraiyar', 'Pallar', 'Arunthathiyar', 'Chakkiliar'] },
      { category: 'ST', castes: ['Irular', 'Kurumba', 'Toda', 'Kota'] },
    ],
  },
  'Uttar Pradesh': {
    castes: [
      { category: 'General', castes: ['Brahmin', 'Rajput', 'Bania', 'Kayastha'] },
      { category: 'OBC', castes: ['Yadav', 'Kurmi', 'Jat', 'Lodh', 'Saini'] },
      { category: 'SC', castes: ['Chamar', 'Pasi', 'Dhobi', 'Valmiki'] },
      { category: 'ST', castes: ['Tharu', 'Bhotia', 'Buksa', 'Raji'] },
    ],
  },
};

// Seed functions
async function seedPartiesData(prisma: TenantPrismaClient, config: TenantConfig, electionId: string) {
  console.log('  Creating parties...');

  // Main party (candidate's party)
  const mainParty = await prisma.party.create({
    data: {
      electionId,
      partyName: config.partyName,
      partyShortName: config.partyShortName,
      partyFullName: config.partyName,
      allianceName: config.allianceName,
      partyColor: config.partyColor,
      isDefault: true,
      displayOrder: 1,
    },
  });

  // Opposition parties
  let order = 2;
  for (const opp of config.oppositionParties) {
    await prisma.party.create({
      data: {
        electionId,
        partyName: opp.name,
        partyShortName: opp.shortName,
        partyColor: opp.color,
        displayOrder: order++,
      },
    });
  }

  // Neutral/Independent
  await prisma.party.create({
    data: {
      electionId,
      partyName: 'Independent',
      partyShortName: 'IND',
      partyColor: '#808080',
      isNeutral: true,
      displayOrder: order,
    },
  });

  console.log(`  ✓ ${config.oppositionParties.length + 2} parties created`);
  return mainParty.id;
}

async function seedCastesData(prisma: TenantPrismaClient, config: TenantConfig, electionId: string) {
  console.log('  Creating castes and sub-castes...');

  const stateData = CASTE_DATA[config.state as keyof typeof CASTE_DATA];
  if (!stateData) return;

  // Get religions
  const religions = await prisma.religion.findMany({ where: { electionId } });
  const hinduReligion = religions.find(r => r.religionName === 'Hindu');

  // Get caste categories
  const categories = await prisma.casteCategory.findMany({ where: { electionId } });

  let casteCount = 0;
  for (const catData of stateData.castes) {
    const category = categories.find(c => c.categoryName === catData.category);
    if (!category) continue;

    for (const casteName of catData.castes) {
      const caste = await prisma.caste.create({
        data: {
          electionId,
          casteCategoryId: category.id,
          religionId: hinduReligion?.id,
          casteName,
          casteNameLocal: casteName,
          displayOrder: casteCount++,
        },
      });

      // Create 2-3 sub-castes for each caste
      const subCasteCount = getRandomInt(2, 3);
      for (let i = 1; i <= subCasteCount; i++) {
        await prisma.subCaste.create({
          data: {
            electionId,
            casteId: caste.id,
            subCasteName: `${casteName} ${i}`,
          },
        });
      }
    }
  }

  console.log(`  ✓ ${casteCount} castes with sub-castes created`);
}

async function seedCadresData(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string, electionId: string) {
  console.log('  Creating cadres with assignments...');

  // Get users (excluding admin)
  const users = await prisma.user.findMany({
    where: { tenantId },
    take: 50,
  });

  // Get parts for assignment
  const parts = await prisma.part.findMany({ where: { electionId }, take: 20 });
  const booths = await prisma.booth.findMany({ where: { electionId }, take: 40 });

  const cadreTypes = ['BOOTH_INCHARGE', 'SECTOR_OFFICER', 'COORDINATOR', 'VOLUNTEER'];
  const designations = ['Booth President', 'Sector Coordinator', 'Area Incharge', 'Field Worker'];

  let cadreCount = 0;
  for (const user of users.slice(3)) { // Skip first 3 (admin users)
    const cadreType = getRandomElement(cadreTypes);
    const designation = getRandomElement(designations);

    const cadre = await prisma.cadre.create({
      data: {
        userId: user.id,
        electionId,
        cadreType,
        designation,
        zone: `Zone ${getRandomInt(1, 5)}`,
        sector: `Sector ${getRandomInt(1, 10)}`,
        assignedParts: parts.slice(0, getRandomInt(1, 3)).map(p => p.id),
        assignedBooths: booths.slice(0, getRandomInt(1, 5)).map(b => b.id),
        targetVoters: getRandomInt(500, 2000),
        isActive: Math.random() > 0.1,
      },
    });

    // Create assignment
    if (parts.length > 0) {
      await prisma.cadreAssignment.create({
        data: {
          cadreId: cadre.id,
          assignmentType: 'PART_ASSIGNMENT',
          entityId: getRandomElement(parts).id,
          entityType: 'PART',
          startDate: new Date('2024-01-01'),
          isActive: true,
        },
      });
    }

    // Create some location records
    for (let i = 0; i < getRandomInt(3, 10); i++) {
      await prisma.cadreLocation.create({
        data: {
          cadreId: cadre.id,
          latitude: 12.9 + Math.random() * 0.5,
          longitude: 77.5 + Math.random() * 0.5,
          accuracy: getRandomInt(5, 50),
          timestamp: getRandomDate(new Date('2024-01-01'), new Date()),
        },
      });
    }

    cadreCount++;
  }

  console.log(`  ✓ ${cadreCount} cadres created with assignments and locations`);
}

async function seedSurveysData(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string, electionId: string) {
  console.log('  Creating surveys with responses...');

  const surveys = [
    {
      title: 'Voter Sentiment Survey',
      titleLocal: config.state === 'Tamil Nadu' ? 'வாக்காளர் கருத்து கணிப்பு' : 'मतदाता भावना सर्वेक्षण',
      description: 'Understanding voter preferences and concerns',
      questions: [
        { id: 'q1', type: 'rating', question: 'Rate the current government performance', options: [1, 2, 3, 4, 5] },
        { id: 'q2', type: 'choice', question: 'Most important issue', options: ['Jobs', 'Infrastructure', 'Healthcare', 'Education'] },
        { id: 'q3', type: 'yesno', question: 'Will you vote for our candidate?', options: ['Yes', 'No', 'Undecided'] },
      ],
    },
    {
      title: 'Development Feedback Survey',
      titleLocal: config.state === 'Tamil Nadu' ? 'வளர்ச்சி கருத்து கணிப்பு' : 'विकास प्रतिक्रिया सर्वेक्षण',
      description: 'Feedback on local development projects',
      questions: [
        { id: 'q1', type: 'rating', question: 'Road condition in your area', options: [1, 2, 3, 4, 5] },
        { id: 'q2', type: 'rating', question: 'Water supply quality', options: [1, 2, 3, 4, 5] },
        { id: 'q3', type: 'text', question: 'What development do you need most?' },
      ],
    },
    {
      title: 'Campaign Effectiveness Survey',
      titleLocal: config.state === 'Tamil Nadu' ? 'பிரச்சார திறன் கணிப்பு' : 'अभियान प्रभावशीलता सर्वेक्षण',
      description: 'Measuring campaign reach and impact',
      questions: [
        { id: 'q1', type: 'yesno', question: 'Have you seen our campaign ads?', options: ['Yes', 'No'] },
        { id: 'q2', type: 'choice', question: 'How did you hear about us?', options: ['TV', 'Social Media', 'Newspaper', 'Rally', 'Door-to-door'] },
        { id: 'q3', type: 'rating', question: 'Rate our campaign message', options: [1, 2, 3, 4, 5] },
      ],
    },
  ];

  // Get some voters for responses
  const voters = await prisma.voter.findMany({ where: { electionId }, take: 1000 });

  for (const surveyData of surveys) {
    const survey = await prisma.survey.create({
      data: {
        electionId,
        title: surveyData.title,
        titleLocal: surveyData.titleLocal,
        description: surveyData.description,
        questions: surveyData.questions,
        targetAudience: { all: true },
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        isActive: true,
        totalResponses: 0,
      },
    });

    // Create 100-200 responses per survey
    const responseCount = getRandomInt(100, 200);
    const selectedVoters = voters.sort(() => Math.random() - 0.5).slice(0, responseCount);

    for (const voter of selectedVoters) {
      const answers: Record<string, any> = {};
      for (const q of surveyData.questions) {
        if (q.type === 'rating') {
          answers[q.id] = getRandomInt(1, 5);
        } else if (q.type === 'choice' || q.type === 'yesno') {
          answers[q.id] = getRandomElement(q.options as string[]);
        } else {
          answers[q.id] = 'Sample response text';
        }
      }

      await prisma.surveyResponse.create({
        data: {
          surveyId: survey.id,
          voterId: voter.id,
          answers,
          latitude: 12.9 + Math.random() * 0.5,
          longitude: 77.5 + Math.random() * 0.5,
          submittedAt: getRandomDate(new Date('2024-01-01'), new Date()),
        },
      });
    }

    // Update total responses
    await prisma.survey.update({
      where: { id: survey.id },
      data: { totalResponses: responseCount },
    });
  }

  console.log(`  ✓ ${surveys.length} surveys created with responses`);
}

async function seedFeedbackIssues(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string, electionId: string) {
  console.log('  Creating feedback issues...');

  const issueTypes = ['COMPLAINT', 'SUGGESTION', 'REQUEST', 'GRIEVANCE'];
  const categories = ['Infrastructure', 'Water Supply', 'Electricity', 'Roads', 'Sanitation', 'Healthcare', 'Education'];
  const priorities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['open', 'in_progress', 'resolved', 'closed'];

  const voters = await prisma.voter.findMany({ where: { electionId }, take: 500 });

  const issueCount = getRandomInt(50, 100);
  for (let i = 0; i < issueCount; i++) {
    const voter = getRandomElement(voters);
    const status = getRandomElement(statuses);

    await prisma.feedbackIssue.create({
      data: {
        tenantId,
        voterId: voter.id,
        issueType: getRandomElement(issueTypes),
        category: getRandomElement(categories),
        title: `Issue regarding ${getRandomElement(categories).toLowerCase()}`,
        description: `Detailed description of the issue reported by voter ${voter.name}`,
        priority: getRandomElement(priorities),
        status,
        resolvedAt: status === 'resolved' || status === 'closed' ? getRandomDate(new Date('2024-01-01'), new Date()) : null,
        resolution: status === 'resolved' ? 'Issue has been addressed and resolved' : null,
        latitude: 12.9 + Math.random() * 0.5,
        longitude: 77.5 + Math.random() * 0.5,
        createdAt: getRandomDate(new Date('2024-01-01'), new Date()),
      },
    });
  }

  console.log(`  ✓ ${issueCount} feedback issues created`);
}

async function seedPartyEvents(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string, electionId: string) {
  console.log('  Creating party events...');

  const eventTypes = ['RALLY', 'MEETING', 'PADYATRA', 'CORNER_MEETING', 'PRESS_CONFERENCE', 'CULTURAL_EVENT'];
  const venues = config.state === 'Tamil Nadu'
    ? ['Chennai Trade Centre', 'Island Grounds', 'YMCA Grounds', 'Nehru Stadium', 'Marina Beach']
    : ['Lucknow Maidan', 'Ramabai Ambedkar Maidan', 'Gandhi Maidan', 'Eco Garden', 'Janpath'];

  const users = await prisma.user.findMany({ where: { tenantId }, take: 10 });

  const events = [
    { title: 'Grand Public Rally', type: 'RALLY', attendees: 5000 },
    { title: 'Workers Meeting', type: 'MEETING', attendees: 500 },
    { title: 'Door-to-Door Campaign', type: 'PADYATRA', attendees: 100 },
    { title: 'Youth Wing Conference', type: 'MEETING', attendees: 300 },
    { title: 'Women Empowerment Event', type: 'CULTURAL_EVENT', attendees: 400 },
    { title: 'Press Conference', type: 'PRESS_CONFERENCE', attendees: 50 },
    { title: 'Manifesto Launch', type: 'MEETING', attendees: 1000 },
    { title: 'Victory Rally', type: 'RALLY', attendees: 10000 },
  ];

  for (const eventData of events) {
    const startDate = getRandomDate(new Date('2024-01-01'), new Date('2024-06-30'));
    const venue = getRandomElement(venues);

    const event = await prisma.partyEvent.create({
      data: {
        tenantId,
        electionId,
        title: eventData.title,
        titleLocal: eventData.title,
        description: `${eventData.title} organized for the upcoming elections`,
        eventType: eventData.type,
        startDate,
        endDate: new Date(startDate.getTime() + 4 * 60 * 60 * 1000), // 4 hours later
        venue,
        address: `${venue}, ${config.state}`,
        city: config.state === 'Tamil Nadu' ? 'Chennai' : 'Lucknow',
        state: config.state,
        latitude: 12.9 + Math.random() * 0.5,
        longitude: 77.5 + Math.random() * 0.5,
        expectedAttendees: eventData.attendees,
        actualAttendees: Math.floor(eventData.attendees * (0.8 + Math.random() * 0.4)),
        speakers: [{ name: 'Party President', designation: 'State President' }],
        chiefGuest: 'Hon. Party Leader',
        isPublic: true,
        status: startDate < new Date() ? 'COMPLETED' : 'SCHEDULED',
        estimatedBudget: new Decimal(eventData.attendees * 100),
        actualBudget: new Decimal(eventData.attendees * 95),
      },
    });

    // Add attendees
    const attendeeCount = Math.min(eventData.attendees, 50);
    for (let i = 0; i < attendeeCount; i++) {
      await prisma.eventAttendee.create({
        data: {
          eventId: event.id,
          userId: i < users.length ? users[i].id : null,
          name: `Attendee ${i + 1}`,
          phone: generatePhone(),
          role: i < 5 ? 'organizer' : 'attendee',
          status: Math.random() > 0.2 ? 'attended' : 'registered',
          checkedInAt: Math.random() > 0.3 ? startDate : null,
        },
      });
    }

    // Add tasks
    const tasks = ['Arrange chairs', 'Setup stage', 'Coordinate volunteers', 'Media management', 'Security arrangement'];
    for (const taskTitle of tasks) {
      await prisma.eventTask.create({
        data: {
          eventId: event.id,
          title: taskTitle,
          description: `${taskTitle} for the event`,
          assignedTo: users.length > 0 ? getRandomElement(users).id : null,
          assignedToName: 'Assigned Person',
          dueDate: new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
          priority: getRandomElement(['low', 'medium', 'high']),
          status: startDate < new Date() ? 'completed' : 'pending',
        },
      });
    }
  }

  console.log(`  ✓ ${events.length} party events created with attendees and tasks`);
}

async function seedFundManagement(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string) {
  console.log('  Creating fund accounts and transactions...');

  // Create accounts
  const accounts = [
    { name: 'Main Campaign Account', type: 'CAMPAIGN', bank: 'State Bank of India' },
    { name: 'Donation Account', type: 'DONATION', bank: 'HDFC Bank' },
    { name: 'Petty Cash', type: 'CASH', bank: null },
  ];

  const createdAccounts: string[] = [];
  for (const acc of accounts) {
    const account = await prisma.fundAccount.create({
      data: {
        tenantId,
        accountName: acc.name,
        accountType: acc.type,
        bankName: acc.bank,
        accountNumber: acc.bank ? Math.random().toString().slice(2, 14) : null,
        ifscCode: acc.bank ? 'SBIN0001234' : null,
        currentBalance: new Decimal(getRandomInt(100000, 1000000)),
        isDefault: acc.type === 'CAMPAIGN',
      },
    });
    createdAccounts.push(account.id);
  }

  // Create donations
  const donorNames = ['Ramesh Kumar', 'Priya Sharma', 'Venkat Rao', 'Lakshmi Devi', 'Rajesh Singh'];
  const donationCount = getRandomInt(20, 50);
  for (let i = 0; i < donationCount; i++) {
    const amount = new Decimal(getRandomInt(1000, 50000));
    const donation = await prisma.fundDonation.create({
      data: {
        tenantId,
        accountId: createdAccounts[1], // Donation account
        donorName: getRandomElement(donorNames),
        donorContact: generatePhone(),
        donorEmail: `donor${i}@example.com`,
        amount,
        paymentMode: getRandomElement(['CASH', 'CHEQUE', 'UPI', 'BANK_TRANSFER']),
        donationDate: getRandomDate(new Date('2024-01-01'), new Date()),
        receiptNo: `DON-${Date.now()}-${i}`,
        purpose: 'Campaign contribution',
      },
    });

    // Create transaction
    await prisma.fundTransaction.create({
      data: {
        tenantId,
        accountId: createdAccounts[1],
        transactionType: 'DONATION',
        amount,
        balanceAfter: new Decimal(getRandomInt(100000, 1000000)),
        description: `Donation from ${getRandomElement(donorNames)}`,
        referenceType: 'DONATION',
        referenceId: donation.id,
      },
    });
  }

  // Create expenses
  const expenseCategories = ['Travel', 'Printing', 'Advertisement', 'Event Management', 'Office Supplies', 'Fuel'];
  const expenseCount = getRandomInt(30, 60);
  for (let i = 0; i < expenseCount; i++) {
    const amount = new Decimal(getRandomInt(500, 20000));
    const expense = await prisma.fundExpense.create({
      data: {
        tenantId,
        accountId: createdAccounts[0], // Campaign account
        category: getRandomElement(expenseCategories),
        description: `${getRandomElement(expenseCategories)} expense`,
        amount,
        paymentMode: getRandomElement(['CASH', 'CHEQUE', 'UPI', 'BANK_TRANSFER']),
        expenseDate: getRandomDate(new Date('2024-01-01'), new Date()),
        vendorName: `Vendor ${i + 1}`,
        status: getRandomElement(['approved', 'pending', 'rejected']),
      },
    });

    // Create transaction
    await prisma.fundTransaction.create({
      data: {
        tenantId,
        accountId: createdAccounts[0],
        transactionType: 'EXPENSE',
        amount: amount.negated(),
        balanceAfter: new Decimal(getRandomInt(50000, 500000)),
        description: expense.description,
        referenceType: 'EXPENSE',
        referenceId: expense.id,
      },
    });
  }

  console.log(`  ✓ ${accounts.length} accounts, ${donationCount} donations, ${expenseCount} expenses created`);
}

async function seedInventoryData(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string, electionId: string) {
  console.log('  Creating inventory items and allocations...');

  // Create categories
  const categories = [
    { name: 'Campaign Materials', description: 'Banners, posters, flags' },
    { name: 'Office Supplies', description: 'Stationery and office items' },
    { name: 'Electronics', description: 'Phones, speakers, projectors' },
    { name: 'Vehicles', description: 'Campaign vehicles' },
  ];

  const categoryIds: Record<string, string> = {};
  for (const cat of categories) {
    const category = await prisma.inventoryCategory.create({
      data: {
        tenantId,
        name: cat.name,
        description: cat.description,
      },
    });
    categoryIds[cat.name] = category.id;
  }

  // Create items
  const items = [
    { name: 'Party Flags', category: 'Campaign Materials', quantity: 5000, unit: 'pcs', cost: 50 },
    { name: 'Banners (Large)', category: 'Campaign Materials', quantity: 200, unit: 'pcs', cost: 500 },
    { name: 'Posters', category: 'Campaign Materials', quantity: 10000, unit: 'pcs', cost: 10 },
    { name: 'Pamphlets', category: 'Campaign Materials', quantity: 50000, unit: 'pcs', cost: 2 },
    { name: 'T-Shirts', category: 'Campaign Materials', quantity: 2000, unit: 'pcs', cost: 200 },
    { name: 'Caps', category: 'Campaign Materials', quantity: 3000, unit: 'pcs', cost: 100 },
    { name: 'Loudspeakers', category: 'Electronics', quantity: 20, unit: 'pcs', cost: 5000 },
    { name: 'Microphones', category: 'Electronics', quantity: 30, unit: 'pcs', cost: 2000 },
    { name: 'Projectors', category: 'Electronics', quantity: 5, unit: 'pcs', cost: 25000 },
    { name: 'Tablets', category: 'Electronics', quantity: 50, unit: 'pcs', cost: 15000 },
    { name: 'Chairs', category: 'Office Supplies', quantity: 500, unit: 'pcs', cost: 500 },
    { name: 'Tables', category: 'Office Supplies', quantity: 100, unit: 'pcs', cost: 2000 },
  ];

  const itemIds: string[] = [];
  for (const item of items) {
    const createdItem = await prisma.inventoryItem.create({
      data: {
        tenantId,
        categoryId: categoryIds[item.category],
        name: item.name,
        sku: `SKU-${item.name.replace(/\s+/g, '-').toUpperCase()}-001`,
        unit: item.unit,
        quantity: item.quantity,
        minStock: Math.floor(item.quantity * 0.1),
        costPrice: new Decimal(item.cost),
      },
    });
    itemIds.push(createdItem.id);

    // Create initial stock movement
    await prisma.inventoryMovement.create({
      data: {
        tenantId,
        itemId: createdItem.id,
        movementType: 'IN',
        quantity: item.quantity,
        previousQuantity: 0,
        newQuantity: item.quantity,
        reason: 'Initial stock',
      },
    });
  }

  // Create allocations
  const allocationCount = getRandomInt(20, 40);
  for (let i = 0; i < allocationCount; i++) {
    const itemId = getRandomElement(itemIds);
    const quantity = getRandomInt(5, 50);

    await prisma.inventoryAllocation.create({
      data: {
        tenantId,
        itemId,
        electionId,
        allocatedToName: `Team ${getRandomInt(1, 10)}`,
        quantity,
        status: getRandomElement(['allocated', 'returned', 'consumed']),
        allocatedAt: getRandomDate(new Date('2024-01-01'), new Date()),
      },
    });
  }

  console.log(`  ✓ ${categories.length} categories, ${items.length} items, ${allocationCount} allocations created`);
}

async function seedNewsBroadcast(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string) {
  console.log('  Creating news, broadcasts, and speech points...');

  // News articles
  const newsTopics = [
    'Government announces new welfare scheme',
    'Opposition criticizes policy decision',
    'Election commission announces poll dates',
    'Local development project inaugurated',
    'Youth employment scheme launched',
  ];

  for (const topic of newsTopics) {
    const news = await prisma.nBParsedNews.create({
      data: {
        tenantId,
        title: topic,
        content: `Detailed news content about: ${topic}. This is a comprehensive coverage of the event.`,
        summary: `Brief summary of: ${topic}`,
        source: getRandomElement(['Times of India', 'The Hindu', 'Indian Express', 'NDTV']),
        publishedAt: getRandomDate(new Date('2024-01-01'), new Date()),
        language: config.state === 'Tamil Nadu' ? 'Tamil' : 'Hindi',
        category: getRandomElement(['Politics', 'Development', 'Social', 'Economy']),
        sentiment: getRandomElement(['positive', 'negative', 'neutral']),
        relevanceScore: Math.random(),
        isProcessed: true,
      },
    });

    // Add analysis
    await prisma.nBNewsAnalysis.create({
      data: {
        tenantId,
        newsId: news.id,
        analysisType: 'SENTIMENT',
        analysis: { sentiment: 'positive', confidence: 0.85, keywords: ['development', 'progress'] },
        confidence: 0.85,
      },
    });
  }

  // Party lines
  const partyLineTopics = ['Economic Policy', 'Social Welfare', 'Infrastructure', 'Education', 'Healthcare'];
  for (const topic of partyLineTopics) {
    await prisma.nBPartyLine.create({
      data: {
        tenantId,
        topic,
        partyLine: `Our party's stance on ${topic} is focused on people-centric development.`,
        talkingPoints: [
          `Point 1 about ${topic}`,
          `Point 2 about ${topic}`,
          `Point 3 about ${topic}`,
        ],
        counterPoints: [`Counter argument for opposition on ${topic}`],
        isActive: true,
      },
    });
  }

  // Speech points
  const speechCategories = ['Opening', 'Development', 'Welfare', 'Closing'];
  for (const category of speechCategories) {
    await prisma.nBSpeechPoint.create({
      data: {
        tenantId,
        category,
        title: `${category} Speech Point`,
        content: `Sample speech content for ${category.toLowerCase()} section of the campaign speech.`,
        language: config.state === 'Tamil Nadu' ? 'Tamil' : 'Hindi',
        targetAudience: 'General Public',
        tags: [category.toLowerCase(), 'campaign'],
      },
    });
  }

  // Campaign speeches
  const speechTypes = ['RALLY_SPEECH', 'CORNER_MEETING', 'TV_ADDRESS', 'RADIO_SPEECH'];
  for (const speechType of speechTypes) {
    await prisma.nBCampaignSpeech.create({
      data: {
        tenantId,
        title: `${speechType.replace('_', ' ')} Template`,
        speechType,
        content: `Full speech content for ${speechType.toLowerCase()}. This includes opening, main points, and closing remarks.`,
        language: config.state === 'Tamil Nadu' ? 'Tamil' : 'Hindi',
        duration: getRandomInt(10, 30),
        targetAudience: 'General Public',
        tags: [speechType.toLowerCase()],
      },
    });
  }

  // Broadcasts
  const broadcastTypes = ['SMS', 'WHATSAPP', 'EMAIL', 'APP_NOTIFICATION'];
  for (const broadcastType of broadcastTypes) {
    await prisma.nBBroadcast.create({
      data: {
        tenantId,
        title: `${broadcastType} Campaign Message`,
        content: `Important campaign update for ${broadcastType}. Please participate in our upcoming rally.`,
        broadcastType,
        targetAudience: { all: true },
        channels: [broadcastType.toLowerCase()],
        status: getRandomElement(['draft', 'scheduled', 'sent']),
        recipientCount: getRandomInt(1000, 10000),
        deliveredCount: getRandomInt(800, 9000),
      },
    });
  }

  console.log(`  ✓ News, party lines, speeches, and broadcasts created`);
}

async function seedNotificationsChat(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string) {
  console.log('  Creating notifications and chat...');

  const users = await prisma.user.findMany({ where: { tenantId }, take: 10 });
  if (users.length < 2) return;

  // Internal notifications
  const notificationTypes = ['ANNOUNCEMENT', 'TASK', 'REMINDER', 'ALERT'];
  for (let i = 0; i < 10; i++) {
    const notification = await prisma.internalNotification.create({
      data: {
        tenantId,
        title: `Notification ${i + 1}`,
        message: `Important message for all team members. Please read and acknowledge.`,
        notificationType: getRandomElement(notificationTypes),
        priority: getRandomElement(['low', 'normal', 'high', 'urgent']),
        targetAudience: 'all',
        targetRoles: ['COORDINATOR', 'VOLUNTEER'],
        status: getRandomElement(['DRAFT', 'SENT']),
        totalRecipients: users.length,
        deliveredCount: Math.floor(users.length * 0.9),
        readCount: Math.floor(users.length * 0.7),
      },
    });

    // Add recipients
    for (const user of users) {
      await prisma.notificationRecipient.create({
        data: {
          notificationId: notification.id,
          userId: user.id,
          status: getRandomElement(['pending', 'delivered', 'read']),
          deliveredAt: new Date(),
          readAt: Math.random() > 0.3 ? new Date() : null,
        },
      });
    }
  }

  // Chat conversations
  const conversationTypes = ['DIRECT', 'GROUP'];
  for (let i = 0; i < 5; i++) {
    const conversationType = getRandomElement(conversationTypes);
    const conversation = await prisma.chatConversation.create({
      data: {
        tenantId,
        title: conversationType === 'GROUP' ? `Team Chat ${i + 1}` : null,
        conversationType: conversationType as any,
        createdBy: users[0].id,
        lastMessageAt: new Date(),
      },
    });

    // Add participants
    const participantCount = conversationType === 'GROUP' ? getRandomInt(3, users.length) : 2;
    const selectedUsers = users.slice(0, participantCount);
    for (const user of selectedUsers) {
      await prisma.chatParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: user.id,
          role: user.id === users[0].id ? 'admin' : 'member',
        },
      });
    }

    // Add messages
    const messageCount = getRandomInt(5, 20);
    for (let j = 0; j < messageCount; j++) {
      const sender = getRandomElement(selectedUsers);
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: sender.id,
          content: `Message ${j + 1} in conversation ${i + 1}`,
          messageType: 'TEXT',
          createdAt: getRandomDate(new Date('2024-01-01'), new Date()),
        },
      });
    }
  }

  console.log(`  ✓ Notifications and chat conversations created`);
}

async function seedAIData(prisma: TenantPrismaClient, config: TenantConfig, tenantId: string, electionId: string) {
  console.log('  Creating AI credits and analytics...');

  // AI Credits
  const aiCredits = await prisma.tenantAICredits.create({
    data: {
      tenantId,
      totalCredits: 10000,
      usedCredits: getRandomInt(1000, 5000),
      bonusCredits: 500,
      expiresAt: new Date('2025-12-31'),
    },
  });

  // Credit transactions
  const transactionTypes = ['PURCHASE', 'USAGE', 'BONUS'];
  for (let i = 0; i < 20; i++) {
    await prisma.aICreditTransaction.create({
      data: {
        tenantCreditsId: aiCredits.id,
        transactionType: getRandomElement(transactionTypes),
        credits: getRandomInt(-100, 500),
        description: `AI credit ${getRandomElement(transactionTypes).toLowerCase()}`,
      },
    });
  }

  // Usage logs
  const featureKeys = ['speech_generation', 'voter_sentiment', 'news_summary', 'booth_prediction'];
  for (let i = 0; i < 50; i++) {
    await prisma.aIUsageLog.create({
      data: {
        tenantCreditsId: aiCredits.id,
        featureKey: getRandomElement(featureKeys),
        creditsUsed: getRandomInt(1, 15),
        inputTokens: getRandomInt(100, 1000),
        outputTokens: getRandomInt(50, 500),
        modelUsed: 'gpt-4',
        responseTime: getRandomInt(500, 5000),
        status: Math.random() > 0.05 ? 'success' : 'failed',
      },
    });
  }

  // AI Analytics Results
  const analysisTypes = ['BOOTH_PREDICTION', 'VOTER_SENTIMENT', 'TREND_ANALYSIS', 'CAMPAIGN_EFFECTIVENESS'];
  for (const analysisType of analysisTypes) {
    await prisma.aIAnalyticsResult.create({
      data: {
        electionId,
        analysisType,
        parameters: { scope: 'full', date: new Date().toISOString() },
        results: {
          prediction: Math.random() * 100,
          confidence: Math.random(),
          breakdown: { positive: 45, negative: 25, neutral: 30 }
        },
        insights: [
          { type: 'trend', message: 'Positive trend observed' },
          { type: 'warning', message: 'Need attention in urban areas' },
        ],
        confidence: Math.random(),
        modelUsed: 'gpt-4',
        creditsUsed: getRandomInt(10, 50),
        status: 'completed',
        completedAt: new Date(),
      },
    });
  }

  console.log(`  ✓ AI credits and analytics created`);
}

async function updateVotersWithMasterData(prisma: TenantPrismaClient, electionId: string) {
  console.log('  Linking voters to master data...');

  // Get master data
  const religions = await prisma.religion.findMany({ where: { electionId } });
  const casteCategories = await prisma.casteCategory.findMany({ where: { electionId } });
  const castes = await prisma.caste.findMany({ where: { electionId } });
  const voterCategories = await prisma.voterCategory.findMany({ where: { electionId } });
  const parties = await prisma.party.findMany({ where: { electionId } });
  const languages = await prisma.language.findMany({ where: { electionId } });

  if (religions.length === 0 || casteCategories.length === 0) {
    console.log('  ⚠ No master data found, skipping voter updates');
    return;
  }

  // Update voters in batches
  const BATCH_SIZE = 5000;
  let offset = 0;
  let updatedCount = 0;

  while (true) {
    const voters = await prisma.voter.findMany({
      where: { electionId },
      skip: offset,
      take: BATCH_SIZE,
      select: { id: true },
    });

    if (voters.length === 0) break;

    for (const voter of voters) {
      // Determine religion based on random distribution (60% Hindu, 20% Muslim, 10% Christian, 10% Others)
      const religionRand = Math.random();
      let religion;
      if (religionRand < 0.6) religion = religions.find(r => r.religionName === 'Hindu');
      else if (religionRand < 0.8) religion = religions.find(r => r.religionName === 'Muslim');
      else if (religionRand < 0.9) religion = religions.find(r => r.religionName === 'Christian');
      else religion = religions.find(r => r.religionName === 'Others') || getRandomElement(religions);

      // Determine caste category
      const casteCatRand = Math.random();
      let casteCategory;
      if (casteCatRand < 0.25) casteCategory = casteCategories.find(c => c.categoryName === 'General');
      else if (casteCatRand < 0.65) casteCategory = casteCategories.find(c => c.categoryName === 'OBC');
      else if (casteCatRand < 0.85) casteCategory = casteCategories.find(c => c.categoryName === 'SC');
      else casteCategory = casteCategories.find(c => c.categoryName === 'ST');

      // Get a caste from the category
      const matchingCastes = castes.filter(c => c.casteCategoryId === casteCategory?.id);
      const caste = matchingCastes.length > 0 ? getRandomElement(matchingCastes) : null;

      // Voter category based on political leaning
      const voterCategory = voterCategories.length > 0 ? getRandomElement(voterCategories) : null;

      // Party affiliation for some voters
      const party = Math.random() > 0.5 && parties.length > 0 ? getRandomElement(parties) : null;

      // Language
      const language = languages.length > 0 ? getRandomElement(languages) : null;

      await prisma.voter.update({
        where: { id: voter.id },
        data: {
          religionId: religion?.id,
          casteCategoryId: casteCategory?.id,
          casteId: caste?.id,
          voterCategoryId: voterCategory?.id,
          partyId: party?.id,
          languageId: language?.id,
        },
      });

      updatedCount++;
    }

    offset += BATCH_SIZE;
    console.log(`    Updated ${updatedCount} voters...`);
  }

  console.log(`  ✓ ${updatedCount} voters linked to master data`);
}

async function seedAdditionalDataForTenant(config: TenantConfig) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${config.name}`);
  console.log('='.repeat(60));

  const prisma = new TenantPrismaClient({
    datasources: { db: { url: config.databaseUrl } },
  });

  try {
    // Get tenant and election
    const tenant = await prisma.tenantConfig.findFirst({ where: { tenantId: { not: undefined } } });
    const tenantId = tenant?.tenantId || config.slug;

    const election = await prisma.election.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!election) {
      console.log('  ❌ No election found, skipping...');
      return;
    }
    const electionId = election.id;

    console.log(`  Tenant ID: ${tenantId}`);
    console.log(`  Election ID: ${electionId}`);

    // Seed all additional data
    const mainPartyId = await seedPartiesData(prisma, config, electionId);
    await seedCastesData(prisma, config, electionId);
    await seedCadresData(prisma, config, tenantId, electionId);
    await seedSurveysData(prisma, config, tenantId, electionId);
    await seedFeedbackIssues(prisma, config, tenantId, electionId);
    await seedPartyEvents(prisma, config, tenantId, electionId);
    await seedFundManagement(prisma, config, tenantId);
    await seedInventoryData(prisma, config, tenantId, electionId);
    await seedNewsBroadcast(prisma, config, tenantId);
    await seedNotificationsChat(prisma, config, tenantId);
    await seedAIData(prisma, config, tenantId, electionId);
    await updateVotersWithMasterData(prisma, electionId);

    console.log(`\n✅ ${config.name} additional data seeding completed!`);
  } finally {
    await prisma.$disconnect();
  }
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('Additional Data Seed Script');
  console.log('='.repeat(60));
  console.log('\nThis script will add comprehensive data to each tenant:');
  console.log('- Parties and political alliances');
  console.log('- Castes and sub-castes');
  console.log('- Cadres with assignments');
  console.log('- Surveys with responses');
  console.log('- Feedback issues');
  console.log('- Party events with attendees');
  console.log('- Fund management data');
  console.log('- Inventory items');
  console.log('- News and broadcasts');
  console.log('- Notifications and chat');
  console.log('- AI credits and analytics');
  console.log('- Link voters to master data');
  console.log('');

  for (const config of TENANTS) {
    await seedAdditionalDataForTenant(config);
  }

  console.log('\n' + '='.repeat(60));
  console.log('ALL TENANTS ADDITIONAL DATA SEEDED SUCCESSFULLY!');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  });
