/**
 * Seed script to add missing master data for UP and Tamil Nadu elections
 * This adds: Sub-castes, Political Parties, Government Schemes, and Voter Categories
 *
 * Run with: npx tsx prisma/seed-master-data.ts
 */

import { PrismaClient } from '../node_modules/.prisma/tenant-client';

const TENANT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/EC_Demo?schema=public';

const prisma = new PrismaClient({
  datasources: {
    db: { url: TENANT_DATABASE_URL }
  }
});

// ====================  TAMIL NADU SUB-CASTES ====================
const TN_SUBCASTES: Record<string, { subCastes: { name: string; nameLocal: string }[] }> = {
  // Brahmin sub-castes
  'Brahmin': {
    subCastes: [
      { name: 'Iyer', nameLocal: 'ஐயர்' },
      { name: 'Iyengar', nameLocal: 'ஐயங்கார்' },
      { name: 'Dikshitar', nameLocal: 'தீட்சிதர்' },
      { name: 'Smartha', nameLocal: 'ஸ்மார்த்த' },
    ]
  },
  // Mudaliar sub-castes
  'Mudaliar': {
    subCastes: [
      { name: 'Saiva Mudaliar', nameLocal: 'சைவ முதலியார்' },
      { name: 'Senguntha Mudaliar', nameLocal: 'செங்குந்த முதலியார்' },
      { name: 'Arcot Mudaliar', nameLocal: 'ஆற்காடு முதலியார்' },
      { name: 'Agamudayar', nameLocal: 'அகமுடையார்' },
    ]
  },
  // Chettiar sub-castes
  'Chettiar': {
    subCastes: [
      { name: 'Nattukottai Chettiar', nameLocal: 'நாட்டுக்கோட்டை செட்டியார்' },
      { name: 'Devanga Chettiar', nameLocal: 'தேவாங்க செட்டியார்' },
      { name: 'Arya Vysya', nameLocal: 'ஆர்ய வைசியா' },
      { name: 'Beeri Chettiar', nameLocal: 'பீரி செட்டியார்' },
    ]
  },
  // Nadar sub-castes
  'Nadar': {
    subCastes: [
      { name: 'Gramani Nadar', nameLocal: 'கிராமணி நாடார்' },
      { name: 'Nadaan', nameLocal: 'நாடான்' },
      { name: 'Shanar', nameLocal: 'சாணார்' },
    ]
  },
  // Gounder sub-castes
  'Gounder': {
    subCastes: [
      { name: 'Kongu Vellala Gounder', nameLocal: 'கொங்கு வெள்ளாள கவுண்டர்' },
      { name: 'Vettuva Gounder', nameLocal: 'வேட்டுவ கவுண்டர்' },
      { name: 'Urali Gounder', nameLocal: 'உரளி கவுண்டர்' },
      { name: 'Nattu Gounder', nameLocal: 'நாட்டு கவுண்டர்' },
    ]
  },
  // Yadav sub-castes
  'Yadav': {
    subCastes: [
      { name: 'Konar', nameLocal: 'கோனார்' },
      { name: 'Idayar', nameLocal: 'இடையர்' },
      { name: 'Ayar', nameLocal: 'ஆயர்' },
    ]
  },
  // Vanniyar sub-castes
  'Vanniyar': {
    subCastes: [
      { name: 'Padayachi', nameLocal: 'படையாச்சி' },
      { name: 'Gounder Vanniyar', nameLocal: 'கவுண்டர் வன்னியர்' },
      { name: 'Agnikula Kshatriya', nameLocal: 'அக்னிகுல க்ஷத்ரியா' },
    ]
  },
  // Mukkuvar sub-castes
  'Mukkuvar': {
    subCastes: [
      { name: 'Paravar', nameLocal: 'பரவர்' },
      { name: 'Karaiyar', nameLocal: 'கரையார்' },
    ]
  },
  // Vishwakarma sub-castes
  'Vishwakarma': {
    subCastes: [
      { name: 'Kammalar', nameLocal: 'கம்மாளர்' },
      { name: 'Asari', nameLocal: 'ஆசாரி' },
      { name: 'Pattar', nameLocal: 'பட்டர்' },
    ]
  },
  // Paraiyar sub-castes
  'Paraiyar': {
    subCastes: [
      { name: 'Valangai Paraiyar', nameLocal: 'வலங்கை பறையர்' },
      { name: 'Idangai Paraiyar', nameLocal: 'இடங்கை பறையர்' },
    ]
  },
  // Pallar sub-castes
  'Pallar': {
    subCastes: [
      { name: 'Devendra Kula Vellalar', nameLocal: 'தேவேந்திர குல வெள்ளாளர்' },
      { name: 'Kudumban', nameLocal: 'குடும்பன்' },
    ]
  },
  // Irular sub-castes
  'Irular': {
    subCastes: [
      { name: 'Kasavar', nameLocal: 'காசவர்' },
      { name: 'Villiyar', nameLocal: 'வில்லியர்' },
    ]
  },
};

