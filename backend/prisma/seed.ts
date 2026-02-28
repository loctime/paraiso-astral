import { PrismaClient } from '@prisma/client';
import { EventStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'astral-events' },
    update: {},
    create: {
      name: 'Astral Events',
      slug: 'astral-events',
      timezone: 'America/Argentina/Salta',
      currency: 'ARS',
      status: 'active',
    },
  });

  console.log('✅ Organization created:', organization.name);

  // Create Events
  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const upcomingDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  // Past Event
  const pastEvent = await prisma.event.create({
    data: {
      title: 'Cosmic Festival Past',
      slug: 'cosmic-festival-past',
      description: 'Un festival increíble que ya ocurrió en el pasado.',
      coverImage: 'https://example.com/past-event.jpg',
      startAt: pastDate,
      endAt: new Date(pastDate.getTime() + 8 * 60 * 60 * 1000), // 8 hours later
      venue: 'Cosmic Arena',
      address: '123 Galaxy Street',
      city: 'Salta',
      country: 'Argentina',
      status: EventStatus.PUBLISHED,
      isPublic: true,
      isFeatured: false,
      capacityTotal: 1000,
      organizationId: organization.id,
    },
  });

  console.log('✅ Past event created:', pastEvent.title);

  // Upcoming Event
  const upcomingEvent = await prisma.event.create({
    data: {
      title: 'Stellar Night Future',
      slug: 'stellar-night-future',
      description: 'Una noche estelar que está por venir. La mejor música electrónica del cosmos.',
      coverImage: 'https://example.com/future-event.jpg',
      startAt: upcomingDate,
      endAt: new Date(upcomingDate.getTime() + 8 * 60 * 60 * 1000), // 8 hours later
      venue: 'Stellar Club',
      address: '456 Nebula Avenue',
      city: 'Buenos Aires',
      country: 'Argentina',
      status: EventStatus.PUBLISHED,
      isPublic: true,
      isFeatured: true,
      capacityTotal: 500,
      organizationId: organization.id,
    },
  });

  console.log('✅ Upcoming event created:', upcomingEvent.title);

  // Draft Event (should not be visible publicly)
  const draftEvent = await prisma.event.create({
    data: {
      title: 'Secret Event Draft',
      slug: 'secret-event-draft',
      description: 'Este evento está en borrador y no debería ser visible públicamente.',
      coverImage: null,
      startAt: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 48 hours from now
      endAt: new Date(now.getTime() + 56 * 60 * 60 * 1000), // 56 hours from now
      venue: 'Secret Venue',
      address: '789 Hidden Street',
      city: 'Córdoba',
      country: 'Argentina',
      status: EventStatus.DRAFT,
      isPublic: false,
      isFeatured: false,
      capacityTotal: 200,
      organizationId: organization.id,
    },
  });

  console.log('✅ Draft event created:', draftEvent.title);

  console.log('🌟 Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Organizations: 1`);
  console.log(`   - Events: 3 (1 past, 1 upcoming, 1 draft)`);
  console.log(`   - Public Events: 2`);
  console.log(`   - Featured Events: 1`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  });
