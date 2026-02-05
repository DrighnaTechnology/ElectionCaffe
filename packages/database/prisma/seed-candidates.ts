import { PrismaClient as TenantClient } from '../node_modules/.prisma/tenant-client/index.js';

const TENANT_DBS = [
  { name: 'EC_BJP_TN', electionId: 'bjp-tn-election-2024', tenantId: 'tenant-bjp-tn' },
  { name: 'EC_BJP_UP', electionId: 'bjp-up-election-2024', tenantId: 'tenant-bjp-up' },
  { name: 'EC_AIDMK_TN', electionId: 'aidmk-tn-election-2024', tenantId: 'tenant-aidmk-tn' },
];

// Sample candidate data
const candidateNames = [
  { name: 'Vijay Kumar', nameLocal: 'விஜய் குமார்', gender: 'MALE' },
  { name: 'Anita Devi', nameLocal: 'அனிதா தேவி', gender: 'FEMALE' },
  { name: 'Rajesh Sharma', nameLocal: 'ராஜேஷ் சர்மா', gender: 'MALE' },
  { name: 'Lakshmi Narayanan', nameLocal: 'லட்சுமி நாராயணன்', gender: 'MALE' },
  { name: 'Priya Singh', nameLocal: 'ப்ரியா சிங்', gender: 'FEMALE' },
  { name: 'Suresh Babu', nameLocal: 'சுரேஷ் பாபு', gender: 'MALE' },
  { name: 'Meena Kumari', nameLocal: 'மீனா குமாரி', gender: 'FEMALE' },
  { name: 'Arjun Reddy', nameLocal: 'அர்ஜுன் ரெட்டி', gender: 'MALE' },
];

const educationLevels = [
  'B.A., M.A., Ph.D.',
  'B.Tech, MBA',
  'B.Com, LLB',
  'M.Sc., B.Ed.',
  'MBBS, MD',
  'B.E., M.Tech',
  'B.A., LLB',
  'M.A. Economics',
];

const professions = [
  'Social Worker',
  'Lawyer',
  'Business Owner',
  'Teacher',
  'Doctor',
  'Engineer',
  'Farmer',
  'Retired Government Officer',
];

const socialMediaPlatforms = [
  'FACEBOOK',
  'TWITTER',
  'INSTAGRAM',
  'YOUTUBE',
  'LINKEDIN',
  'WEBSITE',
  'THREADS',
  'WHATSAPP',
  'TELEGRAM',
];

async function seedCandidatesForTenant(dbName: string, electionId: string, tenantId: string) {
  const client = new TenantClient({
    datasources: {
      db: {
        url: `postgresql://postgres:postgres@localhost:5432/${dbName}`,
      },
    },
  });

  try {
    await client.$connect();
    console.log(`\n📦 Seeding candidates for ${dbName}...`);

    // Check if candidates already exist
    const existingCount = await (client as any).candidate.count();
    if (existingCount > 0) {
      console.log(`  ⏭️  Candidates already exist (${existingCount} found), skipping...`);
      return;
    }

    // Get an election
    const election = await client.election.findFirst({
      where: { id: electionId },
    });

    if (!election) {
      console.log(`  ⚠️  Election not found (${electionId}), using first available election...`);
      const firstElection = await client.election.findFirst();
      if (!firstElection) {
        console.log('  ⚠️  No elections found, skipping candidates seed');
        return;
      }
    }

    const actualElectionId = election?.id || electionId;

    // Get parties
    const parties = await client.party.findMany({ take: 5 });

    // Create candidates
    const createdCandidates = [];
    for (let i = 0; i < candidateNames.length; i++) {
      const candidateData = candidateNames[i];
      const isOurCandidate = i === 0; // First candidate is "our candidate"
      const partyId = parties[i % parties.length]?.id;

      const candidate = await (client as any).candidate.create({
        data: {
          electionId: actualElectionId,
          name: candidateData.name,
          nameLocal: candidateData.nameLocal,
          gender: candidateData.gender,
          isOurCandidate,
          partyId,
          age: 35 + (i * 5),
          dateOfBirth: new Date(1990 - (i * 5), i % 12, (i + 1) * 2),
          education: educationLevels[i % educationLevels.length],
          profession: professions[i % professions.length],
          experience: `${10 + i * 2} years of experience in public service and social work. Has been active in local community development programs.`,
          biography: `${candidateData.name} is a dedicated public servant with a strong background in ${professions[i % professions.length].toLowerCase()}. Born and raised in the constituency, they have been working tirelessly for the welfare of the people. Their commitment to education, healthcare, and infrastructure development has earned them widespread respect in the community.`,
          achievements: JSON.stringify([
            'Successfully implemented water supply project for 50 villages',
            'Built 10 schools in rural areas',
            'Organized free health camps for over 10,000 patients',
            'Established vocational training centers for youth',
          ]),
          politicalCareer: `Started political career in ${2000 + i}. Served as ${i < 4 ? 'Municipal Councillor' : 'MLA'} from ${2010 + i} to ${2015 + i}. Currently serving as ${i < 4 ? 'District President' : 'State Committee Member'}.`,
          mobile: `99001${String(i + 100).padStart(5, '0')}`,
          email: `${candidateData.name.toLowerCase().replace(' ', '.')}@example.com`,
          address: `${i + 1}/A, Gandhi Nagar, Ward ${i + 1}`,
          constituency: election?.constituency || 'Central Constituency',
          district: election?.district || 'Central District',
          state: election?.state || 'Tamil Nadu',
          nominationStatus: i < 6 ? 'ACCEPTED' : (i === 6 ? 'FILED' : 'WITHDRAWN'),
          nominationDate: new Date(2024, 2, 15 + i),
          isActive: true,
        },
      });

      createdCandidates.push(candidate);

      // Add social media profiles for each candidate
      const numProfiles = 3 + (i % 5); // 3 to 7 social media profiles per candidate
      for (let j = 0; j < numProfiles; j++) {
        const platform = socialMediaPlatforms[j % socialMediaPlatforms.length];
        const username = `${candidateData.name.toLowerCase().replace(' ', '_')}_official`;

        const baseFollowers = isOurCandidate ? 500000 : 50000 + (i * 10000);
        const followerVariation = Math.floor(Math.random() * 50000);

        await (client as any).candidateSocialMedia.create({
          data: {
            candidateId: candidate.id,
            platform,
            profileUrl: platform === 'WEBSITE'
              ? `https://www.${candidateData.name.toLowerCase().replace(' ', '')}.com`
              : platform === 'WHATSAPP'
              ? `https://wa.me/9199001${String(i + 100).padStart(5, '0')}`
              : platform === 'TELEGRAM'
              ? `https://t.me/${username}`
              : `https://www.${platform.toLowerCase()}.com/${username}`,
            username: platform === 'WEBSITE' ? null : username,
            displayName: candidateData.name,
            followers: baseFollowers + followerVariation,
            following: 200 + (j * 50),
            posts: 500 + (i * 100) + (j * 50),
            subscribers: platform === 'YOUTUBE' ? baseFollowers + followerVariation : 0,
            likes: Math.floor((baseFollowers + followerVariation) * 2.5),
            views: Math.floor((baseFollowers + followerVariation) * 15),
            comments: Math.floor((baseFollowers + followerVariation) * 0.3),
            shares: Math.floor((baseFollowers + followerVariation) * 0.5),
            engagementRate: 3.5 + (Math.random() * 4),
            verifiedStatus: isOurCandidate || i < 3,
            description: `Official ${platform} page of ${candidateData.name}. Candidate for ${election?.constituency || 'Central'} constituency.`,
          },
        });
      }

      // Add some documents for the first few candidates
      if (i < 4) {
        const documentTypes = ['RESUME', 'AFFIDAVIT', 'PHOTO_ID', 'ASSETS'];
        for (const docType of documentTypes) {
          await (client as any).candidateDocument.create({
            data: {
              candidateId: candidate.id,
              documentName: `${docType.toLowerCase().replace('_', ' ')} - ${candidateData.name}`,
              documentType: docType,
              storageProvider: 'LOCAL',
              fileUrl: `/uploads/candidates/${candidate.id}/${docType.toLowerCase()}.pdf`,
              mimeType: 'application/pdf',
              fileSize: 1024 * (100 + i * 50),
              description: `${docType.replace('_', ' ')} document for ${candidateData.name}`,
              isPublic: docType === 'AFFIDAVIT',
            },
          });
        }
      }
    }

    console.log(`  ✅ Created ${createdCandidates.length} candidates with social media profiles and documents`);

    // Create battle cards for first 3 candidates (our candidate vs opponents)
    if (createdCandidates.length >= 3) {
      const ourCandidate = createdCandidates[0];
      for (let i = 1; i < Math.min(4, createdCandidates.length); i++) {
        const opponent = createdCandidates[i];
        await (client as any).candidateBattleCard.create({
          data: {
            candidateId: ourCandidate.id,
            opponentId: opponent.id,
            title: `${ourCandidate.name} vs ${opponent.name}`,
            summary: `Strategic comparison between ${ourCandidate.name} and ${opponent.name} for the upcoming election. This battle card highlights key differentiators and talking points.`,
            ourStrengths: JSON.stringify([
              'Strong grassroots connection',
              'Proven track record of development',
              'Youth appeal and modern approach',
              'Cross-community support',
            ]),
            opponentWeaknesses: JSON.stringify([
              'Limited public engagement',
              'Unfulfilled previous promises',
              'Weak social media presence',
              'Party internal conflicts',
            ]),
            keyIssues: JSON.stringify([
              { issue: 'Employment', ourPosition: 'Job creation programs', theirPosition: 'No concrete plan' },
              { issue: 'Healthcare', ourPosition: 'Free health insurance', theirPosition: 'Privatization focus' },
              { issue: 'Education', ourPosition: 'Modern schools', theirPosition: 'Status quo' },
            ]),
            talkingPoints: JSON.stringify([
              'Highlight our development work in the past 5 years',
              'Emphasize our commitment to youth employment',
              'Focus on infrastructure improvements we have delivered',
            ]),
            counterArguments: JSON.stringify([
              { attack: 'Inexperience in governance', response: 'Fresh perspective with practical experience' },
              { attack: 'Outsider to the area', response: 'Born and raised here, knows local issues firsthand' },
            ]),
            voterAppeal: JSON.stringify({
              youth: { ours: 75, theirs: 45 },
              women: { ours: 68, theirs: 52 },
              farmers: { ours: 72, theirs: 60 },
              urban: { ours: 65, theirs: 55 },
            }),
            headToHeadStats: JSON.stringify({
              previousElections: { wins: 3, losses: 1 },
              currentPolls: { ours: 52, theirs: 38, undecided: 10 },
            }),
            isActive: true,
          },
        });
      }
      console.log(`  ✅ Created ${Math.min(3, createdCandidates.length - 1)} battle cards`);
    }

  } catch (error) {
    console.error(`  ❌ Error seeding candidates for ${dbName}:`, error);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  console.log('🚀 Starting candidates seed...\n');

  for (const tenant of TENANT_DBS) {
    await seedCandidatesForTenant(tenant.name, tenant.electionId, tenant.tenantId);
  }

  console.log('\n✨ Candidates seed completed!');
}

main().catch(console.error);
