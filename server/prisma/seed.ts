import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed initial : crée les comptes utilisateurs, un par rôle disponible.
 * Aucune donnée de démonstration n'est insérée (biens, propriétaires, clients).
 *
 * Identifiants créés :
 *  - admin@gmail.com   / admin   (ADMIN)
 *  - manager@gmail.com / manager (MANAGER)
 *  - agent@gmail.com   / agent   (AGENT)
 *  - admin@agence.fr   / Admin2026! (ADMIN — compte d'origine)
 *
 * Mot de passe : à changer après la première connexion.
 */

interface SeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'AGENT' | 'MANAGER';
}

const seedUsers: SeedUser[] = [
  { email: 'admin@gmail.com', password: 'admin', firstName: 'Alice', lastName: 'Bernard', role: 'ADMIN' },
  { email: 'manager@gmail.com', password: 'manager', firstName: 'Marc', lastName: 'Dubois', role: 'MANAGER' },
  { email: 'agent@gmail.com', password: 'agent', firstName: 'Léa', lastName: 'Petit', role: 'AGENT' },
  { email: 'admin@agence.fr', password: 'Admin2026!', firstName: 'Admin', lastName: 'Agence', role: 'ADMIN' },
];

async function main() {
  for (const user of seedUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: null,
        passwordHash,
        role: user.role,
        isActive: true,
      },
    });
    console.log(`✓ Compte ${user.role} créé : ${user.email} / ${user.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