// ====================  UTTAR PRADESH SUB-CASTES ====================
const UP_SUBCASTES: Record<string, { subCastes: { name: string; nameLocal: string }[] }> = {
  // Brahmin sub-castes for UP
  'Brahmin': {
    subCastes: [
      { name: 'Kanyakubj', nameLocal: 'कान्यकुब्ज' },
      { name: 'Saryupareen', nameLocal: 'सरयूपारीण' },
      { name: 'Maithil', nameLocal: 'मैथिल' },
      { name: 'Bhumihar', nameLocal: 'भूमिहार' },
      { name: 'Gaur', nameLocal: 'गौड़' },
    ]
  },
  // Yadav sub-castes for UP
  'Yadav': {
    subCastes: [
      { name: 'Ahir', nameLocal: 'अहीर' },
      { name: 'Gope', nameLocal: 'गोप' },
      { name: 'Gwala', nameLocal: 'ग्वाला' },
      { name: 'Goala', nameLocal: 'गोआला' },
    ]
  },
  // Rajput sub-castes for UP
  'Rajput': {
    subCastes: [
      { name: 'Chauhan', nameLocal: 'चौहान' },
      { name: 'Rathore', nameLocal: 'राठौर' },
      { name: 'Sisodiya', nameLocal: 'सिसोदिया' },
      { name: 'Gaharwar', nameLocal: 'गहरवार' },
      { name: 'Bundela', nameLocal: 'बुंदेला' },
    ]
  },
  // Jat sub-castes for UP
  'Jat': {
    subCastes: [
      { name: 'Malik', nameLocal: 'मलिक' },
      { name: 'Dahiya', nameLocal: 'दहिया' },
      { name: 'Sangwan', nameLocal: 'सांगवान' },
      { name: 'Tomar', nameLocal: 'तोमर' },
    ]
  },
  // Kurmi sub-castes for UP
  'Kurmi': {
    subCastes: [
      { name: 'Kurmi Kshatriya', nameLocal: 'कुर्मी क्षत्रिय' },
      { name: 'Patel', nameLocal: 'पटेल' },
      { name: 'Awadhiya', nameLocal: 'अवधिया' },
    ]
  },
  // Maurya sub-castes
  'Maurya': {
    subCastes: [
      { name: 'Kushwaha', nameLocal: 'कुशवाहा' },
      { name: 'Koeri', nameLocal: 'कोइरी' },
      { name: 'Saini', nameLocal: 'सैनी' },
    ]
  },
  // Chamar sub-castes
  'Chamar': {
    subCastes: [
      { name: 'Jatav', nameLocal: 'जाटव' },
      { name: 'Raidas', nameLocal: 'रैदास' },
      { name: 'Raidasi', nameLocal: 'रैदासी' },
    ]
  },
  // Pasi sub-castes
  'Pasi': {
    subCastes: [
      { name: 'Pasi Rajput', nameLocal: 'पासी राजपूत' },
      { name: 'Balmiki Pasi', nameLocal: 'वाल्मीकि पासी' },
    ]
  },
};

// ====================  POLITICAL PARTIES ====================
const TN_PARTIES = [
  { name: 'DMK', nameLocal: 'திமுக', abbreviation: 'DMK', colorCode: '#E41E26', isState: true, state: 'Tamil Nadu' },
  { name: 'AIADMK', nameLocal: 'அதிமுக', abbreviation: 'AIADMK', colorCode: '#009E49', isState: true, state: 'Tamil Nadu' },
  { name: 'PMK', nameLocal: 'பாமக', abbreviation: 'PMK', colorCode: '#FFFF00', isState: true, state: 'Tamil Nadu' },
  { name: 'DMDK', nameLocal: 'தேமுதிக', abbreviation: 'DMDK', colorCode: '#FF4500', isState: true, state: 'Tamil Nadu' },
  { name: 'MDMK', nameLocal: 'மதிமுக', abbreviation: 'MDMK', colorCode: '#8B0000', isState: true, state: 'Tamil Nadu' },
  { name: 'VCK', nameLocal: 'விசிக', abbreviation: 'VCK', colorCode: '#000080', isState: true, state: 'Tamil Nadu' },
  { name: 'TMC (Tamil Maanila Congress)', nameLocal: 'தமிழ் மாநிலா காங்கிரஸ்', abbreviation: 'TMC', colorCode: '#006400', isState: true, state: 'Tamil Nadu' },
  { name: 'NTK', nameLocal: 'நாம் தமிழர்', abbreviation: 'NTK', colorCode: '#800000', isState: true, state: 'Tamil Nadu' },
  { name: 'BJP', nameLocal: 'பாஜக', abbreviation: 'BJP', colorCode: '#FF9933', isNational: true },
  { name: 'INC', nameLocal: 'காங்கிரஸ்', abbreviation: 'INC', colorCode: '#00BFFF', isNational: true },
];

const UP_PARTIES = [
  { name: 'BJP', nameLocal: 'भाजपा', abbreviation: 'BJP', colorCode: '#FF9933', isNational: true },
  { name: 'Samajwadi Party', nameLocal: 'समाजवादी पार्टी', abbreviation: 'SP', colorCode: '#FF0000', isState: true, state: 'Uttar Pradesh' },
  { name: 'Bahujan Samaj Party', nameLocal: 'बहुजन समाज पार्टी', abbreviation: 'BSP', colorCode: '#22409A', isState: true, state: 'Uttar Pradesh' },
  { name: 'INC', nameLocal: 'कांग्रेस', abbreviation: 'INC', colorCode: '#00BFFF', isNational: true },
  { name: 'Rashtriya Lok Dal', nameLocal: 'राष्ट्रीय लोक दल', abbreviation: 'RLD', colorCode: '#006600', isState: true, state: 'Uttar Pradesh' },
  { name: 'Apna Dal (S)', nameLocal: 'अपना दल (एस)', abbreviation: 'AD(S)', colorCode: '#FFA500', isState: true, state: 'Uttar Pradesh' },
  { name: 'Suheldev Bharatiya Samaj Party', nameLocal: 'सुहेलदेव भारतीय समाज पार्टी', abbreviation: 'SBSP', colorCode: '#008000', isState: true, state: 'Uttar Pradesh' },
  { name: 'Nishad Party', nameLocal: 'निषाद पार्टी', abbreviation: 'NISHAD', colorCode: '#4169E1', isState: true, state: 'Uttar Pradesh' },
  { name: 'AAP', nameLocal: 'आप', abbreviation: 'AAP', colorCode: '#0066B3', isNational: true },
];

// ====================  GOVERNMENT SCHEMES ====================
const TN_SCHEMES = [
  // Central Government Schemes
  { name: 'PM-KISAN', nameLocal: 'பிஎம்-கிசான்', description: 'Income support of Rs. 6000/year to farmer families', ministry: 'Agriculture', beneficiaries: 'Small and Marginal Farmers' },
  { name: 'Ayushman Bharat', nameLocal: 'ஆயுஷ்மான் பாரத்', description: 'Health insurance coverage up to Rs. 5 lakh per family', ministry: 'Health', beneficiaries: 'BPL Families' },
  { name: 'PM Awas Yojana', nameLocal: 'பிஎம் ஆவாஸ் யோஜனா', description: 'Housing for All - Affordable housing for EWS/LIG', ministry: 'Housing', beneficiaries: 'EWS/LIG Families' },
  { name: 'Ujjwala Yojana', nameLocal: 'உஜ்வலா யோஜனா', description: 'Free LPG connections to BPL households', ministry: 'Petroleum', beneficiaries: 'BPL Women' },
  { name: 'Jan Dhan Yojana', nameLocal: 'ஜன் தன் யோஜனா', description: 'Financial inclusion - Bank accounts with overdraft', ministry: 'Finance', beneficiaries: 'Unbanked Adults' },

  // Tamil Nadu State Schemes
  { name: 'Kalaignar Magalir Urimai Thogai', nameLocal: 'கலைஞர் மகளிர் உரிமைத் தொகை', description: 'Rs. 1000/month for women head of family', ministry: 'TN Social Welfare', beneficiaries: 'Women aged 21-60' },
  { name: 'Free Rice Scheme', nameLocal: 'இலவச அரிசி திட்டம்', description: '20 kg free rice per month through PDS', ministry: 'TN Food', beneficiaries: 'Ration Card Holders' },
  { name: 'Free Laptop Scheme', nameLocal: 'இலவச மடிக்கணினி', description: 'Free laptops for government school students', ministry: 'TN Education', beneficiaries: 'Class 11-12 Students' },
  { name: 'Chief Minister\'s Health Insurance', nameLocal: 'முதல்வர் காப்பீடு', description: 'Free medical treatment up to Rs. 5 lakh', ministry: 'TN Health', beneficiaries: 'All Residents' },
  { name: 'Free Bus Pass', nameLocal: 'இலவச பேருந்து பயண அட்டை', description: 'Free bus travel for women and students', ministry: 'TN Transport', beneficiaries: 'Women & Students' },
  { name: 'Marriage Assistance Scheme', nameLocal: 'திருமண உதவித் தொகை', description: 'Rs. 50,000 for marriage of poor families', ministry: 'TN Social Welfare', beneficiaries: 'SC/ST/BC Women' },
];

