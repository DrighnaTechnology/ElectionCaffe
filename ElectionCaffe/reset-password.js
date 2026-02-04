import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:postgres@localhost:5432/ElectionCaffe?schema=public'
});

async function resetPassword() {
  try {
    const email = 'admin@electioncaffe.com';
    const newPassword = 'admin123';

    console.log('🔄 Resetting password for:', email);
    console.log('   New password:', newPassword);

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log('   Generated hash:', hashedPassword.substring(0, 30) + '...');

    // Find the user first
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email
      }
    });

    if (!existingUser) {
      console.log('❌ User not found with email:', email);
      return;
    }

    // Update the user using ID
    const user = await prisma.user.update({
      where: {
        id: existingUser.id
      },
      data: {
        passwordHash: hashedPassword
      }
    });

    console.log('\n✅ Password reset successful!');
    console.log('   User ID:', user.id);
    console.log('   Email:', user.email);
    console.log('\n🔐 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', newPassword);
    console.log('\n🌐 Login at: http://localhost:5176/');

    // Test the password
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    console.log('\n✓ Password verification test:', isValid ? 'PASSED' : 'FAILED');

    // Also reset a few more common users
    const otherUsers = [
      'admin.tn.bjp@electioncaffe.com',
      'admin@demo-tenant.com'
    ];

    console.log('\n📝 Also resetting passwords for other common accounts...');
    for (const userEmail of otherUsers) {
      try {
        const otherUser = await prisma.user.findFirst({
          where: { email: userEmail }
        });
        if (otherUser) {
          await prisma.user.update({
            where: { id: otherUser.id },
            data: { passwordHash: hashedPassword }
          });
          console.log('   ✓', userEmail);
        }
      } catch (e) {
        // User might not exist
      }
    }

    console.log('\n✅ All passwords reset to: admin123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
