import { PrismaClient as TenantClient } from '../node_modules/.prisma/tenant-client/index.js';

const TENANT_DBS = [
  { name: 'EC_BJP_TN', electionId: 'bjp-tn-election-2024', tenantId: 'tenant-bjp-tn' },
  { name: 'EC_BJP_UP', electionId: 'bjp-up-election-2024', tenantId: 'tenant-bjp-up' },
  { name: 'EC_AIDMK_TN', electionId: 'aidmk-tn-election-2024', tenantId: 'tenant-aidmk-tn' },
];

// Sample survey templates
const surveyTemplates = [
  {
    title: 'Voter Sentiment Survey',
    titleLocal: 'வாக்காளர் கருத்து கணிப்பு',
    description: 'Understanding voter sentiment and key concerns in the constituency',
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'Which party do you intend to vote for?',
        questionLocal: 'நீங்கள் எந்த கட்சிக்கு வாக்களிக்க விரும்புகிறீர்கள்?',
        options: ['BJP', 'Congress', 'AIDMK', 'DMK', 'Others', 'Undecided'],
        required: true,
      },
      {
        id: 'q2',
        type: 'rating',
        question: 'How would you rate the current government\'s performance?',
        questionLocal: 'தற்போதைய அரசின் செயல்திறனை எவ்வாறு மதிப்பிடுவீர்கள்?',
        min: 1,
        max: 5,
        required: true,
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        question: 'What is the most important issue for you?',
        questionLocal: 'உங்களுக்கு மிக முக்கியமான பிரச்சினை என்ன?',
        options: ['Employment', 'Healthcare', 'Education', 'Infrastructure', 'Agriculture', 'Law & Order'],
        required: true,
      },
      {
        id: 'q4',
        type: 'yes_no',
        question: 'Are you satisfied with local development work?',
        questionLocal: 'உள்ளூர் வளர்ச்சி பணிகளில் திருப்தியா?',
        required: true,
      },
      {
        id: 'q5',
        type: 'text',
        question: 'Any suggestions for improvement?',
        questionLocal: 'மேம்பாட்டுக்கான உங்கள் பரிந்துரைகள்?',
        required: false,
      },
    ],
    targetAudience: {
      ageGroups: ['18-25', '26-35', '36-45', '46-60', '60+'],
      gender: ['MALE', 'FEMALE', 'OTHER'],
      categories: ['GENERAL', 'SC', 'ST', 'OBC'],
    },
  },
  {
    title: 'Development Priorities Survey',
    titleLocal: 'வளர்ச்சி முன்னுரிமை கணிப்பு',
    description: 'Collecting feedback on development priorities for the constituency',
    questions: [
      {
        id: 'q1',
        type: 'ranking',
        question: 'Rank the following development areas by priority',
        questionLocal: 'பின்வரும் வளர்ச்சி பகுதிகளை முன்னுரிமை அடிப்படையில் வரிசைப்படுத்தவும்',
        options: ['Roads', 'Water Supply', 'Electricity', 'Schools', 'Hospitals', 'Public Transport'],
        required: true,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'How satisfied are you with road conditions?',
        questionLocal: 'சாலை நிலைமைகளில் எவ்வளவு திருப்தி?',
        options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
        required: true,
      },
      {
        id: 'q3',
        type: 'rating',
        question: 'Rate the quality of public healthcare services',
        questionLocal: 'பொது சுகாதார சேவைகளின் தரத்தை மதிப்பிடுங்கள்',
        min: 1,
        max: 10,
        required: true,
      },
      {
        id: 'q4',
        type: 'multiple_select',
        question: 'Which facilities are needed in your area?',
        questionLocal: 'உங்கள் பகுதியில் என்ன வசதிகள் தேவை?',
        options: ['Park', 'Community Hall', 'Library', 'Sports Ground', 'Bus Stop', 'Street Lights'],
        required: true,
      },
    ],
    targetAudience: {
      ageGroups: ['18-25', '26-35', '36-45', '46-60', '60+'],
      gender: ['MALE', 'FEMALE', 'OTHER'],
    },
  },
  {
    title: 'Candidate Awareness Survey',
    titleLocal: 'வேட்பாளர் விழிப்புணர்வு கணிப்பு',
    description: 'Measuring awareness and perception of candidates',
    questions: [
      {
        id: 'q1',
        type: 'yes_no',
        question: 'Do you know who is contesting from your constituency?',
        questionLocal: 'உங்கள் தொகுதியில் யார் போட்டியிடுகிறார்கள் என்று தெரியுமா?',
        required: true,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'How did you hear about the candidates?',
        questionLocal: 'வேட்பாளர்களைப் பற்றி எவ்வாறு அறிந்தீர்கள்?',
        options: ['TV/News', 'Social Media', 'Newspaper', 'Door-to-door campaign', 'Public meetings', 'Word of mouth'],
        required: true,
      },
      {
        id: 'q3',
        type: 'rating',
        question: 'Rate your confidence in the leading candidate',
        questionLocal: 'முன்னணி வேட்பாளரின் மீதான நம்பிக்கையை மதிப்பிடுங்கள்',
        min: 1,
        max: 5,
        required: true,
      },
      {
        id: 'q4',
        type: 'text',
        question: 'What qualities do you look for in a candidate?',
        questionLocal: 'வேட்பாளரிடம் என்ன குணங்களை எதிர்பார்க்கிறீர்கள்?',
        required: false,
      },
    ],
    targetAudience: {
      ageGroups: ['18-25', '26-35', '36-45', '46-60'],
      gender: ['MALE', 'FEMALE'],
    },
  },
  {
    title: 'Youth Employment Survey',
    titleLocal: 'இளைஞர் வேலைவாய்ப்பு கணிப்பு',
    description: 'Understanding employment challenges faced by youth',
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'What is your current employment status?',
        questionLocal: 'உங்கள் தற்போதைய வேலைவாய்ப்பு நிலை என்ன?',
        options: ['Employed Full-time', 'Employed Part-time', 'Self-employed', 'Unemployed', 'Student', 'Homemaker'],
        required: true,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'What type of employment do you prefer?',
        questionLocal: 'எந்த வகையான வேலைவாய்ப்பை விரும்புகிறீர்கள்?',
        options: ['Government Job', 'Private Sector', 'Self-employment', 'Freelancing', 'Agriculture'],
        required: true,
      },
      {
        id: 'q3',
        type: 'multiple_select',
        question: 'What skills training would benefit you?',
        questionLocal: 'என்ன திறன் பயிற்சி உங்களுக்கு உதவும்?',
        options: ['Computer Skills', 'Communication', 'Technical Training', 'Entrepreneurship', 'Language Skills', 'Vocational Training'],
        required: true,
      },
      {
        id: 'q4',
        type: 'rating',
        question: 'Rate government employment schemes effectiveness',
        questionLocal: 'அரசின் வேலைவாய்ப்பு திட்டங்களின் செயல்திறனை மதிப்பிடுங்கள்',
        min: 1,
        max: 5,
        required: true,
      },
    ],
    targetAudience: {
      ageGroups: ['18-25', '26-35'],
      gender: ['MALE', 'FEMALE', 'OTHER'],
    },
  },
  {
    title: 'Women Safety & Welfare Survey',
    titleLocal: 'பெண்கள் பாதுகாப்பு மற்றும் நல கணிப்பு',
    description: 'Assessing women safety and welfare measures',
    questions: [
      {
        id: 'q1',
        type: 'rating',
        question: 'How safe do you feel in your neighborhood?',
        questionLocal: 'உங்கள் பகுதியில் எவ்வளவு பாதுகாப்பாக உணர்கிறீர்கள்?',
        min: 1,
        max: 5,
        required: true,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'Are you aware of women welfare schemes?',
        questionLocal: 'பெண்கள் நல திட்டங்களை பற்றி அறிவீர்களா?',
        options: ['Yes, all schemes', 'Yes, some schemes', 'Heard but don\'t know details', 'Not aware'],
        required: true,
      },
      {
        id: 'q3',
        type: 'multiple_select',
        question: 'Which welfare schemes have you benefited from?',
        questionLocal: 'எந்த நல திட்டங்களால் பயனடைந்தீர்கள்?',
        options: ['Free Bus Travel', 'Education Scholarship', 'Health Insurance', 'Self-help Groups', 'None'],
        required: true,
      },
      {
        id: 'q4',
        type: 'yes_no',
        question: 'Is there a police station nearby for emergencies?',
        questionLocal: 'அவசர நேரத்தில் அருகில் காவல் நிலையம் உள்ளதா?',
        required: true,
      },
    ],
    targetAudience: {
      gender: ['FEMALE'],
      ageGroups: ['18-25', '26-35', '36-45', '46-60', '60+'],
    },
  },
];