const UP_SCHEMES = [
  // Central Government Schemes (also applicable in UP)
  { name: 'PM-KISAN', nameLocal: 'पीएम-किसान', description: 'Income support of Rs. 6000/year to farmer families', ministry: 'Agriculture', beneficiaries: 'Small and Marginal Farmers' },
  { name: 'Ayushman Bharat', nameLocal: 'आयुष्मान भारत', description: 'Health insurance coverage up to Rs. 5 lakh per family', ministry: 'Health', beneficiaries: 'BPL Families' },
  { name: 'PM Awas Yojana', nameLocal: 'पीएम आवास योजना', description: 'Housing for All - Affordable housing for EWS/LIG', ministry: 'Housing', beneficiaries: 'EWS/LIG Families' },
  { name: 'Ujjwala Yojana', nameLocal: 'उज्ज्वला योजना', description: 'Free LPG connections to BPL households', ministry: 'Petroleum', beneficiaries: 'BPL Women' },

  // Uttar Pradesh State Schemes
  { name: 'Kanya Sumangala Yojana', nameLocal: 'कन्या सुमंगला योजना', description: 'Rs. 15,000 in installments for girl child', ministry: 'UP Women Welfare', beneficiaries: 'Girls from birth to graduation' },
  { name: 'Mukhyamantri Kisan Samman Nidhi', nameLocal: 'मुख्यमंत्री किसान सम्मान निधि', description: 'Additional Rs. 6000/year to UP farmers', ministry: 'UP Agriculture', beneficiaries: 'Small Farmers' },
  { name: 'Free Ration Scheme', nameLocal: 'मुफ्त राशन योजना', description: 'Free ration under NFSA', ministry: 'UP Food', beneficiaries: 'BPL Families' },
  { name: 'Mukhyamantri Abhyudaya Yojana', nameLocal: 'मुख्यमंत्री अभ्युदय योजना', description: 'Free coaching for competitive exams', ministry: 'UP Education', beneficiaries: 'Students from poor families' },
  { name: 'Mukhyamantri Samuhik Vivah Yojana', nameLocal: 'मुख्यमंत्री सामूहिक विवाह योजना', description: 'Rs. 51,000 assistance for mass marriages', ministry: 'UP Social Welfare', beneficiaries: 'BPL Families' },
  { name: 'Bal Seva Yojana', nameLocal: 'बाल सेवा योजना', description: 'Support for COVID orphans', ministry: 'UP Women & Child', beneficiaries: 'COVID Orphaned Children' },
  { name: 'Vishwakarma Shram Samman Yojana', nameLocal: 'विश्वकर्मा श्रम सम्मान योजना', description: 'Skill training and toolkit for artisans', ministry: 'UP MSME', beneficiaries: 'Traditional Artisans' },
];

