import fs from 'node:fs';
import path from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed de l'application :
 *  1. Comptes utilisateurs — un par rôle disponible.
 *  2. Données de démonstration : propriétaires, clients, biens et médias
 *     (photos réelles du dossier client/public/images/properties/ — repli sur
 *     des photos SVG générées si le dossier est absent — + documents PDF
 *     générés dans server/uploads/).
 *  3. Pipeline commercial complet : intérêts, visites, demandes, offres,
 *     réservations, ventes, baux, états des lieux, échéances, quittances,
 *     paiements et journal d'audit — chaque opération découle de la précédente
 *     (ex. : une réservation CONVERTED correspond bien à une vente finalisée).
 *  4. Chaque compte utilisateur est rattaché à des données réelles : visites
 *     conduites, ventes gérées, états des lieux inspectés et entrées du
 *     journal d'audit liées par userId.
 *
 * Les comptes sont créés par upsert (jamais écrasés) ; les données de
 * démonstration, elles, sont réinitialisées à chaque exécution.
 *
 * Identifiants :
 *  - admin@gmail.com   / admin   (ADMIN)
 *  - manager@gmail.com / manager (MANAGER)
 *  - agent@gmail.com   / agent   (AGENT)
 *  - admin@agence.fr   / Admin2026! (ADMIN — compte d'origine)
 *
 * Portail client (annonce de location → espace « Mon compte ») :
 *  - chloe.lambert@email.fr / locataire (locataire du studio parisien)
 */

// ─── Utilisateurs ────────────────────────────────────────────────────────────

interface SeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'ADMIN' | 'AGENT' | 'MANAGER';
}

const seedUsers: SeedUser[] = [
  { email: 'admin@gmail.com', password: 'admin', firstName: 'Alice', lastName: 'Bernard', phone: '06 01 02 03 04', role: 'ADMIN' },
  { email: 'manager@gmail.com', password: 'manager', firstName: 'Marc', lastName: 'Dubois', phone: '06 05 06 07 08', role: 'MANAGER' },
  { email: 'agent@gmail.com', password: 'agent', firstName: 'Léa', lastName: 'Petit', phone: '06 09 10 11 12', role: 'AGENT' },
  { email: 'admin@agence.fr', password: 'Admin2026!', firstName: 'Admin', lastName: 'Agence', phone: '05 56 00 00 00', role: 'ADMIN' },
];

// ─── Propriétaires ───────────────────────────────────────────────────────────

const seedOwners = [
  {
    firstName: 'Marie', lastName: 'Dupont',
    phone: '06 12 34 56 78', email: 'marie.dupont@email.fr',
    address: '5 avenue de la Gare, 75011 Paris',
    identificationNumber: 'CIN AB123456',
    notes: 'Propriétaire fidèle depuis 2019. Préfère être contactée par téléphone en journée.',
  },
  {
    firstName: 'Jean', lastName: 'Moreau',
    phone: '06 98 76 54 32', email: 'jean.moreau@email.fr',
    address: '12 rue Victor Hugo, 69003 Lyon',
    identificationNumber: 'CIN AB234567',
    notes: 'Investisseur : possède plusieurs biens en région lyonnaise.',
  },
  {
    firstName: 'Sophie', lastName: 'Lefèvre',
    phone: '07 45 67 89 01', email: 'sophie.lefevre@email.fr',
    address: '8 place Bellecour, 69002 Lyon',
    identificationNumber: 'CIN AB345678',
    notes: null,
  },
  {
    firstName: 'Karim', lastName: 'Haddad',
    phone: '06 23 45 67 89', email: 'karim.haddad@email.fr',
    address: '45 boulevard Malesherbes, 75008 Paris',
    identificationNumber: 'CIN AB456789',
    notes: "Souhaite être informé avant toute visite d'un de ses biens.",
  },
  {
    firstName: 'Isabelle', lastName: 'Roux',
    phone: '06 78 90 12 34', email: 'isabelle.roux@email.fr',
    address: '3 chemin des Vignes, 33000 Bordeaux',
    identificationNumber: 'CIN AB567890',
    notes: "Vendeuse motivée, déménagement prévu dans l'année.",
  },
  {
    firstName: 'Pierre', lastName: 'Fontaine',
    phone: '07 12 23 34 45', email: 'pierre.fontaine@email.fr',
    address: '22 quai des Chartrons, 33000 Bordeaux',
    identificationNumber: 'CIN AB678901',
    notes: null,
  },
];

// ─── Clients ─────────────────────────────────────────────────────────────────

const seedClients = [
  {
    firstName: 'Laura', lastName: 'Benali',
    phone: '07 88 77 66 55', email: 'laura.benali@email.fr',
    address: '14 rue des Écoles, 93100 Montreuil',
    identificationNumber: 'CIN C112233',
    notes: "Recherche un appartement T3 à l'est de Paris. Budget autour de 230 000 000 FCFA.",
    isActive: true,
  },
  {
    firstName: 'Thomas', lastName: 'Girard',
    phone: '06 34 56 78 90', email: 'thomas.girard@email.fr',
    address: '7 impasse du Moulin, 77160 Provins',
    identificationNumber: 'CIN C223344',
    notes: "Souhaite une maison de campagne avec terrain, à une heure de Paris. Apport constitué, accord bancaire obtenu.",
    isActive: true,
  },
  {
    firstName: 'Emma', lastName: 'Rossi',
    phone: '07 11 22 33 44', email: 'emma.rossi@email.fr',
    address: '2 rue de la République, 33000 Bordeaux',
    identificationNumber: 'CIN C334455',
    notes: "Installée à Bordeaux après ses études à Lyon. Premier achat : un bien avec du caractère.",
    isActive: true,
  },
  {
    firstName: 'Nicolas', lastName: 'Weber',
    phone: '06 99 88 77 66', email: 'nicolas.weber@email.fr',
    address: '18 avenue Jean Jaurès, 75019 Paris',
    identificationNumber: 'CIN C445566',
    notes: 'Investisseur locatif, recherche des rendements sur petites surfaces.',
    isActive: true,
  },
  {
    firstName: 'Chloé', lastName: 'Lambert',
    phone: '07 55 44 33 22', email: 'chloe.lambert@email.fr',
    address: '9 rue du Commerce, 75015 Paris',
    identificationNumber: 'CIN C556677',
    notes: 'Recherche un studio ou un T2 meublé à Paris — mutation professionnelle.',
    isActive: true,
    // Compte du portail client (espace « Mon compte » du site public).
    password: 'locataire',
  },
  {
    firstName: 'Antoine', lastName: 'Mercier',
    phone: '06 66 55 44 33', email: 'antoine.mercier@email.fr',
    address: '31 rue Nationale, 59000 Lille',
    identificationNumber: 'CIN C667788',
    notes: "Cherche un local commercial pour son activité de traiteur — bail 3/6/9 souhaité.",
    isActive: true,
  },
  {
    firstName: 'Sarah', lastName: 'Cohen',
    phone: '07 22 33 44 55', email: 'sarah.cohen@email.fr',
    address: '5 rue Oberkampf, 75011 Paris',
    identificationNumber: 'CIN C778899',
    notes: 'Priorité à la luminosité et aux espaces extérieurs. Réservation en cours sur une villa à Bordeaux.',
    isActive: true,
  },
  {
    firstName: 'Maxime', lastName: 'Durand',
    phone: '06 44 33 22 11', email: 'maxime.durand@email.fr',
    address: '27 boulevard Voltaire, 75011 Paris',
    identificationNumber: 'CIN C889900',
    notes: "A suspendu son projet d'achat (financement refusé) — client archivé.",
    isActive: false,
  },
  {
    firstName: 'Hugo', lastName: 'Perret',
    phone: '07 61 25 42 09', email: 'hugo.perret@email.fr',
    address: '14 zone artisanale de Pompignac, 33370 Pompignac',
    identificationNumber: 'CIN C990011',
    notes: "Artisan menuisier : cherchait un hangar proche de Bordeaux pour son atelier. Acquisition finalisée.",
    isActive: true,
  },
];

// ─── Biens ───────────────────────────────────────────────────────────────────
// L'ordre du tableau va du plus ancien au plus récent : la référence
// BIEN-<année>-NNNN suit cet ordre et le tableau de bord affiche les
// derniers éléments de la liste comme « derniers biens ajoutés ».

interface SeedProperty {
  title: string;
  description: string;
  propertyType: 'HOUSE' | 'APARTMENT' | 'LAND' | 'COMMERCIAL' | 'OFFICE' | 'OTHER';
  transactionType: 'SALE' | 'RENT' | 'SALE_AND_RENT';
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RENTED' | 'UNAVAILABLE';
  price: number | null;
  rentPrice: number | null;
  address: string;
  city: string;
  district: string;
  surfaceArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  ownerIndex: number;
  isArchived?: boolean;
  photos: number;
  documents: string[];
}

const seedProperties: SeedProperty[] = [
  {
    title: 'Studio meublé au cœur du quartier latin',
    description: "Studio entièrement meublé et rénové, idéalement situé pour un investissement locatif. Cuisine équipée, salle d'eau moderne. Idéal location étudiante ou jeune actif.",
    propertyType: 'APARTMENT', transactionType: 'RENT', status: 'RENTED',
    price: null, rentPrice: 585000,
    address: '3 rue de la Sorbonne', city: 'Paris', district: 'Quartier latin',
    surfaceArea: 24, bedrooms: 0, bathrooms: 1,
    ownerIndex: 0, photos: 1, documents: ['Contrat de location'],
  },
  {
    title: 'Longère rénovée au calme',
    description: 'Longère de caractère entièrement rénovée : pierres apparentes, poêle à bois, grange attenante. Grand terrain arboré sans vis-à-vis. Vendue en deux mois.',
    propertyType: 'HOUSE', transactionType: 'SALE', status: 'SOLD',
    price: 219500000, rentPrice: null,
    address: '14 route de Provins', city: 'Provins', district: 'Centre',
    surfaceArea: 145, bedrooms: 4, bathrooms: 2,
    ownerIndex: 1, photos: 2, documents: ['Titre de propriété', 'Diagnostics techniques'],
  },
  {
    title: 'T2 rénové proche métro',
    description: "Appartement de deux pièces traversant, refait à neuf : parquet, cuisine équipée, salle de bain avec douche à l'italienne. À deux pas du métro et des commerces.",
    propertyType: 'APARTMENT', transactionType: 'RENT', status: 'AVAILABLE',
    price: null, rentPrice: 510000,
    address: '21 cours de la Libération', city: 'Lyon', district: 'La Guillotière',
    surfaceArea: 45, bedrooms: 1, bathrooms: 1,
    ownerIndex: 2, photos: 2, documents: [],
  },
  {
    title: 'Terrain constructible viabilisé',
    description: "Terrain plat et viabilisé en bordure de lotissement, exposition sud. Raccordements eau, électricité et tout-à-l'égout en limite de parcelle. Libre de tout constructeur.",
    propertyType: 'LAND', transactionType: 'SALE', status: 'AVAILABLE',
    price: 121500000, rentPrice: null,
    address: 'Lotissement des Chênes, lot 7', city: 'Massy', district: 'Les Graviers',
    surfaceArea: 650, bedrooms: null, bathrooms: null,
    ownerIndex: 3, photos: 1, documents: ["Certificat d'urbanisme"],
  },
  {
    title: "Local commercial pied d'immeuble",
    description: 'Emplacement n°1 : local commercial avec vaste vitrine, anciennement une boulangerie. Fort passage piétonnier, stationnement à proximité. Bail tout commerce possible.',
    propertyType: 'COMMERCIAL', transactionType: 'RENT', status: 'AVAILABLE',
    price: null, rentPrice: 1575000,
    address: '58 rue du Faubourg Saint-Antoine', city: 'Paris', district: 'Bastille',
    surfaceArea: 85, bedrooms: null, bathrooms: 1,
    ownerIndex: 0, photos: 2, documents: ['Bail type 3/6/9'],
  },
  {
    title: 'Plateau de bureaux moderne',
    description: "Plateau de bureaux lumineux au 3e étage d'un immeuble de standing récent : climatisation, fibre optique, accès PMR, 4 places de parking en sous-sol.",
    propertyType: 'OFFICE', transactionType: 'RENT', status: 'AVAILABLE',
    price: null, rentPrice: 1900000,
    address: '9 rue Garibaldi', city: 'Lyon', district: 'Part-Dieu',
    surfaceArea: 140, bedrooms: null, bathrooms: 2,
    ownerIndex: 2, photos: 2, documents: ['DPE', 'Plan des locaux'],
  },
  {
    title: 'Villa contemporaine avec piscine',
    description: "Villa d'architecte de 2018 : vastes volumes baignés de lumière, cuisine ouverte haut de gamme, piscine chauffée et pool house. Prestations premium.",
    propertyType: 'HOUSE', transactionType: 'SALE', status: 'RESERVED',
    price: 449500000, rentPrice: null,
    address: '11 allée des Palmiers', city: 'Bordeaux', district: 'Caudéran',
    surfaceArea: 180, bedrooms: 5, bathrooms: 3,
    ownerIndex: 5, photos: 3, documents: ['Titre de propriété', 'Notice de la piscine'],
  },
  {
    title: 'Duplex atypique sous combles',
    description: "Duplex plein de charme au dernier étage : mezzanine, poutres apparentes, terrasse plein sud. Possibilité d'achat ou de location meublée longue durée.",
    propertyType: 'APARTMENT', transactionType: 'SALE_AND_RENT', status: 'AVAILABLE',
    price: 292000000, rentPrice: 1080000,
    address: '7 rue Notre-Dame', city: 'Bordeaux', district: 'Chartrons',
    surfaceArea: 96, bedrooms: 3, bathrooms: 2,
    ownerIndex: 5, photos: 3, documents: ['Règlement de copropriété'],
  },
  {
    title: 'Maison familiale avec jardin',
    description: 'Maison de ville lumineuse avec jardin clos de 200 m² : séjour double, cuisine ouverte, quatre chambres et garage. Quartier résidentiel recherché, écoles à pied.',
    propertyType: 'HOUSE', transactionType: 'SALE', status: 'AVAILABLE',
    price: 259500000, rentPrice: null,
    address: '8 allée des Peupliers', city: 'Nantes', district: 'Procé',
    surfaceArea: 120, bedrooms: 4, bathrooms: 2,
    ownerIndex: 4, photos: 3, documents: ['Diagnostics techniques'],
  },
  {
    title: 'Appartement lumineux avec balcon',
    description: 'Bel appartement rénové proche des commerces : séjour lumineux ouvrant sur balcon, deux chambres calmes, cave inclus. Copropriété bien entretenue.',
    propertyType: 'APARTMENT', transactionType: 'SALE', status: 'AVAILABLE',
    price: 189500000, rentPrice: null,
    address: '12 rue des Lilas', city: 'Paris', district: 'Belleville',
    surfaceArea: 62.5, bedrooms: 2, bathrooms: 1,
    ownerIndex: 0, photos: 2, documents: ['Règlement de copropriété', 'DPE'],
  },
  {
    title: 'Hangar agricole avec terrain',
    description: 'Hangar de 320 m² sur terrain clos de 1 500 m², en périphérie immédiate. Nécessitait des travaux de mise aux normes — acquis par un artisan menuisier pour son atelier.',
    propertyType: 'OTHER', transactionType: 'SALE', status: 'SOLD',
    price: 164000000, rentPrice: null,
    address: 'Route de Saucats', city: 'Cestas', district: 'Le Burck',
    surfaceArea: 320, bedrooms: null, bathrooms: null,
    ownerIndex: 4, photos: 1, documents: [],
  },
  {
    title: 'Loft industriel en plein ciel de la Croix-Rousse',
    description: "Ancien atelier de canuts transformé en loft : verrière d'époque, béton ciré, hauteur sous plafond de 4 m. (Dossier archivé en attente de décision du propriétaire.)",
    propertyType: 'APARTMENT', transactionType: 'SALE', status: 'AVAILABLE',
    price: 272000000, rentPrice: null,
    address: '2 montée Saint-Sébastien', city: 'Lyon', district: 'Croix-Rousse',
    surfaceArea: 88, bedrooms: 2, bathrooms: 1,
    ownerIndex: 1, isArchived: true, photos: 2, documents: [],
  },
];

// ─── Génération des fichiers médias ──────────────────────────────────────────

const uploadDir = path.resolve(process.cwd(), 'uploads');

/**
 * Photos de démonstration réelles : issues du dossier public du frontend
 * (client/public/images/properties/). Le repli sur des SVG générés garde le
 * seed fonctionnel si le dossier d'images est absent.
 */
const photoPoolDirs = [
  path.resolve(process.cwd(), '../client/public/images/properties'),
  path.resolve(process.cwd(), 'client/public/images/properties'),
];
const photoPoolDir = photoPoolDirs.find((dir) => fs.existsSync(dir)) ?? null;
const photoPool: string[] = photoPoolDir
  ? fs.readdirSync(photoPoolDir).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort()
  : [];

const mimeByExtension: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

/** Choix déterministe de `count` photos distinctes dans le pool disponible. */
function pickPoolPhotos(propertyIndex: number, count: number): string[] {
  if (photoPool.length === 0) return [];
  const start = (propertyIndex * 5) % photoPool.length;
  return Array.from({ length: count }, (_, j) => photoPool[(start + j) % photoPool.length]);
}

/** Palette déterministe de dégradés pour les photos de démonstration. */
const palettes = [
  ['#1e3a5f', '#3b82f6'], ['#134e4a', '#14b8a6'], ['#4c1d95', '#a78bfa'],
  ['#7c2d12', '#fb923c'], ['#14532d', '#4ade80'], ['#831843', '#f472b6'],
  ['#1e293b', '#64748b'], ['#713f12', '#facc15'],
];

const typeLabelsFr: Record<SeedProperty['propertyType'], string> = {
  HOUSE: 'Maison', APARTMENT: 'Appartement', LAND: 'Terrain',
  COMMERCIAL: 'Local commercial', OFFICE: 'Bureau', OTHER: 'Autre',
};

/** Génère une photo SVG de démonstration (dégradé + libellés du bien). */
function buildPhotoSvg(property: SeedProperty, reference: string, index: number, total: number): string {
  const [c1, c2] = palettes[(index + total) % palettes.length];
  const vue = index === 0 ? 'Vue principale' : `Vue ${index + 1}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <g fill="#ffffff" opacity="0.12">
    <rect x="90" y="330" width="260" height="170"/>
    <polygon points="80,330 220,230 360,330"/>
    <rect x="440" y="300" width="120" height="200"/>
    <polygon points="430,300 500,240 570,300"/>
    <rect x="620" y="380" width="100" height="120"/>
  </g>
  <text x="400" y="255" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#ffffff" opacity="0.85">${vue} — ${typeLabelsFr[property.propertyType]}</text>
  <text x="400" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#ffffff" opacity="0.7">${escapeXml(property.city)} · ${escapeXml(property.district)}</text>
  <text x="400" y="540" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#ffffff" opacity="0.6">${escapeXml(reference)} — photo de démonstration</text>
</svg>`;
}

/** Photo SVG d'état des lieux (pièce observée). */
function buildInspectionSvg(roomLabel: string, contextLabel: string): string {
  const [c1, c2] = palettes[Math.floor(roomLabel.length % palettes.length)];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <g fill="#ffffff" opacity="0.15">
    <rect x="120" y="260" width="180" height="240"/>
    <rect x="500" y="230" width="200" height="270"/>
    <circle cx="400" cy="180" r="60"/>
  </g>
  <text x="400" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#ffffff" opacity="0.9">État des lieux — ${escapeXml(roomLabel)}</text>
  <text x="400" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#ffffff" opacity="0.7">${escapeXml(contextLabel)}</text>
  <text x="400" y="540" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#ffffff" opacity="0.6">Photo de démonstration</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Génère un PDF minimal valide (une page, Helvetica) pour les documents. */
function buildPdf(title: string, lines: string[]): Buffer {
  const strip = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const esc = (s: string) => strip(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const textCommands = [
    `BT /F1 18 Tf 60 780 Td (${esc(title)}) Tj ET`,
    ...lines.map((line, i) => `BT /F1 12 Tf 60 ${740 - i * 22} Td (${esc(line)}) Tj ET`),
  ].join('\n');
  const stream = textCommands + '\n';

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

// ─── Aides temporelles ───────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();

/** Date à `days` jours de maintenant (négatif = passé), heure fixée. */
function at(days: number, hour = 10, minute = 0): Date {
  const d = new Date(now.getTime() + days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Décalage de `months` mois (négatif = passé), jour écrasé si possible. */
function shiftMonths(months: number, day?: number): Date {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  const targetDay = day ?? d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, lastDay));
  return d;
}

/** Échéances mensuelles d'un bail (jour d'échéance), comme generateInvoices. */
function monthlyDueDates(start: Date, end: Date, paymentDay: number): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor <= last) {
    const due = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), paymentDay, 12));
    if (due >= start && due <= end) dates.push(due);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return dates;
}

const periodLabel = (date: Date): string =>
  new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);

/**
 * Attribue des références PREFIX-<année>-NNNN dans l'ordre chronologique,
 * comme le ferait l'application au fil des créations.
 */
function assignReferences<T>(items: T[], prefix: string, getDate: (item: T) => Date): void {
  const counters = new Map<number, number>();
  const sorted = [...items].sort((a, b) => getDate(a).getTime() - getDate(b).getTime());
  for (const item of sorted) {
    const year = getDate(item).getFullYear();
    const next = (counters.get(year) ?? 0) + 1;
    counters.set(year, next);
    (item as { reference?: string }).reference = `${prefix}-${year}-${String(next).padStart(4, '0')}`;
  }
}

// ─── Exécution ───────────────────────────────────────────────────────────────

async function seedUsers_() {
  for (const user of seedUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        passwordHash,
        role: user.role,
        isActive: true,
      },
    });
    console.log(`✓ Compte ${user.role} : ${user.email} / ${user.password}`);
  }
}

async function resetDemoData() {
  // Ordre respectant les clés étrangères (tables Phase 2/3 d'abord).
  await prisma.payment.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.rentInvoice.deleteMany({});
  await prisma.inspectionItem.deleteMany({});
  await prisma.propertyInspection.deleteMany({});
  await prisma.rentalContract.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.purchaseOffer.deleteMany({});
  await prisma.propertyRequest.deleteMany({});
  await prisma.visit.deleteMany({});
  await prisma.clientInterest.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.propertyMedia.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.owner.deleteMany({});
  await prisma.client.deleteMany({});

  fs.mkdirSync(uploadDir, { recursive: true });
  for (const file of fs.readdirSync(uploadDir)) {
    if (file.startsWith('seed-')) {
      fs.rmSync(path.join(uploadDir, file), { force: true });
    }
  }
}

async function seedDemoData() {
  const owners = await Promise.all(
    seedOwners.map((owner) => prisma.owner.create({ data: owner })),
  );
  console.log(`✓ ${owners.length} propriétaires créés`);

  const clients = await Promise.all(
    seedClients.map((client) => {
      const { password, ...data } = client as typeof client & { password?: string };
      return prisma.client.create({
        data: password ? { ...data, passwordHash: bcrypt.hashSync(password, 10) } : data,
      });
    }),
  );
  console.log(`✓ ${clients.length} clients créés (dont 1 compte portail : chloe.lambert@email.fr)`);

  const year = new Date().getFullYear();
  let photosCreated = 0;
  let documentsCreated = 0;
  const properties: { id: string; reference: string }[] = [];

  for (let i = 0; i < seedProperties.length; i++) {
    const property = seedProperties[i];
    const reference = `BIEN-${year}-${String(i + 1).padStart(4, '0')}`;
    const owner = owners[property.ownerIndex];
    // Du plus ancien au plus récent : espacement de 5 jours.
    const createdAt = new Date(now.getTime() - (seedProperties.length - i) * 5 * DAY);

    const media: {
      kind: 'PHOTO' | 'DOCUMENT';
      url: string;
      fileName: string;
      mimeType: string;
      size: number;
      isPrimary: boolean;
    }[] = [];

    // Galerie : au moins 3 photos par bien pour un rendu de démonstration réaliste.
    const photoCount = Math.max(property.photos, 3);
    const poolPhotos = pickPoolPhotos(i, photoCount);

    for (let p = 0; p < photoCount; p++) {
      if (poolPhotos.length > 0) {
        const file = poolPhotos[p];
        const filePath = path.join(photoPoolDir!, file);
        media.push({
          kind: 'PHOTO',
          url: `/images/properties/${file}`,
          fileName: file,
          mimeType: mimeByExtension[path.extname(file).toLowerCase()] ?? 'image/jpeg',
          size: fs.statSync(filePath).size,
          isPrimary: p === 0,
        });
      } else {
        const fileName = `seed-photo-${String(i + 1).padStart(2, '0')}-${p + 1}.svg`;
        const svg = buildPhotoSvg(property, reference, p, photoCount);
        fs.writeFileSync(path.join(uploadDir, fileName), svg, 'utf8');
        media.push({
          kind: 'PHOTO',
          url: `/uploads/${fileName}`,
          fileName: `photo-${p + 1}.svg`,
          mimeType: 'image/svg+xml',
          size: Buffer.byteLength(svg, 'utf8'),
          isPrimary: p === 0,
        });
      }
      photosCreated++;
    }

    for (const document of property.documents) {
      const slug = document.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
      const fileName = `seed-doc-${String(i + 1).padStart(2, '0')}-${slug}.pdf`;
      const pdf = buildPdf(document, [
        `Bien : ${property.title}`,
        `Reference : ${reference}`,
        `Ville : ${property.city} (${property.district})`,
        '',
        'Ce document fait partie des donnees de demonstration.',
        'Il ne constitue pas un veritable document officiel.',
      ]);
      fs.writeFileSync(path.join(uploadDir, fileName), pdf);
      media.push({
        kind: 'DOCUMENT',
        url: `/uploads/${fileName}`,
        fileName: `${document}.pdf`,
        mimeType: 'application/pdf',
        size: pdf.length,
        isPrimary: false,
      });
      documentsCreated++;
    }

    const created = await prisma.property.create({
      data: {
        reference,
        title: property.title,
        description: property.description,
        propertyType: property.propertyType,
        transactionType: property.transactionType,
        status: property.status,
        price: property.price,
        rentPrice: property.rentPrice,
        address: property.address,
        city: property.city,
        district: property.district,
        surfaceArea: property.surfaceArea,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        ownerId: owner.id,
        isArchived: property.isArchived ?? false,
        createdAt,
        updatedAt: createdAt,
        media: { create: media },
      },
    });
    properties.push({ id: created.id, reference });
  }

  console.log(`✓ ${seedProperties.length} biens créés (${photosCreated} photos, ${documentsCreated} documents)`);
  return { owners, clients, properties };
}

// ─── Pipeline commercial (Phases 2 & 3) ──────────────────────────────────────
// Chaque histoire suit le cycle réel de l'application :
// intérêt → visite → demande → offre → réservation → vente / bail.

type DbClients = Awaited<ReturnType<typeof seedDemoData>>['clients'];

async function seedPipeline({ clients, owners, properties }: { clients: DbClients; owners: { id: string }[]; properties: { id: string; reference: string }[] }) {
  // Les fiches clients sont créées en parallèle (createdAt identiques) :
  // on les relit par email pour un appariement déterministe avec le pipeline.
  const clientByEmail = async (email: string) => {
    const client = await prisma.client.findFirst({ where: { email } });
    if (!client) throw new Error(`Client de démonstration introuvable : ${email}`);
    return client;
  };
  const [users, laura, thomas, emma, nicolas, chloe, antoine, sarah, maxime, hugo] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    clientByEmail('laura.benali@email.fr'),
    clientByEmail('thomas.girard@email.fr'),
    clientByEmail('emma.rossi@email.fr'),
    clientByEmail('nicolas.weber@email.fr'),
    clientByEmail('chloe.lambert@email.fr'),
    clientByEmail('antoine.mercier@email.fr'),
    clientByEmail('sarah.cohen@email.fr'),
    clientByEmail('maxime.durand@email.fr'),
    clientByEmail('hugo.perret@email.fr'),
  ]);
  const manager = users.find((u) => u.role === 'MANAGER')!;
  const agent = users.find((u) => u.role === 'AGENT')!;
  const admin = users.find((u) => u.email === 'admin@gmail.com')!;
  const agenceAdmin = users.find((u) => u.email === 'admin@agence.fr')!;

  // Index des biens : même ordre que seedProperties.
  const [studio, longere, t2Lyon, terrain, local, bureaux, villa, duplex, maisonNantes, t3Paris, hangar] = properties;

  // ── 1. Intérêts clients ────────────────────────────────────────────────
  const mkInterest = (
    client: { id: string }, property: { id: string }, transactionType: 'SALE' | 'RENT',
    status: 'NEW' | 'CONTACTED' | 'VISIT_PLANNED' | 'NEGOTIATING' | 'DROPPED' | 'CONVERTED',
    date: Date, notes: string | null,
  ) => ({
    clientId: client.id, propertyId: property.id, transactionType, status, notes,
    createdAt: date,
    updatedAt: status === 'NEW' ? date : new Date(Math.min(date.getTime() + 3 * DAY, now.getTime())),
  });

  const interests = await Promise.all([
    // Chloé → studio (location) : devenue locataire.
    prisma.clientInterest.create({ data: mkInterest(chloe, studio, 'RENT', 'CONVERTED', at(-168), 'Très intéressée, disponible pour une visite rapide.') }),
    // Thomas → longère (vente) : achat finalisé.
    prisma.clientInterest.create({ data: mkInterest(thomas, longere, 'SALE', 'CONVERTED', at(-130), 'Recherche une maison à la campagne depuis plusieurs mois.') }),
    // Sarah → villa (vente) : réservation en cours.
    prisma.clientInterest.create({ data: mkInterest(sarah, villa, 'SALE', 'NEGOTIATING', at(-45), 'Coup de cœur pour la lumière et le jardin.') }),
    // Laura → T3 Paris (vente) : vente en cours de finalisation.
    prisma.clientInterest.create({ data: mkInterest(laura, t3Paris, 'SALE', 'NEGOTIATING', at(-25), null) }),
    // Laura → duplex Bordeaux : recherche complémentaire.
    prisma.clientInterest.create({ data: mkInterest(laura, duplex, 'SALE', 'NEW', at(-6), null) }),
    // Emma → duplex Bordeaux : visite planifiée.
    prisma.clientInterest.create({ data: mkInterest(emma, duplex, 'SALE', 'VISIT_PLANNED', at(-9), 'Premier achat, très motivée.') }),
    // Antoine → local commercial : négociation du bail.
    prisma.clientInterest.create({ data: mkInterest(antoine, local, 'RENT', 'NEGOTIATING', at(-15), "Souhaite un bail 3/6/9 avec travaux pris en charge par le bailleur si possible.") }),
    // Antoine → bureaux : dossier abandonné.
    prisma.clientInterest.create({ data: mkInterest(antoine, bureaux, 'RENT', 'DROPPED', at(-50), 'Surface trop grande pour son activité de traiteur.') }),
    // Nicolas → T3 Paris : offre refusée.
    prisma.clientInterest.create({ data: mkInterest(nicolas, t3Paris, 'SALE', 'DROPPED', at(-30), 'Budget limité, souhaite négocier ferme.') }),
    // Nicolas → T2 Lyon : orientation vers la location.
    prisma.clientInterest.create({ data: mkInterest(nicolas, t2Lyon, 'RENT', 'CONTACTED', at(-10), null) }),
    // Maxime → maison Nantes : projet suspendu.
    prisma.clientInterest.create({ data: mkInterest(maxime, maisonNantes, 'SALE', 'DROPPED', at(-58), 'Projet mis en pause en attendant son financement.') }),
    // Hugo → hangar (vente) : acquisition finalisée pour son atelier.
    prisma.clientInterest.create({ data: mkInterest(hugo, hangar, 'SALE', 'CONVERTED', at(-95), 'Cherche un hangar proche de Bordeaux pour son atelier de menuiserie.') }),
  ]);
  console.log(`✓ ${interests.length} intérêts clients créés`);

  // ── 2. Visites ─────────────────────────────────────────────────────────
  const visits = await Promise.all([
    prisma.visit.create({ data: {
      propertyId: studio.id, clientId: chloe.id, agentId: agent.id, interestId: interests[0].id,
      scheduledAt: at(-165, 14, 30), status: 'COMPLETED',
      notes: 'Visite avec remise des clés de service.',
      feedback: 'Très séduite par la luminosité et les équipements. Souhaite déposer une demande sans attendre.',
      createdAt: at(-166), updatedAt: at(-164),
    } }),
    prisma.visit.create({ data: {
      propertyId: longere.id, clientId: thomas.id, agentId: manager.id, interestId: interests[1].id,
      scheduledAt: at(-120, 11, 0), status: 'COMPLETED',
      notes: 'Long déplacement : visite prévue sur une matinée.',
      feedback: 'Coup de cœur. Vérifier avec le propriétaire la date du ravalement de la grange.',
      createdAt: at(-122), updatedAt: at(-119),
    } }),
    prisma.visit.create({ data: {
      propertyId: maisonNantes.id, clientId: maxime.id, agentId: agent.id, interestId: interests[10].id,
      scheduledAt: at(-55, 15, 0), status: 'COMPLETED',
      notes: null,
      feedback: 'Très intéressé par le jardin clos. Doit finaliser son plan de financement.',
      createdAt: at(-57), updatedAt: at(-54),
    } }),
    prisma.visit.create({ data: {
      propertyId: villa.id, clientId: sarah.id, agentId: manager.id, interestId: interests[2].id,
      scheduledAt: at(-42, 10, 30), status: 'COMPLETED',
      notes: 'Visite avec le conjoint.',
      feedback: 'Coup de cœur immédiat. Questions sur la consommation de la piscine : documents transmis.',
      createdAt: at(-44), updatedAt: at(-41),
    } }),
    prisma.visit.create({ data: {
      propertyId: t3Paris.id, clientId: laura.id, agentId: agent.id, interestId: interests[3].id,
      scheduledAt: at(-20, 17, 45), status: 'COMPLETED',
      notes: null,
      feedback: 'Appartement conforme à l\'annonce. Souhaite faire une offre au prix.',
      createdAt: at(-22), updatedAt: at(-19),
    } }),
    prisma.visit.create({ data: {
      propertyId: t3Paris.id, clientId: nicolas.id, agentId: agent.id, interestId: interests[8].id,
      scheduledAt: at(-24, 9, 0), status: 'NO_SHOW',
      notes: 'Client injoignable le jour de la visite.',
      feedback: null,
      createdAt: at(-27), updatedAt: at(-24),
    } }),
    prisma.visit.create({ data: {
      propertyId: t3Paris.id, clientId: sarah.id,
      agentId: agent.id,
      scheduledAt: at(-12, 13, 0), status: 'CANCELLED',
      notes: 'Annulée par la cliente : recentre sa recherche sur la villa bordelaise.',
      feedback: null,
      createdAt: at(-15), updatedAt: at(-13),
    } }),
    prisma.visit.create({ data: {
      propertyId: duplex.id, clientId: emma.id, agentId: agent.id, interestId: interests[5].id,
      scheduledAt: at(3, 10, 30), status: 'SCHEDULED',
      notes: 'Prévoir la remise du règlement de copropriété avant la visite.',
      feedback: null,
      createdAt: at(-2), updatedAt: at(-2),
    } }),
    prisma.visit.create({ data: {
      propertyId: local.id, clientId: antoine.id, agentId: manager.id, interestId: interests[6].id,
      scheduledAt: at(0, 16, 0), status: 'RESCHEDULED',
      notes: 'Reportée à la demande du client (livraison en cours). Visite aujourd\'hui en fin de journée.',
      feedback: null,
      createdAt: at(-6), updatedAt: at(-1),
    } }),
    // Visite demandée par Chloé depuis le portail public sur le T2 lyonnais :
    // aucun agent assigné (à qualifier par l'agence), statut programmée.
    prisma.visit.create({ data: {
      propertyId: t2Lyon.id, clientId: chloe.id, agentId: null,
      scheduledAt: at(6, 14, 30), status: 'SCHEDULED',
      notes: 'Demande de visite effectuée depuis le portail en ligne. Souhaite comparer avec son studio actuel.',
      feedback: null,
      createdAt: at(-1), updatedAt: at(-1),
    } }),
    // Visite conduite par l'admin (Alice) avec l'artisan Hugo sur le hangar :
    // étape de l'acquisition finalisée.
    prisma.visit.create({ data: {
      propertyId: hangar.id, clientId: hugo.id, agentId: admin.id, interestId: interests[11].id,
      scheduledAt: at(-92, 9, 30), status: 'COMPLETED',
      notes: 'Visite technique avec le client artisan.',
      feedback: "Volumes et hauteur sous plafond conformes pour l'atelier. Puissance électrique à vérifier avant les travaux de mise aux normes.",
      createdAt: at(-94), updatedAt: at(-91),
    } }),
    // Visite annulée pilotée par le second compte admin : Sarah s'est
    // recentrée sur la villa bordelaise avant de venir au duplex.
    prisma.visit.create({ data: {
      propertyId: duplex.id, clientId: sarah.id, agentId: agenceAdmin.id,
      scheduledAt: at(-20, 11, 0), status: 'CANCELLED',
      notes: 'Annulée par la cliente : priorise la finalisation de la villa bordelaise.',
      feedback: null,
      createdAt: at(-23), updatedAt: at(-21),
    } }),
  ]);
  console.log(`✓ ${visits.length} visites créées`);

  // ── 3. Demandes ────────────────────────────────────────────────────────
  const requests = await Promise.all([
    // Thomas — longère, acceptée (vente finalisée via offre).
    prisma.propertyRequest.create({ data: {
      clientId: thomas.id, propertyId: longere.id, type: 'PURCHASE', status: 'ACCEPTED',
      proposedAmount: 212500000, notes: 'Accord de prêt reçu, souhaite conclure rapidement.',
      createdAt: at(-112), updatedAt: at(-105),
    } }),
    // Sarah — villa, acceptée (offre retenue).
    prisma.propertyRequest.create({ data: {
      clientId: sarah.id, propertyId: villa.id, type: 'PURCHASE', status: 'ACCEPTED',
      proposedAmount: 440000000, notes: null,
      createdAt: at(-40), updatedAt: at(-38),
    } }),
    // Maxime — maison Nantes, acceptée (vente ensuite annulée).
    prisma.propertyRequest.create({ data: {
      clientId: maxime.id, propertyId: maisonNantes.id, type: 'PURCHASE', status: 'ACCEPTED',
      proposedAmount: 255000000, notes: 'Dossier de financement en cours d\'instruction.',
      createdAt: at(-50), updatedAt: at(-44),
    } }),
    // Chloé — studio, acceptée (bail actif).
    prisma.propertyRequest.create({ data: {
      clientId: chloe.id, propertyId: studio.id, type: 'RENTAL', status: 'ACCEPTED',
      proposedAmount: 585000, notes: 'Dossier complet : CDI, garants fournis.',
      createdAt: at(-160), updatedAt: at(-155),
    } }),
    // Chloé — T2 Lyon, annulée (a choisi le studio parisien).
    prisma.propertyRequest.create({ data: {
      clientId: chloe.id, propertyId: t2Lyon.id, type: 'RENTAL', status: 'CANCELLED',
      proposedAmount: 510000, notes: 'A finalement choisi le studio parisien.',
      createdAt: at(-158), updatedAt: at(-154),
    } }),
    // Laura — T3 Paris, acceptée (vente en cours).
    prisma.propertyRequest.create({ data: {
      clientId: laura.id, propertyId: t3Paris.id, type: 'PURCHASE', status: 'ACCEPTED',
      proposedAmount: 189500000, notes: 'Apport de 20 % constitué, accord bancaire prévisionnel.',
      createdAt: at(-18), updatedAt: at(-14),
    } }),
    // Nicolas — T3 Paris, refusée (offre insuffisante).
    prisma.propertyRequest.create({ data: {
      clientId: nicolas.id, propertyId: t3Paris.id, type: 'PURCHASE', status: 'REFUSED',
      proposedAmount: 170000000, notes: 'Proposition très en dessous du prix affiché.',
      createdAt: at(-28), updatedAt: at(-22),
    } }),
    // Antoine — bureaux, acceptée (réservation expirée sans signature).
    prisma.propertyRequest.create({ data: {
      clientId: antoine.id, propertyId: bureaux.id, type: 'RENTAL', status: 'ACCEPTED',
      proposedAmount: 1900000, notes: null,
      createdAt: at(-45), updatedAt: at(-42),
    } }),
    // Antoine — local commercial, en cours d'examen.
    prisma.propertyRequest.create({ data: {
      clientId: antoine.id, propertyId: local.id, type: 'RENTAL', status: 'UNDER_REVIEW',
      proposedAmount: 1575000, notes: 'Vérifier la compatibilité du bail avec une activité de traiteur (extraction).',
      createdAt: at(-12), updatedAt: at(-12),
    } }),
    // Nicolas — T2 Lyon, acceptée (bail en brouillon).
    prisma.propertyRequest.create({ data: {
      clientId: nicolas.id, propertyId: t2Lyon.id, type: 'RENTAL', status: 'ACCEPTED',
      proposedAmount: 510000, notes: 'Location d\'attente en attendant une opportunité d\'achat.',
      createdAt: at(-8), updatedAt: at(-6),
    } }),
    // Emma — duplex Bordeaux, en attente.
    prisma.propertyRequest.create({ data: {
      clientId: emma.id, propertyId: duplex.id, type: 'PURCHASE', status: 'PENDING',
      proposedAmount: 285000000, notes: 'Premier achat : étude du taux d\'endettement en cours.',
      createdAt: at(-5), updatedAt: at(-5),
    } }),
    // Hugo — hangar, acceptée (vente finalisée).
    prisma.propertyRequest.create({ data: {
      clientId: hugo.id, propertyId: hangar.id, type: 'PURCHASE', status: 'ACCEPTED',
      proposedAmount: 160000000, notes: 'Budget validé par son comptable, souhait de démarrer les travaux rapidement.',
      createdAt: at(-90), updatedAt: at(-88),
    } }),
  ]);
  console.log(`✓ ${requests.length} demandes créées`);

  // ── 4. Offres ──────────────────────────────────────────────────────────
  const offers = await Promise.all([
    prisma.purchaseOffer.create({ data: {
      requestId: requests[0].id, clientId: thomas.id, propertyId: longere.id,
      amount: 212500000, status: 'ACCEPTED',
      observations: 'Acceptée par le propriétaire après contre-visite.',
      createdAt: at(-107), updatedAt: at(-105),
    } }),
    prisma.purchaseOffer.create({ data: {
      requestId: requests[1].id, clientId: sarah.id, propertyId: villa.id,
      amount: 440000000, status: 'ACCEPTED',
      observations: 'Acceptée sous condition de signature avant le 30 du mois.',
      createdAt: at(-39), updatedAt: at(-38),
    } }),
    prisma.purchaseOffer.create({ data: {
      requestId: requests[2].id, clientId: maxime.id, propertyId: maisonNantes.id,
      amount: 250000000, status: 'WITHDRAWN',
      observations: 'Retirée par le client : refus de prêt bancaire.',
      createdAt: at(-48), updatedAt: at(-44),
    } }),
    prisma.purchaseOffer.create({ data: {
      requestId: requests[6].id, clientId: nicolas.id, propertyId: t3Paris.id,
      amount: 170000000, status: 'REFUSED',
      observations: 'Offre insuffisante : le bien est affiché à 189 500 000 FCFA.',
      createdAt: at(-26), updatedAt: at(-22),
    } }),
    prisma.purchaseOffer.create({ data: {
      requestId: requests[10].id, clientId: emma.id, propertyId: duplex.id,
      amount: 285000000, status: 'PENDING',
      observations: null,
      createdAt: at(-4), updatedAt: at(-4),
    } }),
    prisma.purchaseOffer.create({ data: {
      requestId: requests[11].id, clientId: hugo.id, propertyId: hangar.id,
      amount: 160000000, status: 'ACCEPTED',
      observations: 'Acceptée : prix affiché 164 000 000 FCFA, remise accordée pour travaux.',
      createdAt: at(-88), updatedAt: at(-86),
    } }),
  ]);
  console.log(`✓ ${offers.length} offres créées`);

  // ── 5. Réservations ────────────────────────────────────────────────────
  const reservations = await Promise.all([
    // Thomas — longère : issue d'une offre acceptée, convertie en vente.
    prisma.reservation.create({ data: {
      clientId: thomas.id, propertyId: longere.id, sourceType: 'OFFER', sourceId: offers[0].id,
      offerId: offers[0].id, reservedAt: at(-104), expiresAt: at(-74), status: 'CONVERTED',
      createdAt: at(-104), updatedAt: at(-95),
    } }),
    // Chloé — studio : issue d'une demande acceptée, convertie en bail.
    prisma.reservation.create({ data: {
      clientId: chloe.id, propertyId: studio.id, sourceType: 'REQUEST', sourceId: requests[3].id,
      requestId: requests[3].id, reservedAt: at(-154), expiresAt: at(-124), status: 'CONVERTED',
      createdAt: at(-154), updatedAt: at(-148),
    } }),
    // Emma — T2 Lyon : réservation historique convertie en bail (le bail est
    // aujourd'hui expiré). La demande d'origine précède la fenêtre de
    // démonstration : sourceId pointe sur un identifiant historique.
    prisma.reservation.create({ data: {
      clientId: emma.id, propertyId: t2Lyon.id, sourceType: 'REQUEST', sourceId: 'seed-historique',
      requestId: null, offerId: null, reservedAt: at(-405), expiresAt: at(-375), status: 'CONVERTED',
      createdAt: at(-405), updatedAt: at(-398),
    } }),
    // Antoine — bureaux : réservation expirée sans signature.
    prisma.reservation.create({ data: {
      clientId: antoine.id, propertyId: bureaux.id, sourceType: 'REQUEST', sourceId: requests[7].id,
      requestId: requests[7].id, reservedAt: at(-40), expiresAt: at(-10), status: 'EXPIRED',
      createdAt: at(-40), updatedAt: at(-10),
    } }),
    // Sarah — villa : réservation confirmée en cours de finalisation.
    prisma.reservation.create({ data: {
      clientId: sarah.id, propertyId: villa.id, sourceType: 'OFFER', sourceId: offers[1].id,
      offerId: offers[1].id, reservedAt: at(-9), expiresAt: at(21), status: 'CONFIRMED',
      createdAt: at(-9), updatedAt: at(-7),
    } }),
    // Hugo — hangar : issue de l'offre acceptée, convertie en vente.
    prisma.reservation.create({ data: {
      clientId: hugo.id, propertyId: hangar.id, sourceType: 'OFFER', sourceId: offers[5].id,
      offerId: offers[5].id, reservedAt: at(-86), expiresAt: at(-56), status: 'CONVERTED',
      createdAt: at(-86), updatedAt: at(-80),
    } }),
  ]);
  console.log(`✓ ${reservations.length} réservations créées`);

  // ── 6. Ventes ──────────────────────────────────────────────────────────
  const saleDefs = [
    {
      propertyId: longere.id, buyerId: thomas.id, ownerId: owners[1].id, agentId: manager.id,
      reservationId: reservations[0].id, requestId: null,
      salePrice: 215000000, status: 'FINALIZED' as const,
      saleDate: at(-60, 11, 0), createdAt: at(-95), updatedAt: at(-60),
      notes: 'Vente signée chez le notaire de Provins. Le propriétaire a laissé le poêle à bois et la grange attenante.',
    },
    {
      propertyId: maisonNantes.id, buyerId: maxime.id, ownerId: owners[4].id, agentId: agent.id,
      reservationId: null, requestId: requests[2].id,
      salePrice: 255000000, status: 'CANCELLED' as const,
      saleDate: null, createdAt: at(-40), updatedAt: at(-25),
      notes: 'Annulé : financement refusé par la banque. Le client a suspendu son projet.',
    },
    {
      propertyId: t3Paris.id, buyerId: laura.id, ownerId: owners[0].id, agentId: agent.id,
      reservationId: null, requestId: requests[5].id,
      salePrice: 189500000, status: 'IN_PROGRESS' as const,
      saleDate: null, createdAt: at(-12), updatedAt: at(-7),
      notes: 'Compromis signé. Acte authentique prévu chez le notaire dans trois semaines.',
    },
    {
      propertyId: hangar.id, buyerId: hugo.id, ownerId: owners[4].id, agentId: admin.id,
      reservationId: reservations[5].id, requestId: requests[11].id,
      salePrice: 160000000, status: 'FINALIZED' as const,
      saleDate: at(-55, 15, 0), createdAt: at(-80), updatedAt: at(-55),
      notes: 'Vente signée chez le notaire à Cestas. L\'acquéreur artisan démarre les travaux de mise aux normes.',
    },
    {
      propertyId: villa.id, buyerId: sarah.id, ownerId: owners[5].id, agentId: agenceAdmin.id,
      reservationId: reservations[4].id, requestId: requests[1].id,
      salePrice: 440000000, status: 'PREPARATION' as const,
      saleDate: null, createdAt: at(-6), updatedAt: at(-6),
      notes: 'Dossier de vente en préparation suite à la réservation confirmée : compromis à planifier.',
    },
  ];
  assignReferences(saleDefs, 'VTE', (s) => s.createdAt);
  const sales = await Promise.all(saleDefs.map((def) => prisma.sale.create({ data: def as Prisma.SaleUncheckedCreateInput })));
  console.log(`✓ ${sales.length} ventes créées`);

  // ── 7. Contrats de location ────────────────────────────────────────────
  // Bail d'Emma sur le T2 lyonnais : démarré il y a 13 mois, expiré.
  const emmaStart = shiftMonths(-13, 1);
  const emmaEnd = new Date(emmaStart);
  emmaEnd.setMonth(emmaEnd.getMonth() + 12);
  emmaEnd.setDate(0);
  // Bail actif de Chloé : démarré il y a 5 mois, 12 mois.
  const chloeStart = shiftMonths(-5, 28);
  const chloeEnd = new Date(chloeStart);
  chloeEnd.setMonth(chloeEnd.getMonth() + 12);
  chloeEnd.setDate(chloeEnd.getDate() - 1);
  // Bail en brouillon de Nicolas : démarrage dans deux mois, 24 mois.
  const nicolasStart = shiftMonths(2, 1);
  const nicolasEnd = new Date(nicolasStart);
  nicolasEnd.setMonth(nicolasEnd.getMonth() + 24);
  nicolasEnd.setDate(nicolasEnd.getDate() - 1);

  const contractDefs = [
    {
      propertyId: t2Lyon.id, tenantId: emma.id, ownerId: owners[2].id,
      reservationId: reservations[2].id, requestId: null,
      startDate: emmaStart, endDate: emmaEnd,
      monthlyRent: 510000, depositAmount: 510000, paymentDay: 5,
      status: 'EXPIRED' as const, signedAt: emmaStart,
      createdAt: new Date(emmaStart.getTime() - 4 * DAY), updatedAt: emmaEnd,
      notes: 'Bail arrivé à échéance : la locataire a déménagé à Bordeaux. Dépôt de garantie restitué.',
    },
    {
      propertyId: studio.id, tenantId: chloe.id, ownerId: owners[0].id,
      reservationId: reservations[1].id, requestId: null,
      startDate: chloeStart, endDate: chloeEnd,
      monthlyRent: 585000, depositAmount: 585000, paymentDay: 5,
      status: 'ACTIVE' as const, signedAt: chloeStart,
      createdAt: new Date(chloeStart.getTime() - 3 * DAY), updatedAt: chloeStart,
      notes: null,
    },
    {
      propertyId: t2Lyon.id, tenantId: nicolas.id, ownerId: owners[2].id,
      reservationId: null, requestId: requests[9].id,
      startDate: nicolasStart, endDate: nicolasEnd,
      monthlyRent: 510000, depositAmount: 510000, paymentDay: 5,
      status: 'DRAFT' as const, signedAt: null,
      createdAt: at(-5), updatedAt: at(-5),
      notes: 'En attente de signature : bail 24 mois, investisseur locatif.',
    },
  ];
  assignReferences(contractDefs, 'BAIL', (c) => c.createdAt);
  const contracts = await Promise.all(contractDefs.map((def) => prisma.rentalContract.create({ data: def as Prisma.RentalContractUncheckedCreateInput })));
  console.log(`✓ ${contracts.length} contrats de location créés`);

  // ── 8. États des lieux + observations ──────────────────────────────────
  const inspectionPhoto = (slug: string, room: string, context: string): string => {
    const fileName = `seed-inspection-${slug}.svg`;
    fs.writeFileSync(path.join(uploadDir, fileName), buildInspectionSvg(room, context), 'utf8');
    return `/uploads/${fileName}`;
  };

  const emmaEntry = await prisma.propertyInspection.create({ data: {
    contractId: contracts[0].id, type: 'ENTRY', inspectionDate: emmaStart,
    generalObservations: 'Appartement rénové, remis en état récent. Toutes les clés remises (2 trousseaux, boîte aux lettres, cave).',
    condition: 'Très bon état', inspectorId: agent.id,
    createdAt: emmaStart, updatedAt: emmaStart,
  } });
  await prisma.inspectionItem.createMany({ data: [
    { inspectionId: emmaEntry.id, observation: 'Séjour : parquet en excellent état, aucune rayure notable.', createdAt: emmaStart },
    { inspectionId: emmaEntry.id, observation: 'Cuisine équipée : électroménager testé et fonctionnel (four, plaque, hotte).', createdAt: emmaStart },
    { inspectionId: emmaEntry.id, observation: 'Salle de bain : joint de silicone à surveiller sous la douche.', createdAt: emmaStart },
    { inspectionId: emmaEntry.id, observation: 'Compteurs relevés : électricité 4 512 kWh, eau 128 m³.', createdAt: emmaStart },
  ] });

  const emmaExit = await prisma.propertyInspection.create({ data: {
    contractId: contracts[0].id, type: 'EXIT', inspectionDate: new Date(emmaEnd.getTime() - 3 * DAY),
    generalObservations: 'Appartement restitué propre et complet. Une petite usure normale du parquet du séjour, aucune dégradation.',
    condition: 'Bon état', inspectorId: manager.id,
    createdAt: new Date(emmaEnd.getTime() - 3 * DAY), updatedAt: new Date(emmaEnd.getTime() - 3 * DAY),
  } });
  await prisma.inspectionItem.createMany({ data: [
    { inspectionId: emmaExit.id, observation: 'Séjour : légère usure du parquet près de la fenêtre (normale).', photoUrl: inspectionPhoto('01', 'Séjour', 'T2 Lyon — état des lieux de sortie'), createdAt: emmaExit.createdAt },
    { inspectionId: emmaExit.id, observation: 'Cuisine : équipements vérifiés, aucun incident. Nettoyage professionnel effectué.', photoUrl: inspectionPhoto('02', 'Cuisine', 'T2 Lyon — état des lieux de sortie'), createdAt: emmaExit.createdAt },
    { inspectionId: emmaExit.id, observation: 'Toutes les clés restituées, dépôt de garantie restitué intégralement.', createdAt: emmaExit.createdAt },
  ] });

  const chloeEntry = await prisma.propertyInspection.create({ data: {
    contractId: contracts[1].id, type: 'ENTRY', inspectionDate: chloeStart,
    generalObservations: 'Studio meublé remis à neuf. Inventaire du mobilier signé conjointement.',
    condition: 'Neuf', inspectorId: admin.id,
    createdAt: chloeStart, updatedAt: chloeStart,
  } });
  await prisma.inspectionItem.createMany({ data: [
    { inspectionId: chloeEntry.id, observation: 'Mobilier complet (lit, bureau, armoire, table) conforme à l\'inventaire.', createdAt: chloeStart },
    { inspectionId: chloeEntry.id, observation: 'Salle d\'eau : douche à l\'italienne impeccable, sèche-serviettes fonctionnel.', photoUrl: inspectionPhoto('03', "Salle d'eau", 'Studio Paris — état des lieux d\'entrée'), createdAt: chloeStart },
    { inspectionId: chloeEntry.id, observation: 'Cuisine équipée : réfrigérateur, plaque induction, micro-ondes testés.', createdAt: chloeStart },
  ] });

  // État des lieux d'entrée programmé sur le bail en brouillon de Nicolas :
  // piloté par le second compte admin, réalisation le jour de la remise des clés.
  const nicolasPlannedEntry = await prisma.propertyInspection.create({ data: {
    contractId: contracts[2].id, type: 'ENTRY', inspectionDate: nicolasStart,
    generalObservations: 'État des lieux d\'entrée à réaliser le jour de la remise des clés (bail en cours de signature).',
    condition: null, inspectorId: agenceAdmin.id,
    createdAt: at(-4), updatedAt: at(-4),
  } });
  console.log('✓ 4 états des lieux créés (13 observations, 3 photos)');

  // ── 9. Échéances, paiements et quittances ──────────────────────────────
  interface PaymentDef {
    reference?: string;
    clientId: string;
    amount: number;
    paymentType: 'SALE' | 'RENT' | 'DEPOSIT' | 'OTHER';
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER';
    paymentDate: Date;
    status?: 'CONFIRMED' | 'CANCELLED';
    transactionReference?: string | null;
    notes?: string | null;
    saleId?: string | null;
    invoiceId?: string | null;
    contractId?: string | null;
    createdAt?: Date;
  }
  const payments: PaymentDef[] = [];
  interface ReceiptDef { reference?: string; invoiceKey: string; issuedAt: Date; period: string; amount: number; paymentDate: Date; }
  const receipts: ReceiptDef[] = [];
  const invoiceRows: {
    contractId: string; dueDate: Date; expectedAmount: number;
    paidAmount: number; status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
    key: string;
  }[] = [];

  // Bail d'Emma (expiré) : 12 échéances intégralement réglées.
  const emmaDues = monthlyDueDates(emmaStart, emmaEnd, 5);
  emmaDues.forEach((due, i) => {
    const paymentDate = new Date(due.getTime() - 1 * DAY);
    paymentDate.setHours(9, 15, 0, 0);
    invoiceRows.push({ contractId: contracts[0].id, dueDate: due, expectedAmount: 510000, paidAmount: 510000, status: 'PAID', key: `emma-${i}` });
    payments.push({
      clientId: emma.id, amount: 510000, paymentType: 'RENT', paymentMethod: 'BANK_TRANSFER',
      paymentDate, transactionReference: `VIR-LOYER-${paymentDate.getFullYear()}-${String(1000 + i)}`, notes: null,
      contractId: contracts[0].id, invoiceId: `@emma-${i}`, createdAt: paymentDate,
    });
    receipts.push({ invoiceKey: `emma-${i}`, issuedAt: new Date(due.getTime() + 2 * 60 * 60 * 1000), period: periodLabel(due), amount: 510000, paymentDate });
  });
  payments.push({
    clientId: emma.id, amount: 510000, paymentType: 'DEPOSIT', paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date(emmaStart.getTime() - 2 * DAY), transactionReference: 'VIR-DEP-2025-07',
    notes: 'Dépôt de garantie — restitué intégralement à la sortie.', contractId: contracts[0].id,
    createdAt: new Date(emmaStart.getTime() - 2 * DAY),
  });

  // Bail actif de Chloé : 3 mois soldés, un mois en retard, le mois courant
  // partiellement payé, les suivants à venir.
  const chloeDues = monthlyDueDates(chloeStart, chloeEnd, 5);
  chloeDues.forEach((due, i) => {
    let status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' = 'PENDING';
    let paidAmount = 0;
    if (i === 0 || i === 1 || i === 2) {
      status = 'PAID'; paidAmount = 585000;
      const paymentDate = new Date(due.getTime() - 2 * DAY);
      paymentDate.setHours(14, 0, 0, 0);
      payments.push({
        clientId: chloe.id, amount: 585000, paymentType: 'RENT', paymentMethod: 'BANK_TRANSFER',
        paymentDate, transactionReference: `VIR-CHLOE-${i + 1}`, notes: null,
        contractId: contracts[1].id, invoiceId: `@chloe-${i}`, createdAt: paymentDate,
      });
      receipts.push({ invoiceKey: `chloe-${i}`, issuedAt: new Date(due.getTime() + 26 * 60 * 60 * 1000), period: periodLabel(due), amount: 585000, paymentDate });
    } else if (i === 3 || i === 4) {
      // Échéance en retard : le mois d'août est totalement impayé (chèque
      // sans provision), celui de septembre n'est réglé qu'à moitié — comme
      // refreshOverdue(), un échéancier dépassé non soldé est marqué OVERDUE.
      status = 'OVERDUE';
      if (i === 4) {
        paidAmount = 300000;
        const paymentDate = at(-9, 11, 30);
        payments.push({
          clientId: chloe.id, amount: 300000, paymentType: 'RENT', paymentMethod: 'MOBILE_MONEY',
          paymentDate, transactionReference: 'MM-884512', notes: 'Acompte en attente du solde (285 000 FCFA).',
          contractId: contracts[1].id, invoiceId: `@chloe-${i}`, createdAt: paymentDate,
        });
      } else {
        // Tentative de paiement annulée (chèque sans provision).
        payments.push({
          clientId: chloe.id, amount: 585000, paymentType: 'RENT', paymentMethod: 'CASH',
          paymentDate: new Date(due.getTime() + 2 * DAY), status: 'CANCELLED',
          notes: 'Annulé : chèque sans provision — relance envoyée, en attente d\'un nouveau règlement.',
          contractId: contracts[1].id, invoiceId: `@chloe-${i}`, createdAt: new Date(due.getTime() + 2 * DAY),
        });
      }
    }
    invoiceRows.push({ contractId: contracts[1].id, dueDate: due, expectedAmount: 585000, paidAmount, status, key: `chloe-${i}` });
  });
  payments.push({
    clientId: chloe.id, amount: 585000, paymentType: 'DEPOSIT', paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date(chloeStart.getTime() - 1 * DAY), transactionReference: 'VIR-DEP-2026-04',
    notes: 'Dépôt de garantie (un mois de loyer).', contractId: contracts[1].id,
    createdAt: new Date(chloeStart.getTime() - 1 * DAY),
  });

  // Vente de Thomas : trois versements + frais de dossier.
  payments.push(
    { clientId: thomas.id, amount: 64500000, paymentType: 'SALE', paymentMethod: 'BANK_TRANSFER',
      paymentDate: at(-75, 10, 0), transactionReference: 'VIR-NOT-2026-114', notes: 'Versement initial — compromis (30 %).', saleId: sales[0].id, createdAt: at(-75, 10, 0) },
    { clientId: thomas.id, amount: 100000000, paymentType: 'SALE', paymentMethod: 'BANK_TRANSFER',
      paymentDate: at(-45, 15, 30), transactionReference: 'VIR-NOT-2026-127', notes: 'Deuxième versement à la signature de l\'acte authentique.', saleId: sales[0].id, createdAt: at(-45, 15, 30) },
    { clientId: thomas.id, amount: 50500000, paymentType: 'SALE', paymentMethod: 'BANK_TRANSFER',
      paymentDate: at(-19, 9, 45), transactionReference: 'VIR-NOT-2026-141', notes: 'Solde du prix de vente.', saleId: sales[0].id, createdAt: at(-19, 9, 45) },
    { clientId: thomas.id, amount: 250000, paymentType: 'OTHER', paymentMethod: 'CASH',
      paymentDate: at(-92, 11, 0), notes: 'Frais de dossier et de rédaction du compromis.', createdAt: at(-92, 11, 0) },
  );
  // Vente de Laura : apport de 20 % versé.
  payments.push({
    clientId: laura.id, amount: 37900000, paymentType: 'SALE', paymentMethod: 'BANK_TRANSFER',
    paymentDate: at(-7, 16, 0), transactionReference: 'VIR-NOT-2026-155', notes: 'Dépôt de garantie (20 %) à la signature du compromis.',
    saleId: sales[2].id, createdAt: at(-7, 16, 0),
  });
  // Vente du hangar à l'artisan Hugo : deux versements + frais de dossier.
  payments.push(
    { clientId: hugo.id, amount: 48000000, paymentType: 'SALE', paymentMethod: 'BANK_TRANSFER',
      paymentDate: at(-80, 10, 30), transactionReference: 'VIR-NOT-2026-101', notes: 'Versement initial — compromis (30 %).', saleId: sales[3].id, createdAt: at(-80, 10, 30) },
    { clientId: hugo.id, amount: 112000000, paymentType: 'SALE', paymentMethod: 'BANK_TRANSFER',
      paymentDate: at(-55, 15, 45), transactionReference: 'VIR-NOT-2026-138', notes: 'Solde du prix de vente à la signature de l\'acte authentique.', saleId: sales[3].id, createdAt: at(-55, 15, 45) },
    { clientId: hugo.id, amount: 250000, paymentType: 'OTHER', paymentMethod: 'CASH',
      paymentDate: at(-88, 11, 30), notes: 'Frais de dossier et de rédaction du compromis.', createdAt: at(-88, 11, 30) },
  );

  // Création des échéances, puis rattachement des paiements et quittances.
  const createdInvoices = new Map<string, string>();
  for (const row of invoiceRows) {
    const created = await prisma.rentInvoice.create({
      data: { contractId: row.contractId, dueDate: row.dueDate, expectedAmount: row.expectedAmount, paidAmount: row.paidAmount, status: row.status },
    });
    createdInvoices.set(row.key, created.id);
  }
  assignReferences(payments, 'PAY', (p) => p.paymentDate);
  for (const payment of payments) {
    const { invoiceId, ...data } = payment;
    await prisma.payment.create({
      data: { ...data, reference: data.reference!, invoiceId: invoiceId ? createdInvoices.get(invoiceId.replace('@', ''))! : null },
    });
  }
  assignReferences(receipts, 'QUIT', (r) => r.issuedAt);
  for (const receipt of receipts) {
    await prisma.receipt.create({
      data: {
        reference: receipt.reference!, invoiceId: createdInvoices.get(receipt.invoiceKey)!,
        issuedAt: receipt.issuedAt, periodLabel: receipt.period, amount: receipt.amount, paymentDate: receipt.paymentDate,
      },
    });
  }
  console.log(`✓ ${invoiceRows.length} échéances, ${payments.length} paiements, ${receipts.length} quittances créés`);

  // ── 10. Journal d'audit ────────────────────────────────────────────────
  // Chaque entrée est rattachée au compte utilisateur correspondant (userId),
  // afin que chaque compte ait un historique réaliste dans la démonstration.
  const displayName = (userId: string | null): string =>
    userId === admin.id ? 'Alice Bernard'
    : userId === manager.id ? 'Marc Dubois'
    : userId === agent.id ? 'Léa Petit'
    : userId === agenceAdmin.id ? 'Admin Agence'
    : 'Portail public';
  const auditRows = [
    ...interests.slice(0, 4).map((interest, i) => ({
      date: interest.createdAt, userName: i % 2 === 0 ? 'Léa Petit' : 'Marc Dubois',
      action: 'CREATE', entityType: 'ClientInterest', entityId: interest.id,
      details: `Nouvel intérêt enregistré (${interest.transactionType === 'SALE' ? 'vente' : 'location'})`,
    })),
    ...visits.map((visit) => ({
      date: visit.createdAt, userName: displayName(visit.agentId),
      action: 'CREATE', entityType: 'Visit', entityId: visit.id,
      details: `Visite planifiée le ${visit.scheduledAt.toLocaleDateString('fr-FR')}`,
    })),
    ...requests.slice(0, 6).map((request) => ({
      date: request.createdAt, userName: 'Marc Dubois',
      action: 'CREATE', entityType: 'PropertyRequest', entityId: request.id,
      details: `Demande de ${request.type === 'PURCHASE' ? 'achat' : 'location'} déposée`,
    })),
    ...offers.slice(0, 4).map((offer) => ({
      date: offer.createdAt, userName: 'Marc Dubois',
      action: 'CREATE', entityType: 'PurchaseOffer', entityId: offer.id,
      details: `Offre de ${Number(offer.amount).toLocaleString('fr-FR')} FCFA formulée`,
    })),
    ...offers.filter((o) => o.status !== 'PENDING').map((offer) => ({
      date: offer.updatedAt, userName: 'Marc Dubois',
      action: offer.status === 'ACCEPTED' ? 'ACCEPT' : offer.status === 'REFUSED' ? 'REFUSE' : 'WITHDRAW',
      entityType: 'PurchaseOffer', entityId: offer.id,
      details: `Offre de ${Number(offer.amount).toLocaleString('fr-FR')} FCFA ${offer.status === 'ACCEPTED' ? 'acceptée' : offer.status === 'REFUSED' ? 'refusée' : 'retirée'}`,
    })),
    ...reservations.map((reservation) => ({
      date: reservation.createdAt, userName: 'Marc Dubois',
      action: 'CREATE', entityType: 'Reservation', entityId: reservation.id,
      details: `Réservation créée (expire le ${reservation.expiresAt.toLocaleDateString('fr-FR')})`,
    })),
    ...sales.map((sale) => ({
      date: sale.createdAt, userName: displayName(sale.agentId),
      action: 'CREATE', entityType: 'Sale', entityId: sale.id,
      details: `Vente ${sale.reference} créée (${Number(sale.salePrice).toLocaleString('fr-FR')} FCFA)`,
    })),
    ...contracts.map((contract) => ({
      date: contract.createdAt, userName: 'Léa Petit',
      action: 'CREATE', entityType: 'RentalContract', entityId: contract.id,
      details: `Bail ${contract.reference} créé`,
    })),
    {
      date: nicolasPlannedEntry.createdAt, userName: 'Admin Agence',
      action: 'CREATE', entityType: 'PropertyInspection', entityId: nicolasPlannedEntry.id,
      details: "État des lieux d'entrée programmé sur le bail en cours de signature",
    },
    {
      date: sales[0].saleDate!, userName: 'Marc Dubois',
      action: 'FINALIZE', entityType: 'Sale', entityId: sales[0].id,
      details: `Vente ${sales[0].reference} finalisée — bien passé en VENDU`,
    },
    {
      date: sales[1].updatedAt, userName: 'Léa Petit',
      action: 'CANCEL', entityType: 'Sale', entityId: sales[1].id,
      details: `Vente ${sales[1].reference} annulée : financement refusé par la banque`,
    },
    {
      date: sales[3].saleDate!, userName: 'Alice Bernard',
      action: 'FINALIZE', entityType: 'Sale', entityId: sales[3].id,
      details: `Vente ${sales[3].reference} finalisée — hangar acquis par l'artisan menuisier`,
    },
    {
      date: contracts[0].endDate, userName: 'Léa Petit',
      action: 'EXPIRE', entityType: 'RentalContract', entityId: contracts[0].id,
      details: `Bail ${contracts[0].reference} arrivé à échéance — bien de nouveau disponible`,
    },
    ...payments.filter((p) => p.status !== 'CANCELLED' && p.paymentType !== 'RENT').map((payment) => ({
      date: payment.paymentDate, userName: 'Alice Bernard',
      action: 'PAY', entityType: 'Payment', entityId: payment.reference ?? '',
      details: `Paiement de ${payment.amount.toLocaleString('fr-FR')} FCFA enregistré (${payment.paymentType})`,
    })),
    {
      date: receipts[receipts.length - 1].issuedAt, userName: 'Alice Bernard',
      action: 'CREATE', entityType: 'Receipt', entityId: receipts[receipts.length - 1].reference ?? '',
      details: `Quittance émise (${receipts[receipts.length - 1].period})`,
    },
  ];
  const userIdByName = new Map<string, string>(users.map((u) => [`${u.firstName} ${u.lastName}`, u.id]));
  await prisma.auditLog.createMany({
    data: auditRows.map((row) => ({
      userId: userIdByName.get(row.userName) ?? null,
      userName: row.userName, action: row.action, entityType: row.entityType,
      entityId: row.entityId, details: row.details, createdAt: row.date,
    })),
  });
  console.log(`✓ ${auditRows.length} entrées de journal d'audit créées (rattachées aux comptes utilisateurs)`);
}

async function main() {
  await seedUsers_();
  await resetDemoData();
  const base = await seedDemoData();
  await seedPipeline(base);
  console.log('\nDémonstration prête : toutes les tables contiennent des données cohérentes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
