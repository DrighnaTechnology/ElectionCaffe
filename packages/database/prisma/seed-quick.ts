/**
 * Quick seed for development - uses tenant Prisma client
 */
import { PrismaClient } from '../node_modules/.prisma/tenant-client/index.js';
import bcrypt from 'bcryptjs';

const DB_URL = process.env.TENANT_DATABASE_URL || 'postgresql://postgres:password@helium/heliumdb?sslmode=disable';
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

const TENANT_ID = 'eccc9470-9781-4d84-8281-6b9dced2cb8d';

async function main() {
  console.log('Quick seed starting...');

  // 1. Admin user
  let user = await prisma.user.findFirst({ where: { mobile: '9876543210' } });
  if (!user) {
    const hash = await bcrypt.hash('admin123', 10);
    user = await prisma.user.create({
      data: { tenantId: TENANT_ID, firstName: 'Admin', lastName: 'TN BJP', mobile: '9876543210', email: 'admin.tn.bjp@electioncaffe.com', passwordHash: hash, role: 'TENANT_ADMIN', status: 'ACTIVE', permissions: ['all'] },
    });
  }
  console.log('  User:', user.id);

  // 2. Election
  let election = await prisma.election.findFirst({});
  if (!election) {
    election = await prisma.election.create({
      data: { tenantId: TENANT_ID, name: 'TN Assembly Election 2026', electionType: 'ASSEMBLY', state: 'Tamil Nadu', constituency: 'Chennai South', district: 'Chennai', candidateName: 'Raj Kumar', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), pollDate: new Date('2026-06-15'), status: 'ACTIVE', totalVoters: 0, totalMaleVoters: 0, totalFemaleVoters: 0, totalOtherVoters: 0, totalBooths: 0, totalParts: 0 },
    });
  }
  console.log('  Election:', election.id);

  // 3. Master data (election-scoped)
  const religionNames = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain'];
  const relMap: Record<string, string> = {};
  for (const name of religionNames) {
    const existing = await prisma.religion.findFirst({ where: { electionId: election.id, religionName: name } });
    if (existing) { relMap[name] = existing.id; continue; }
    const r = await prisma.religion.create({ data: { electionId: election.id, religionName: name } });
    relMap[name] = r.id;
  }

  const catNames = ['General', 'OBC', 'SC', 'ST', 'BC', 'MBC'];
  const catMap: Record<string, string> = {};
  for (const name of catNames) {
    const existing = await prisma.casteCategory.findFirst({ where: { electionId: election.id, categoryName: name } });
    if (existing) { catMap[name] = existing.id; continue; }
    const c = await prisma.casteCategory.create({ data: { electionId: election.id, categoryName: name } });
    catMap[name] = c.id;
  }

  const casteData = [
    { name: 'Brahmin', cat: 'General' }, { name: 'Gounder', cat: 'BC' },
    { name: 'Mudaliar', cat: 'BC' }, { name: 'Nadar', cat: 'OBC' },
    { name: 'Thevar', cat: 'OBC' }, { name: 'Pallar', cat: 'SC' },
  ];
  const casteMap: Record<string, string> = {};
  for (const c of casteData) {
    const existing = await prisma.caste.findFirst({ where: { electionId: election.id, casteName: c.name } });
    if (existing) { casteMap[c.name] = existing.id; continue; }
    const caste = await prisma.caste.create({ data: { electionId: election.id, casteName: c.name, casteCategoryId: catMap[c.cat] } });
    casteMap[c.name] = caste.id;
  }

  const langNames = ['Tamil', 'Hindi', 'English', 'Telugu', 'Kannada'];
  const langMap: Record<string, string> = {};
  for (const name of langNames) {
    const existing = await prisma.language.findFirst({ where: { electionId: election.id, languageName: name } });
    if (existing) { langMap[name] = existing.id; continue; }
    const l = await prisma.language.create({ data: { electionId: election.id, languageName: name } });
    langMap[name] = l.id;
  }

  const vcNames = ['Regular Voter', 'First-time Voter', 'Senior Citizen', 'Youth Voter'];
  const vcMap: Record<string, string> = {};
  for (const name of vcNames) {
    const existing = await prisma.voterCategory.findFirst({ where: { electionId: election.id, categoryName: name } });
    if (existing) { vcMap[name] = existing.id; continue; }
    const vc = await prisma.voterCategory.create({ data: { electionId: election.id, categoryName: name } });
    vcMap[name] = vc.id;
  }

  const partyNames = ['BJP', 'INC', 'DMK', 'AIADMK', 'PMK'];
  const partyMap: Record<string, string> = {};
  for (const p of partyNames) {
    const existing = await prisma.party.findFirst({ where: { electionId: election.id, partyName: p } });
    if (existing) { partyMap[p] = existing.id; continue; }
    const party = await prisma.party.create({ data: { electionId: election.id, partyName: p, partyShortName: p } });
    partyMap[p] = party.id;
  }
  console.log('  Master data created');

  // 4. Parts, sections, booths, families
  const existingParts = await prisma.part.findMany({ where: { electionId: election.id } });
  if (existingParts.length > 0) {
    console.log('  Parts already exist, skipping to cadres...');
    // Skip to cadres
    const cadreTypes2 = ['BOOTH_WORKER', 'SECTOR_INCHARGE', 'COORDINATOR', 'PARTY_WORKER', 'VOLUNTEER'];
    for (let i = 0; i < 5; i++) {
      const mobile = `98765000${10 + i}`;
      let cu = await prisma.user.findFirst({ where: { tenantId: TENANT_ID, mobile } });
      if (!cu) {
        const ch = await bcrypt.hash('cadre123', 10);
        cu = await prisma.user.create({
          data: { tenantId: TENANT_ID, firstName: `Cadre${i + 1}`, lastName: 'Worker', mobile, passwordHash: ch, role: 'VOLUNTEER', status: 'ACTIVE', permissions: [] },
        });
      }
      const existingCadre = await prisma.cadre.findFirst({ where: { userId: cu.id } });
      if (!existingCadre) {
        await prisma.cadre.create({
          data: { userId: cu.id, electionId: election.id, cadreType: cadreTypes2[i], isActive: true },
        });
      }
    }
    console.log('  Cadres created');
    await prisma.$disconnect();
    return;
  }

  const partIds: string[] = [];
  const boothIds: string[] = [];
  const sectionIds: string[] = [];
  const familyIds: string[] = [];
  const familyNames = ['Kumar', 'Pillai', 'Sundaram', 'Murugan', 'Nair'];

  for (let i = 1; i <= 5; i++) {
    const part = await prisma.part.create({
      data: { electionId: election.id, partNumber: i, boothName: `Gov School Part ${i}`, partType: 'URBAN', address: `${i} Main Rd, Chennai`, totalVoters: 20, maleVoters: 12, femaleVoters: 7, otherVoters: 1 },
    });
    partIds.push(part.id);

    const s = await prisma.section.create({
      data: { electionId: election.id, partId: part.id, sectionNumber: i, sectionName: `Section ${i}`, totalVoters: 20 },
    });
    sectionIds.push(s.id);

    for (let j = 1; j <= 2; j++) {
      const b = await prisma.booth.create({
        data: { electionId: election.id, partId: part.id, boothNumber: String((i - 1) * 2 + j), boothName: `Booth ${(i - 1) * 2 + j}`, address: `Gov School Part ${i}, Room ${j}` },
      });
      boothIds.push(b.id);
    }

    const fam = await prisma.family.create({
      data: { electionId: election.id, partId: part.id, familyName: `${familyNames[i - 1]} Family`, houseNo: `${i}/1`, address: `${i} Main Road`, totalMembers: 4 },
    });
    familyIds.push(fam.id);
  }
  console.log('  Parts, booths, sections, families created');

  // 5. Voters
  const firstNames = ['Raj', 'Kumar', 'Priya', 'Lakshmi', 'Anand', 'Deepa', 'Suresh', 'Kavitha', 'Mohan', 'Rani', 'Vijay', 'Selvi', 'Ramesh', 'Uma', 'Ganesh', 'Saroja', 'Prakash', 'Meena', 'Senthil', 'Padma'];
  const lastNames = ['Pillai', 'Kumar', 'Nair', 'Murugan', 'Sundaram'];
  const genders = ['MALE', 'FEMALE'] as const;
  const leanings = ['LOYAL', 'SWING', 'OPPOSITION', 'UNKNOWN'] as const;
  const influences = ['HIGH', 'MEDIUM', 'LOW', 'NONE'] as const;

  let voterCount = 0;
  for (let pi = 0; pi < partIds.length; pi++) {
    for (let v = 0; v < 20; v++) {
      const age = 25 + (v * 2) % 50;
      await prisma.voter.create({
        data: {
          electionId: election.id, partId: partIds[pi], sectionId: sectionIds[pi],
          boothId: boothIds[pi * 2 + (v % 2)], familyId: familyIds[pi],
          epicNumber: `TN/${100 + pi}/${100000 + v}`, slNumber: v + 1,
          name: `${firstNames[(pi * 20 + v) % firstNames.length]} ${lastNames[(pi * 20 + v) % lastNames.length]}`,
          gender: genders[v % 2], age,
          dateOfBirth: new Date(2026 - age, v % 12, (v % 28) + 1),
          houseNumber: `${pi + 1}/${v + 1}`, address: `${pi + 1}/${v + 1} Main Rd, Chennai`,
          religionId: relMap[religionNames[v % religionNames.length]],
          casteCategoryId: catMap[catNames[v % catNames.length]],
          casteId: casteMap[casteData[v % casteData.length].name],
          languageId: langMap[langNames[v % langNames.length]],
          partyId: partyMap[partyNames[v % partyNames.length]],
          voterCategoryId: vcMap[vcNames[v % vcNames.length]],
          politicalLeaning: leanings[v % leanings.length],
          influenceLevel: influences[v % influences.length],
          isFamilyCaptain: v === 0,
        },
      });
      voterCount++;
    }
  }
  console.log(`  Voters created: ${voterCount}`);

  // 6. Cadres
  const cadreTypes = ['BOOTH_WORKER', 'SECTOR_INCHARGE', 'COORDINATOR', 'PARTY_WORKER', 'VOLUNTEER'];
  for (let i = 0; i < 5; i++) {
    const mobile = `98765000${10 + i}`;
    let cu = await prisma.user.findFirst({ where: { tenantId: TENANT_ID, mobile } });
    if (!cu) {
      const ch = await bcrypt.hash('cadre123', 10);
      cu = await prisma.user.create({
        data: { tenantId: TENANT_ID, firstName: `Cadre${i + 1}`, lastName: 'Worker', mobile, passwordHash: ch, role: 'VOLUNTEER', status: 'ACTIVE', permissions: [] },
      });
    }
    const existingCadre = await prisma.cadre.findFirst({ where: { userId: cu.id } });
    if (!existingCadre) {
      await prisma.cadre.create({
        data: { userId: cu.id, electionId: election.id, cadreType: cadreTypes[i], isActive: true },
      });
    }
  }
  console.log('  Cadres created');

  // 7. Update election totals
  await prisma.election.update({
    where: { id: election.id },
    data: { totalVoters: voterCount, totalParts: 5, totalBooths: 10, totalMaleVoters: 50, totalFemaleVoters: 50 },
  });

  console.log('\nSeed completed!');
  await prisma.$disconnect();
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
