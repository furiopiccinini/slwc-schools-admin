#!/usr/bin/env node

/**
 * Database setup script for Prisma Postgres
 * Verify DATABASE_URL connectivity against Prisma Postgres.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Setting up database...');

  try {
    await prisma.$connect();
    console.log('Database connection successful');

    const schoolCount = await prisma.school.count();
    const instructorCount = await prisma.instructor.count();
    const subscriberCount = await prisma.subscriber.count();

    console.log(`Schools: ${schoolCount}`);
    console.log(`Instructors: ${instructorCount}`);
    console.log(`Subscribers: ${subscriberCount}`);
    console.log('Database setup completed');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
