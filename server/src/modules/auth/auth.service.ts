import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { unauthorized, badRequest } from '../../utils/app-error.js';
import { toPublicUser } from '../../utils/serializers.js';
import type { ChangePasswordInput, LoginInput, UpdateProfileInput } from './auth.validators.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

  // Message volontairement générique pour ne pas révéler si l'email existe.
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw unauthorized('Email ou mot de passe incorrect.');
  }
  if (!user.isActive) {
    throw unauthorized('Votre compte est désactivé. Contactez un administrateur.');
  }

  return { token: signToken(user.id), expiresIn: TOKEN_TTL_SECONDS, user: toPublicUser(user) };
}

export async function changePassword(req: AuthenticatedRequest, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    throw unauthorized();
  }
  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw badRequest('Le mot de passe actuel est incorrect.');
  }
  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}

export async function updateProfile(req: AuthenticatedRequest, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    },
  });
  return toPublicUser(user);
}
