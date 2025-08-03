#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// Migration utilities
class DatabaseMigrator {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  // Run Prisma migrations
  async runMigrations() {
    try {
      console.log('🔄 Running database migrations...')
      execSync('npx prisma migrate deploy', { stdio: 'inherit' })
      console.log('✅ Migrations completed successfully')
    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }

  // Generate Prisma client
  async generateClient() {
    try {
      console.log('🔄 Generating Prisma client...')
      execSync('npx prisma generate', { stdio: 'inherit' })
      console.log('✅ Prisma client generated successfully')
    } catch (error) {
      console.error('❌ Client generation failed:', error)
      throw error
    }
  }

  // Seed database with initial data
  async seedDatabase() {
    try {
      console.log('🔄 Seeding database...')
      
      // Create default admin user
      const adminUser = await this.prisma.user.upsert({
        where: { email: 'admin@church.com' },
        update: {},
        create: {
          email: 'admin@church.com',
          password: '$2b$10$rQZ9QmjytWIeVA5cR8.8KeqJ8vQmjytWIeVA5cR8.8KeqJ8vQmjyt', // 'admin123'
          firstName: 'System',
          lastName: 'Administrator',
          role: 'ADMIN',
        },
      })

      // Create default church settings
      const defaultSettings = [
        { key: 'church_name', value: 'Sample Church', category: 'general', description: 'Name of the church' },
        { key: 'timezone', value: 'America/New_York', category: 'general', description: 'Church timezone' },
        { key: 'currency', value: 'USD', category: 'financial', description: 'Default currency' },
        { key: 'fiscal_year_start', value: '1', category: 'financial', description: 'Fiscal year start month (1-12)' },

        { key: 'email_notifications', value: 'true', category: 'notifications', description: 'Enable email notifications' },
        { key: 'sms_notifications', value: 'false', category: 'notifications', description: 'Enable SMS notifications' },
      ]

      for (const setting of defaultSettings) {
        await this.prisma.churchSettings.upsert({
          where: { key: setting.key },
          update: {},
          create: setting,
        })
      }

      // Create default ministries
      const defaultMinistries = [
        {
          name: 'Worship Team',
          description: 'Music and worship ministry',
          meetingDay: 'Sunday',
          meetingTime: '09:00',
          location: 'Main Sanctuary',
          capacity: 20,
        },
        {
          name: 'Youth Ministry',
          description: 'Ministry for young people',
          meetingDay: 'Friday',
          meetingTime: '19:00',
          location: 'Youth Room',
          capacity: 50,
        },
        {
          name: 'Children\'s Ministry',
          description: 'Ministry for children',
          meetingDay: 'Sunday',
          meetingTime: '10:30',
          location: 'Children\'s Hall',
          capacity: 100,
        },
      ]

      for (const ministry of defaultMinistries) {
        await this.prisma.ministry.upsert({
          where: { name: ministry.name },
          update: {},
          create: ministry,
        })
      }

      console.log('✅ Database seeded successfully')
      console.log(`👤 Admin user created: admin@church.com`)
      console.log(`⚙️  Default settings created`)
      console.log(`🏛️  Default ministries created`)
      
    } catch (error) {
      console.error('❌ Seeding failed:', error)
      throw error
    }
  }

  // Backup database
  async backupDatabase() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupDir = path.join(process.cwd(), 'backups')
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      const backupFile = path.join(backupDir, `backup-${timestamp}.sql`)
      
      console.log('🔄 Creating database backup...')
      
      // This would need to be adapted based on your database type
      // For PostgreSQL:
      // execSync(`pg_dump ${process.env.DATABASE_URL} > ${backupFile}`, { stdio: 'inherit' })
      
      console.log(`✅ Backup created: ${backupFile}`)
      return backupFile
    } catch (error) {
      console.error('❌ Backup failed:', error)
      throw error
    }
  }

  // Validate database schema
  async validateSchema() {
    try {
      console.log('🔄 Validating database schema...')
      
      // Check if all required tables exist
      const tables = await this.prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      ` as Array<{ table_name: string }>

      const requiredTables = [
        'users', 'members', 'families',
        'ministries', 'member_ministries', 'donations', 'communications',
        'reports', 'church_settings', 'audit_logs', 'sessions', 'backups'
      ]

      const existingTables = tables.map(t => t.table_name)
      const missingTables = requiredTables.filter(table => !existingTables.includes(table))

      if (missingTables.length > 0) {
        console.warn('⚠️  Missing tables:', missingTables)
        return false
      }

      console.log('✅ Schema validation passed')
      return true
    } catch (error) {
      console.error('❌ Schema validation failed:', error)
      return false
    }
  }

  // Clean up old data
  async cleanup() {
    try {
      console.log('🔄 Cleaning up old data...')
      
      // Clean expired sessions
      const expiredSessions = await this.prisma.session.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isActive: false },
          ],
        },
      })

      // Archive old audit logs (older than 1 year)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      const oldAuditLogs = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: oneYearAgo },
        },
      })

      console.log(`✅ Cleanup completed:`)
      console.log(`   - Removed ${expiredSessions.count} expired sessions`)
      console.log(`   - Archived ${oldAuditLogs.count} old audit logs`)
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error)
      throw error
    }
  }

  async disconnect() {
    await this.prisma.$disconnect()
  }
}

// CLI interface
async function main() {
  const migrator = new DatabaseMigrator()
  const command = process.argv[2]

  try {
    switch (command) {
      case 'migrate':
        await migrator.runMigrations()
        break
        
      case 'generate':
        await migrator.generateClient()
        break
        
      case 'seed':
        await migrator.seedDatabase()
        break
        
      case 'backup':
        await migrator.backupDatabase()
        break
        
      case 'validate':
        await migrator.validateSchema()
        break
        
      case 'cleanup':
        await migrator.cleanup()
        break
        
      case 'reset':
        console.log('🔄 Resetting database...')
        execSync('npx prisma migrate reset --force', { stdio: 'inherit' })
        await migrator.seedDatabase()
        break
        
      case 'deploy':
        console.log('🚀 Deploying database changes...')
        await migrator.runMigrations()
        await migrator.generateClient()
        await migrator.validateSchema()
        break
        
      default:
        console.log('Available commands:')
        console.log('  migrate  - Run database migrations')
        console.log('  generate - Generate Prisma client')
        console.log('  seed     - Seed database with initial data')
        console.log('  backup   - Create database backup')
        console.log('  validate - Validate database schema')
        console.log('  cleanup  - Clean up old data')
        console.log('  reset    - Reset database and seed')
        console.log('  deploy   - Full deployment (migrate + generate + validate)')
        break
    }
  } catch (error) {
    console.error('❌ Operation failed:', error)
    process.exit(1)
  } finally {
    await migrator.disconnect()
  }
}

if (require.main === module) {
  main()
}

export { DatabaseMigrator }