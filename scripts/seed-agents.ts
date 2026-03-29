/**
 * Seed script for AI Agent testing
 * Run: DATABASE_URL="postgresql://leasefy:leasefy_dev@localhost:5433/leasefy_dev?schema=public" npx tsx scripts/seed-agents.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding test data for AI agents...\n')

  // --- Agency owner (landlord/agency) ---
  const agency = await db.user.upsert({
    where: { email: 'inmobiliaria@leasefy.co' },
    update: {},
    create: {
      clerkId: 'clerk_agency_001',
      email: 'inmobiliaria@leasefy.co',
      name: 'Inmobiliaria Demo Leasefy',
      phone: '+573001234567',
      role: 'LANDLORD',
    },
  })
  console.log(`✅ Agency: ${agency.name} (${agency.id})`)

  // --- Tenant applicant ---
  const tenant = await db.user.upsert({
    where: { email: 'carlos.martinez@gmail.com' },
    update: {},
    create: {
      clerkId: 'clerk_tenant_001',
      email: 'carlos.martinez@gmail.com',
      name: 'Carlos Andrés Martínez López',
      phone: '+573109876543',
      role: 'TENANT',
    },
  })
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`)

  // --- Properties ---
  const property1 = await db.property.upsert({
    where: { id: 'prop-chapinero-001' },
    update: {},
    create: {
      id: 'prop-chapinero-001',
      title: 'Apartamento moderno en Chapinero Alto',
      description: 'Hermoso apartamento de 2 habitaciones con vista a los cerros. Piso 8, ascensor, portería 24h.',
      address: 'Cra 7 #67-23, Apto 801',
      city: 'Bogotá',
      neighborhood: 'Chapinero Alto',
      priceMonthly: 2_800_000, // COP
      deposit: 2_800_000,
      bedrooms: 2,
      bathrooms: 2,
      area: 72,
      petFriendly: true,
      furnished: false,
      parking: true,
      availableFrom: new Date('2025-04-01'),
      status: 'ACTIVE',
      ownerId: agency.id,
    },
  })
  console.log(`✅ Property 1: ${property1.title} ($${property1.priceMonthly.toLocaleString('es-CO')} COP)`)

  const property2 = await db.property.upsert({
    where: { id: 'prop-usaquen-001' },
    update: {},
    create: {
      id: 'prop-usaquen-001',
      title: 'Estudio loft en Usaquén',
      description: 'Estudio tipo loft con altillo. Zona tranquila, cerca a parques y restaurantes.',
      address: 'Cll 119 #5-42, Apto 302',
      city: 'Bogotá',
      neighborhood: 'Usaquén',
      priceMonthly: 1_800_000,
      deposit: 1_800_000,
      bedrooms: 1,
      bathrooms: 1,
      area: 45,
      petFriendly: false,
      furnished: true,
      parking: false,
      availableFrom: new Date('2025-03-15'),
      status: 'ACTIVE',
      ownerId: agency.id,
    },
  })
  console.log(`✅ Property 2: ${property2.title} ($${property2.priceMonthly.toLocaleString('es-CO')} COP)`)

  const property3 = await db.property.upsert({
    where: { id: 'prop-cedritos-001' },
    update: {},
    create: {
      id: 'prop-cedritos-001',
      title: 'Casa familiar en Cedritos',
      description: 'Casa de 3 pisos con jardín y BBQ. Ideal para familias. Colegio cerca.',
      address: 'Cll 140 #12-55',
      city: 'Bogotá',
      neighborhood: 'Cedritos',
      priceMonthly: 3_500_000,
      deposit: 7_000_000,
      bedrooms: 3,
      bathrooms: 3,
      area: 120,
      petFriendly: true,
      furnished: false,
      parking: true,
      availableFrom: new Date('2025-04-15'),
      status: 'ACTIVE',
      ownerId: agency.id,
    },
  })
  console.log(`✅ Property 3: ${property3.title} ($${property3.priceMonthly.toLocaleString('es-CO')} COP)`)

  // --- Application (SUBMITTED, ready for scoring) ---
  const application = await db.application.upsert({
    where: { id: 'app-test-001' },
    update: {},
    create: {
      id: 'app-test-001',
      status: 'SUBMITTED',
      submittedAt: new Date(),
      applicantId: tenant.id,
      propertyId: property1.id,

      // Identity
      documentType: 'CC',
      documentNumber: '1030567890',
      birthDate: new Date('1992-06-15'),

      // Employment
      employmentType: 'employed',
      companyName: 'Rappi S.A.S.',
      jobTitle: 'Ingeniero de Software Senior',
      monthlyIncome: 8_500_000, // COP
      employmentMonths: 28,
      contractType: 'indefinido',

      // Financial
      monthlyDebt: 500_000,
      monthlyExpenses: 3_200_000,
      hasCosigner: false,

      // Stability
      currentAddressMonths: 24,
      previousLandlord: 'María García',
      previousLandlordPhone: '+573115551234',

      // References
      personalRefName: 'Juan Pérez',
      personalRefPhone: '+573201112233',
      personalRefRelation: 'Compañero de trabajo',

      // Documents (null for now — no uploaded files)
      identityDocUrl: null,
      incomeProofUrl: null,
    },
  })
  console.log(`\n✅ Application: ${application.id}`)
  console.log(`   Candidate: ${tenant.name}`)
  console.log(`   Property: ${property1.title}`)
  console.log(`   Income: $${application.monthlyIncome?.toLocaleString('es-CO')} COP`)
  console.log(`   Rent: $${property1.priceMonthly.toLocaleString('es-CO')} COP`)
  console.log(`   Ratio: ${((property1.priceMonthly / (application.monthlyIncome ?? 1)) * 100).toFixed(1)}%`)
  console.log(`   Status: ${application.status}`)

  console.log('\n========================')
  console.log('🎉 Seed complete!')
  console.log('\nTest the scoring API:')
  console.log(`  curl -X POST http://localhost:3001/api/agents/tenant-scoring \\`)
  console.log(`    -H "Content-Type: application/json" \\`)
  console.log(`    -d '{"applicationId": "${application.id}", "agencyId": "${agency.id}"}'`)
  console.log('')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
