import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:postgres@localhost:5432/ElectionCaffe?schema=public'
});

async function listUsers() {
  try {
    console.log('📋 All Users in Database:\n');
    console.log('=' .repeat(80));

    const users = await prisma.user.findMany({
      include: {
        tenant: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    users.forEach((user, i) => {
      console.log('\n' + (i+1) + '. User:');
      console.log('   Email: ' + (user.email || 'N/A'));
      console.log('   Mobile: ' + (user.mobile || 'N/A'));
      console.log('   Role: ' + user.role);
      console.log('   Status: ' + user.status);
      console.log('   Tenant: ' + (user.tenant?.name || 'No tenant'));
      console.log('   Tenant Type: ' + (user.tenant?.tenantType || 'N/A'));
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Login Instructions:');
    console.log('\nFor Web App (http://localhost:5176/):');
    console.log('   Use EMAIL (not mobile) to login');
    console.log('\nExample credentials:');
    console.log('   Email: admin.tn.bjp@electioncaffe.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