// ====================  VOTER CATEGORIES ====================
const TN_VOTER_CATEGORIES = [
  { name: 'Senior Citizen', nameLocal: 'மூத்த குடிமகன்', code: 'SENIOR', color: '#607D8B', icon: 'elderly' },
  { name: 'First Time Voter', nameLocal: 'முதல் முறை வாக்காளர்', code: 'FTV', color: '#9C27B0', icon: 'new' },
  { name: 'Farmer', nameLocal: 'விவசாயி', code: 'FARMER', color: '#4CAF50', icon: 'agriculture' },
  { name: 'Government Employee', nameLocal: 'அரசு ஊழியர்', code: 'GOVT_EMP', color: '#2196F3', icon: 'work' },
  { name: 'Teacher', nameLocal: 'ஆசிரியர்', code: 'TEACHER', color: '#3F51B5', icon: 'school' },
  { name: 'Doctor/Medical Professional', nameLocal: 'மருத்துவர்', code: 'MEDICAL', color: '#F44336', icon: 'medical' },
  { name: 'Businessman', nameLocal: 'வணிகர்', code: 'BUSINESS', color: '#FF9800', icon: 'business' },
  { name: 'Youth (18-25)', nameLocal: 'இளைஞர்', code: 'YOUTH', color: '#E91E63', icon: 'person' },
  { name: 'Women', nameLocal: 'பெண்கள்', code: 'WOMEN', color: '#9C27B0', icon: 'female' },
  { name: 'Person with Disability', nameLocal: 'மாற்றுத்திறனாளி', code: 'PWD', color: '#795548', icon: 'accessible' },
  { name: 'Service Voter', nameLocal: 'சேவை வாக்காளர்', code: 'SERVICE', color: '#FF5722', icon: 'military' },
  { name: 'NRI Voter', nameLocal: 'வெளிநாட்டு வாக்காளர்', code: 'NRI', color: '#00BCD4', icon: 'flight' },
  { name: 'Daily Wage Worker', nameLocal: 'தினக்கூலி தொழிலாளி', code: 'DAILY_WAGE', color: '#8BC34A', icon: 'construction' },
  { name: 'Fisherman', nameLocal: 'மீனவர்', code: 'FISHERMAN', color: '#03A9F4', icon: 'sailing' },
];

const UP_VOTER_CATEGORIES = [
  { name: 'Senior Citizen', nameLocal: 'वरिष्ठ नागरिक', code: 'SENIOR', color: '#607D8B', icon: 'elderly' },
  { name: 'First Time Voter', nameLocal: 'पहली बार मतदाता', code: 'FTV', color: '#9C27B0', icon: 'new' },
  { name: 'Farmer', nameLocal: 'किसान', code: 'FARMER', color: '#4CAF50', icon: 'agriculture' },
  { name: 'Government Employee', nameLocal: 'सरकारी कर्मचारी', code: 'GOVT_EMP', color: '#2196F3', icon: 'work' },
  { name: 'Teacher', nameLocal: 'शिक्षक', code: 'TEACHER', color: '#3F51B5', icon: 'school' },
  { name: 'Doctor/Medical Professional', nameLocal: 'चिकित्सक', code: 'MEDICAL', color: '#F44336', icon: 'medical' },
  { name: 'Businessman', nameLocal: 'व्यापारी', code: 'BUSINESS', color: '#FF9800', icon: 'business' },
  { name: 'Youth (18-25)', nameLocal: 'युवा', code: 'YOUTH', color: '#E91E63', icon: 'person' },
  { name: 'Women', nameLocal: 'महिला', code: 'WOMEN', color: '#9C27B0', icon: 'female' },
  { name: 'Person with Disability', nameLocal: 'दिव्यांग', code: 'PWD', color: '#795548', icon: 'accessible' },
  { name: 'Service Voter', nameLocal: 'सेवा मतदाता', code: 'SERVICE', color: '#FF5722', icon: 'military' },
  { name: 'NRI Voter', nameLocal: 'प्रवासी मतदाता', code: 'NRI', color: '#00BCD4', icon: 'flight' },
  { name: 'Daily Wage Worker', nameLocal: 'दिहाड़ी मजदूर', code: 'DAILY_WAGE', color: '#8BC34A', icon: 'construction' },
  { name: 'Artisan', nameLocal: 'कारीगर', code: 'ARTISAN', color: '#FFEB3B', icon: 'handyman' },
];

