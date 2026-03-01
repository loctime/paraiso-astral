import { PrismaClient, UserRole, UserStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL

  if (!email) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL no definido en .env')
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    await prisma.user.update({
      where: { email },
      data: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE
      }
    })

    console.log(`Usuario ${email} promovido a ADMIN`)
  } else {
    await prisma.user.create({
      data: {
        firebaseUid: `bootstrap-${Date.now()}`,
        email,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE
      }
    })

    console.log(`Usuario ADMIN creado para ${email}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })