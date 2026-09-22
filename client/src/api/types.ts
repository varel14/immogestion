import type { Client, Owner, User } from '../types/index.js';

/** Données de formulaire partagées entre création et modification d'utilisateur. */
export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: User['role'];
  password: string;
  isActive: boolean;
}

export interface UpdateUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: User['role'];
  isActive: boolean;
  password?: string;
}

export type OwnerInput = Omit<Owner, 'id' | 'createdAt' | 'updatedAt' | 'propertiesCount'>;

export type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>;

export interface PropertyInput {
  title: string;
  description: string | null;
  propertyType: string;
  transactionType: string;
  status: string;
  price: number | null;
  rentPrice: number | null;
  address: string | null;
  city: string | null;
  district: string | null;
  surfaceArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  ownerId: string | null;
}