async function main() {
  console.log('Starting master data seed...\n');

  try {
    // Get all elections
    const elections = await prisma.election.findMany({
      select: { id: true, name: true, state: true }
    });

    console.log(`Found ${elections.length} elections:\n`);
    elections.forEach(e => console.log(`  - ${e.name} (${e.state})`));
    console.log('');

    for (const election of elections) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${election.name}`);
      console.log(`${'='.repeat(60)}`);

      const isTamilNadu = election.state === 'Tamil Nadu';
      const isUP = election.state === 'Uttar Pradesh';

      // 1. Seed Sub-Castes
      await seedSubCastes(election.id, isTamilNadu ? TN_SUBCASTES : UP_SUBCASTES);

      // 2. Seed Parties
      await seedParties(election.id, isTamilNadu ? TN_PARTIES : UP_PARTIES);

      // 3. Seed Schemes
      await seedSchemes(election.id, isTamilNadu ? TN_SCHEMES : UP_SCHEMES);

      // 4. Seed/Update Voter Categories
      await seedVoterCategories(election.id, isTamilNadu ? TN_VOTER_CATEGORIES : UP_VOTER_CATEGORIES);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Master data seed completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error seeding master data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedSubCastes(electionId: string, subCasteData: Record<string, { subCastes: { name: string; nameLocal: string }[] }>) {
  console.log('\n  Seeding sub-castes...');

  // Get existing castes for this election
  const castes = await prisma.caste.findMany({
    where: { electionId },
    select: { id: true, casteName: true }
  });

  console.log(`    Found ${castes.length} castes`);

  let created = 0;
  let skipped = 0;

  for (const caste of castes) {
    const casteSubCastes = subCasteData[caste.casteName];
    if (!casteSubCastes) {
      continue;
    }

    for (const [index, sc] of casteSubCastes.subCastes.entries()) {
      // Check if already exists
      const existing = await prisma.subCaste.findUnique({
        where: {
          electionId_subCasteName: {
            electionId,
            subCasteName: sc.name
          }
        }
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.subCaste.create({
        data: {
          electionId,
          casteId: caste.id,
          subCasteName: sc.name,
          subCasteNameLocal: sc.nameLocal,
          displayOrder: index + 1,
          isActive: true
        }
      });
      created++;
    }
  }

  console.log(`    Created: ${created}, Skipped: ${skipped}`);
}

async function seedParties(electionId: string, parties: any[]) {
  console.log('\n  Seeding parties...');

  let created = 0;
  let skipped = 0;

  for (const [index, party] of parties.entries()) {
    // Check if party exists (uses actual DB column names)
    let existingParty = await prisma.party.findFirst({
      where: { partyName: party.name }
    });

    if (!existingParty) {
      // Create new party with actual DB field names
      existingParty = await prisma.party.create({
        data: {
          partyName: party.name,
          partyShortName: party.abbreviation,
          partyFullName: party.nameLocal,
          partyColor: party.colorCode,
          displayOrder: index + 1,
          isActive: true,
        }
      });
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`    Created: ${created}, Skipped: ${skipped}`);
}

async function seedSchemes(electionId: string, schemes: any[]) {
  console.log('\n  Seeding schemes...');

  let created = 0;
  let skipped = 0;

  for (const scheme of schemes) {
    // Check if already exists using actual DB field name
    const existing = await prisma.scheme.findFirst({
      where: {
        electionId,
        schemeName: scheme.name
      }
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Create with actual DB field names
    await prisma.scheme.create({
      data: {
        electionId,
        schemeName: scheme.name,
        schemeShortName: scheme.nameLocal,
        schemeDescription: scheme.description,
        schemeBy: scheme.ministry?.includes('TN ') || scheme.ministry?.includes('UP ') ? 'STATE_GOVT' : 'CENTRAL_GOVT',
        category: scheme.ministry,
        isActive: true
      }
    });
    created++;
  }

  console.log(`    Created: ${created}, Skipped: ${skipped}`);
}

async function seedVoterCategories(electionId: string, categories: any[]) {
  console.log('\n  Seeding voter categories...');

  let created = 0;
  let skipped = 0;

  for (const [index, cat] of categories.entries()) {
    // Check if already exists using actual DB field name (categoryName)
    const existing = await prisma.voterCategory.findFirst({
      where: {
        electionId,
        categoryName: cat.name
      }
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Create with actual DB field names
    await prisma.voterCategory.create({
      data: {
        electionId,
        categoryName: cat.name,
        categoryNameLocal: cat.nameLocal,
        categoryColor: cat.color,
        iconType: cat.icon,
        displayOrder: index + 1,
        isActive: true
      }
    });
    created++;
  }

  console.log(`    Created: ${created}, Skipped: ${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
