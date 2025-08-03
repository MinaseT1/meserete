// Migration script to convert existing member IDs to MKC format
// Run this script to update all existing member IDs to the new MKC format

import { PrismaClient } from '@prisma/client';
import { convertToMKCFormat } from '../lib/id-utils';

const prisma = new PrismaClient();

async function migrateMemberIds() {
  console.log('🚀 Starting member ID migration to MKC format...');
  
  try {
    // Get all existing members
    const existingMembers = await prisma.member.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' } // Maintain chronological order
    });
    
    console.log(`📊 Found ${existingMembers.length} existing members`);
    
    // Filter out members that already have MKC format
    const membersToUpdate = existingMembers.filter(member => !member.id.startsWith('MKC'));
    
    if (membersToUpdate.length === 0) {
      console.log('✅ All member IDs are already in MKC format!');
      return;
    }
    
    console.log(`🔄 Converting ${membersToUpdate.length} member IDs to MKC format...`);
    
    // Generate mapping of old IDs to new MKC IDs
    const oldIds = membersToUpdate.map(member => member.id);
    const idMapping = convertToMKCFormat(oldIds);
    
    // Start transaction to update all related records
    await prisma.$transaction(async (tx) => {
      let updateCount = 0;
      
      for (const [oldId, newId] of Object.entries(idMapping)) {
        console.log(`  📝 Converting ${oldId} → ${newId}`);
        
        // Update member record
        await tx.member.update({
          where: { id: oldId },
          data: { id: newId }
        });
        
        // Update related MemberMinistry records
        await tx.memberMinistry.updateMany({
          where: { memberId: oldId },
          data: { memberId: newId }
        });
        
        // Update related Donation records
        await tx.donation.updateMany({
          where: { memberId: oldId },
          data: { memberId: newId }
        });
        
        // Update related Communication records (if any reference member IDs)
        await tx.communication.updateMany({
          where: { 
            OR: [
              { content: { contains: oldId } },
              { title: { contains: oldId } }
            ]
          },
          data: {
            content: {
              // This is a simple string replacement - in production you might want more sophisticated logic
              set: { content: { replace: [oldId, newId] } }
            }
          }
        });
        
        updateCount++;
      }
      
      console.log(`✅ Successfully updated ${updateCount} member IDs`);
    });
    
    console.log('🎉 Member ID migration completed successfully!');
    console.log('📋 Summary:');
    console.log(`   • Total members: ${existingMembers.length}`);
    console.log(`   • Updated to MKC format: ${membersToUpdate.length}`);
    console.log(`   • Already in MKC format: ${existingMembers.length - membersToUpdate.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateMemberIds()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateMemberIds };