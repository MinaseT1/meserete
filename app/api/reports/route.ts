import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'membership'
    const period = searchParams.get('period') || '1month'

    const data: Record<string, unknown> = {}
    
    // Calculate date range based on period
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '1month':
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case '3months':
        startDate.setMonth(endDate.getMonth() - 3)
        break
      case '6months':
        startDate.setMonth(endDate.getMonth() - 6)
        break
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      default:
        startDate.setMonth(endDate.getMonth() - 1)
    }

    switch (type) {
      case 'membership':
        // For membership, nest the data in a membership property to match frontend expectations
        data.membership = await getMembershipStats(startDate, endDate)
        break

      case 'ministry':
        // Use real ministry stats instead of sample data
        data.ministry = await getMinistryStats(startDate, endDate)
        break

      default:
        // For default case (membership), also nest the data in a membership property
        data.membership = await getMembershipStats(startDate, endDate)
        break
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error generating report data:', error)
    return NextResponse.json(
      { error: 'Failed to generate report data' },
      { status: 500 }
    )
  }
}











async function getMembershipStats(startDate: Date, endDate: Date) {
  try {
    // Get total members
    const totalMembers = await prisma.member.count({
      where: { status: 'ACTIVE' }
    });

    // Get new members in period
    const newMembers = await prisma.member.count({
      where: {
        status: 'ACTIVE',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Get members by age groups
    const allMembers = await prisma.member.findMany({
      where: { status: 'ACTIVE' },
      select: { dateOfBirth: true, createdAt: true }
    });

    // Get members by status
    const activeMembers = await prisma.member.count({
      where: { status: 'ACTIVE' }
    });
    
    const inactiveMembers = await prisma.member.count({
      where: { status: 'INACTIVE' }
    });
    
    const transferredMembers = await prisma.member.count({
      where: { status: 'TRANSFERRED' }
    });
    
    const suspendedMembers = await prisma.member.count({
      where: { status: 'SUSPENDED' }
    });
    
    // Calculate total for percentages
    const totalForPercentage = activeMembers + inactiveMembers + transferredMembers + suspendedMembers;
    
    // Calculate membership by status with real percentages
    const membershipByStatus = [
      { 
        status: 'Active', 
        count: activeMembers, 
        percentage: totalForPercentage > 0 ? Math.round((activeMembers / totalForPercentage) * 100) : 0 
      },
      { 
        status: 'Inactive', 
        count: inactiveMembers, 
        percentage: totalForPercentage > 0 ? Math.round((inactiveMembers / totalForPercentage) * 100) : 0 
      },
      { 
        status: 'Transferred', 
        count: transferredMembers, 
        percentage: totalForPercentage > 0 ? Math.round((transferredMembers / totalForPercentage) * 100) : 0 
      },
      { 
        status: 'Suspended', 
        count: suspendedMembers, 
        percentage: totalForPercentage > 0 ? Math.round((suspendedMembers / totalForPercentage) * 100) : 0 
      }
    ];

    const ageDistribution = calculateAgeDistribution(allMembers);
    const monthlyGrowth = await calculateMonthlyGrowth(startDate, endDate);
    
    // Calculate growth rate
    const previousMembers = totalMembers - newMembers;
    const growthRate = previousMembers > 0 ? parseFloat(((newMembers / previousMembers) * 100).toFixed(1)) : 0;

    return {
      totalMembers,
      newMembers,
      growthRate,
      activeRate: totalForPercentage > 0 ? Math.round((activeMembers / totalForPercentage) * 100) : 0,
      ageDistribution,
      monthlyGrowth,
      membershipByStatus
    };
  } catch (error) {
    console.error('Error in getMembershipStats:', error);
    throw error;
  }
}





async function getMinistryStats(startDate: Date, endDate: Date) {
  try {
    // Get all ministries with their member counts
    const ministries = await prisma.ministry.findMany({
      where: { isActive: true },
      include: {
        members: {
          where: { isActive: true },
          include: {
            member: {
              select: {
                status: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    // Calculate ministry participation data
    const ministryParticipation = ministries.map(ministry => {
      const totalMembers = ministry.members.length;
      const activeMembers = ministry.members.filter(mm => 
        mm.member.status === 'ACTIVE'
      ).length;
      const percentage = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;
      
      return {
        ministry: ministry.name,
        members: totalMembers,
        active: activeMembers,
        percentage
      };
    });

    // Calculate totals
    const totalMinistries = ministries.length;
    const totalParticipants = ministries.reduce((sum, ministry) => sum + ministry.members.length, 0);
    const activeMembers = ministries.reduce((sum, ministry) => 
      sum + ministry.members.filter(mm => mm.member.status === 'ACTIVE').length, 0
    );
    const participationRate = totalParticipants > 0 ? Math.round((activeMembers / totalParticipants) * 100) : 0;

    // Calculate monthly growth (new ministry members in the period)
    const newMembersInPeriod = ministries.reduce((sum, ministry) => {
      const newMembers = ministry.members.filter(mm => 
        mm.createdAt >= startDate && mm.createdAt <= endDate
      ).length;
      return sum + newMembers;
    }, 0);
    
    const previousMembers = totalParticipants - newMembersInPeriod;
    const monthlyGrowth = previousMembers > 0 ? parseFloat(((newMembersInPeriod / previousMembers) * 100).toFixed(1)) : 0;

    // Generate ministry stats for detailed view
    const ministryStats = ministries.map(ministry => {
      const totalMembers = ministry.members.length;
      const leaders = ministry.members.filter(mm => 
        mm.role && mm.role.toLowerCase().includes('leader')
      ).length;
      
      // Calculate growth for this ministry
      const newMembers = ministry.members.filter(mm => 
        mm.createdAt >= startDate && mm.createdAt <= endDate
      ).length;
      const previousTotal = totalMembers - newMembers;
      const growth = previousTotal > 0 ? parseFloat(((newMembers / previousTotal) * 100).toFixed(1)) : 0;
      
      return {
        name: ministry.name,
        members: totalMembers,
        leaders: leaders || 1, // At least 1 leader assumed
        activities: 4, // Default activities count
        growth
      };
    });

    // Generate participation trends (simplified for now)
    const participationTrends = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      
      const monthlyParticipation = await prisma.memberMinistry.count({
        where: {
          isActive: true,
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });
      
      participationTrends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        participation: monthlyParticipation,
        // Removed events data
      });
      
      current.setMonth(current.getMonth() + 1);
    }

    // Generate leadership data
    const leadershipData = ministries.map(ministry => {
      const totalMembers = ministry.members.length;
      const leaders = ministry.members.filter(mm => 
        mm.role && mm.role.toLowerCase().includes('leader')
      ).length || 1;
      const ratio = totalMembers > 0 ? parseFloat((totalMembers / leaders).toFixed(1)) : 0;
      
      return {
        ministry: ministry.name,
        leaders,
        members: totalMembers,
        ratio
      };
    });

    return {
      totalMinistries,
      activeMembers,
      participationRate,
      monthlyGrowth,
      ministryStats,
      participationTrends,
      leadershipData,
      ministryParticipation // Keep this for backward compatibility
    };
  } catch (error) {
    console.error('Error in getMinistryStats:', error);
    throw error;
  }
}

function calculateAgeDistribution(members: { dateOfBirth: Date | null }[]) {
  const ageGroups = {
    '0-18': 0,
    '19-35': 0,
    '36-50': 0,
    '51+': 0
  };

  const now = new Date();
  
  members.forEach(member => {
    if (member.dateOfBirth) {
      const age = now.getFullYear() - member.dateOfBirth.getFullYear();
      if (age <= 18) ageGroups['0-18']++;
      else if (age <= 35) ageGroups['19-35']++;
      else if (age <= 50) ageGroups['36-50']++;
      else ageGroups['51+']++;
    }
  });

  const total = Object.values(ageGroups).reduce((sum, count) => sum + count, 0);
  
  return Object.entries(ageGroups).map(([name, value]) => ({
    name,
    value: total > 0 ? Math.round((value / total) * 100) : 0,
    color: getColorForAgeGroup(name)
  }));
}

function getColorForAgeGroup(ageGroup: string) {
  const colors: { [key: string]: string } = {
    '0-18': '#8884d8',
    '19-35': '#82ca9d',
    '36-50': '#ffc658',
    '51+': '#ff7300'
  };
  return colors[ageGroup] || '#8884d8';
}

async function calculateMonthlyGrowth(startDate: Date, endDate: Date) {
  const months = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    const newMembers = await prisma.member.count({
      where: {
        status: 'ACTIVE',
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    const totalMembers = await prisma.member.count({
      where: {
        status: 'ACTIVE',
        createdAt: {
          lte: monthEnd
        }
      }
    });

    months.push({
      month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      members: totalMembers,
      newMembers,
      retention: 96 // Sample retention rate
    });

    current.setMonth(current.getMonth() + 1);
  }

  return months;
}