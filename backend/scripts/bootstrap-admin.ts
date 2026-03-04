import dotenv from 'dotenv';
import path from 'path';

// Cargar .env del backend (desde backend/.env)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { PrismaClient, UserRole, UserStatus, MembershipRole } from '@prisma/client';
import { auth } from '../src/config/firebase';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD

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

  // Asegurar que exista una organización y el admin sea OWNER (para poder crear eventos)
  const org = await prisma.organization.upsert({
    where: { slug: 'astral-events' },
    update: {},
    create: {
      name: 'Astral Events',
      slug: 'astral-events',
      timezone: 'America/Argentina/Salta',
      currency: 'ARS',
      status: 'active',
    },
  })
  const user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    await prisma.membership.upsert({
      where: {
        userId_organizationId: { userId: user.id, organizationId: org.id },
      },
      update: { role: MembershipRole.OWNER },
      create: {
        userId: user.id,
        organizationId: org.id,
        role: MembershipRole.OWNER,
      },
    })
    console.log(`Organización "${org.name}" vinculada: ${email} es OWNER`)
  }

  // Crear o actualizar usuario en Firebase Auth (para poder hacer login)
  if (password) {
    try {
      const existingFirebaseUser = await auth.getUserByEmail(email)
      await auth.updateUser(existingFirebaseUser.uid, { password })
      console.log(`Contraseña de Firebase actualizada para ${email}`)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/user-not-found') {
        await auth.createUser({ email, password, emailVerified: true })
        console.log(`Usuario Firebase creado para ${email}`)
      } else {
        console.warn(
          'No se pudo crear/actualizar el usuario en Firebase (permisos IAM o red).',
          'Créalo manualmente en Firebase Console → Authentication → Users → Add user:',
          email,
          'Contraseña:', password
        )
      }
    }
  } else {
    console.log('BOOTSTRAP_ADMIN_PASSWORD no definido: no se crea/actualiza usuario en Firebase. Créalalo manualmente en Firebase Console.')
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