// Sample response generators
function generateSampleResponses(questions: any[], responseCount: number) {
  const responses = [];

  for (let i = 0; i < responseCount; i++) {
    const answers: Record<string, any> = {};

    for (const question of questions) {
      switch (question.type) {
        case 'multiple_choice':
          answers[question.id] = question.options[Math.floor(Math.random() * question.options.length)];
          break;
        case 'multiple_select':
          const numSelections = 1 + Math.floor(Math.random() * 3);
          const shuffled = [...question.options].sort(() => 0.5 - Math.random());
          answers[question.id] = shuffled.slice(0, numSelections);
          break;
        case 'rating':
          answers[question.id] = question.min + Math.floor(Math.random() * (question.max - question.min + 1));
          break;
        case 'yes_no':
          answers[question.id] = Math.random() > 0.4 ? 'Yes' : 'No';
          break;
        case 'ranking':
          answers[question.id] = [...question.options].sort(() => 0.5 - Math.random());
          break;
        case 'text':
          if (Math.random() > 0.3) {
            const textResponses = [
              'Better roads and infrastructure needed',
              'More job opportunities for youth',
              'Improve healthcare facilities',
              'Focus on education quality',
              'Reduce corruption',
              'More transparency in governance',
              'Better water supply needed',
              'Improve public transport',
            ];
            answers[question.id] = textResponses[Math.floor(Math.random() * textResponses.length)];
          }
          break;
      }
    }

    responses.push(answers);
  }

  return responses;
}

async function seedSurveysForTenant(dbName: string, electionId: string, tenantId: string) {
  const client = new TenantClient({
    datasources: {
      db: {
        url: `postgresql://postgres:postgres@localhost:5432/${dbName}`,
      },
    },
  });

  try {
    await client.$connect();
    console.log(`\n📦 Seeding surveys for ${dbName}...`);

    // Check if surveys already exist
    const existingCount = await client.survey.count();
    if (existingCount > 0) {
      console.log(`  ⏭️  Surveys already exist (${existingCount} found), skipping...`);
      return;
    }

    // Get election
    let election = await client.election.findFirst({
      where: { id: electionId },
    });

    if (!election) {
      console.log(`  ⚠️  Election not found (${electionId}), using first available election...`);
      election = await client.election.findFirst();
      if (!election) {
        console.log('  ⚠️  No elections found, skipping surveys seed');
        return;
      }
    }

    const actualElectionId = election.id;

    // Get some voters for responses
    const voters = await client.voter.findMany({ take: 100 });

    // Get a user to be the creator
    const adminUser = await client.user.findFirst({
      where: { role: 'ADMIN' },
    });

    const createdSurveys = [];

    for (let i = 0; i < surveyTemplates.length; i++) {
      const template = surveyTemplates[i];
      const responseCount = 50 + Math.floor(Math.random() * 150); // 50-200 responses per survey

      // Determine survey dates
      const now = new Date();
      const startOffset = i === 0 ? -30 : (i === 1 ? -15 : (i < 4 ? -7 : 0));
      const endOffset = i < 2 ? 0 : (i < 4 ? 7 : 30);

      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() + startOffset);

      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + endOffset);

      const isActive = i >= 2; // First two surveys are completed, rest are active

      const survey = await client.survey.create({
        data: {
          electionId: actualElectionId,
          title: template.title,
          titleLocal: template.titleLocal,
          description: template.description,
          questions: template.questions,
          targetAudience: template.targetAudience,
          startDate,
          endDate,
          isActive,
          totalResponses: isActive ? 0 : responseCount, // Only completed surveys show response count
          createdBy: adminUser?.id,
        },
      });

      createdSurveys.push(survey);

      // Generate sample responses for completed or active surveys
      if (i < 4) { // Generate responses for first 4 surveys
        const sampleResponses = generateSampleResponses(template.questions, responseCount);

        for (let j = 0; j < sampleResponses.length; j++) {
          const voter = voters.length > 0 ? voters[j % voters.length] : null;

          // Random location within Tamil Nadu / UP
          const baseLat = dbName.includes('UP') ? 26.8 : 11.0;
          const baseLng = dbName.includes('UP') ? 80.9 : 78.0;

          const respondentInfo = voter ? {
            name: `${voter.nameEn}`,
            age: voter.age,
            gender: voter.gender,
            area: voter.addressLine3 || 'Local Area',
          } : {
            name: `Respondent ${j + 1}`,
            age: 25 + Math.floor(Math.random() * 40),
            gender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
            area: `Area ${(j % 10) + 1}`,
          };

          const submittedAt = new Date(startDate);
          submittedAt.setDate(submittedAt.getDate() + Math.floor(Math.random() * Math.abs(endOffset - startOffset)));

          await client.surveyResponse.create({
            data: {
              surveyId: survey.id,
              voterId: voter?.id,
              respondentInfo,
              answers: sampleResponses[j],
              latitude: baseLat + (Math.random() - 0.5) * 2,
              longitude: baseLng + (Math.random() - 0.5) * 2,
              submittedBy: adminUser?.id,
              submittedAt,
            },
          });
        }

        // Update total responses count
        await client.survey.update({
          where: { id: survey.id },
          data: { totalResponses: responseCount },
        });
      }
    }

    console.log(`  ✅ Created ${createdSurveys.length} surveys with sample responses`);

  } catch (error) {
    console.error(`  ❌ Error seeding surveys for ${dbName}:`, error);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  console.log('🚀 Starting surveys seed...\n');

  for (const tenant of TENANT_DBS) {
    await seedSurveysForTenant(tenant.name, tenant.electionId, tenant.tenantId);
  }

  console.log('\n✨ Surveys seed completed!');
}

main().catch(console.error);
