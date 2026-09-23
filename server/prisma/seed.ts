import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed de l'application :
 *  1. Comptes utilisateurs — un par rôle disponible.
 *  2. Données de démonstration : propriétaires, clients, biens et médias
 *     (photos SVG générées + documents PDF générés dans server/uploads/).
 *
 * Les comptes sont créés par upsert (jamais écrasés) ; les données de
 * démonstration, elles, sont réinitialisées à chaque exécution.
 *
 * Identifiants :
 *  - admin@gmail.com   / admin   (ADMIN)
 *  - manager@gmail.com / manager (MANAGER)
 *  - agent@gmail.com   / agent   (AGENT)
 *  - admin@agence.fr   / Admin2026! (ADMIN — compte d'origine)
 */

// ─── Utilisateurs ────────────────────────────────────────────────────────────

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
    notes: 'Souhaite être informé avant toute visite d\'un de ses biens.',
  },
  {
    firstName: 'Isabelle', lastName: 'Roux',
    phone: '06 78 90 12 34', email: 'isabelle.roux@email.fr',
    address: '3 chemin des Vignes, 33000 Bordeaux',
    identificationNumber: 'CIN AB567890',
    notes: 'Vendeuse motivée, déménagement prévu dans l\'année.',
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
    notes: 'Recherche un appartement T3 à l\'est de Paris. Budget autour de 230 000 000 FCFA.',
    isActive: true,
  },
  {
    firstName: 'Thomas', lastName: 'Girard',
    phone: '06 34 56 78 90', email: 'thomas.girard@email.fr',
    address: '7 impasse du Moulin, 69100 Villeurbanne',
    identificationNumber: 'CIN C223344',
    notes: 'Souhaite une maison avec jardin dans la métropole lyonnaise.',
    isActive: true,
  },
  {
    firstName: 'Emma', lastName: 'Rossi',
    phone: '07 11 22 33 44', email: 'emma.rossi@email.fr',
    address: '2 rue de la République, 33000 Bordeaux',
    identificationNumber: 'CIN C334455',
    notes: 'Premier achat, étudie les dispositifs d\'apport.',
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
    address: '9 rue du Commerce, 44100 Nantes',
    identificationNumber: 'CIN C556677',
    notes: 'Recherche une location meublée pour septembre.',
    isActive: true,
  },
  {
    firstName: 'Antoine', lastName: 'Mercier',
    phone: '06 66 55 44 33', email: 'antoine.mercier@email.fr',
    address: '31 rue Nationale, 59000 Lille',
    identificationNumber: 'CIN C667788',
    notes: 'Cherche un local commercial pour son activité de traiteur.',
    isActive: true,
  },
  {
    firstName: 'Sarah', lastName: 'Cohen',
    phone: '07 22 33 44 55', email: 'sarah.cohen@email.fr',
    address: '5 rue Oberkampf, 75011 Paris',
    identificationNumber: 'CIN C778899',
    notes: 'Flexible sur le quartier, priorité à la luminosité.',
    isActive: true,
  },
  {
    firstName: 'Maxime', lastName: 'Durand',
    phone: '06 44 33 22 11', email: 'maxime.durand@email.fr',
    address: '27 boulevard Voltaire, 75011 Paris',
    identificationNumber: 'CIN C889900',
    notes: 'A suspendu son projet d\'achat — client archivé.',
    isActive: false,
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
    description: 'Studio entièrement meublé et rénové, idéalement situé pour un investissement locatif. Cuisine équipée, salle d\'eau moderne. Idéal location étudiante.',
    propertyType: 'APARTMENT', transactionType: 'RENT', status: 'RENTED',
    price: null, rentPrice: 585000,
    address: '3 rue de la Sorbonne', city: 'Paris', district: 'Quartier latin',
    surfaceArea: 24, bedrooms: 0, bathrooms: 1,
    ownerIndex: 0, photos: 1, documents: ['Contrat de location'],
  },
  {
    title: 'Longère rénovée au calme',
    description: 'Longère de caractère entièrement rénovée : pierres apparentes, poêle à bois, grange attenante. Grand terrain arboré sans vis-à-vis. Vendu en un mois.',
    propertyType: 'HOUSE', transactionType: 'SALE', status: 'SOLD',
    price: 219500000, rentPrice: null,
    address: '14 route de Provins', city: 'Provins', district: 'Centre',
    surfaceArea: 145, bedrooms: 4, bathrooms: 2,
    ownerIndex: 1, photos: 2, documents: ['Titre de propriété', 'Diagnostics techniques'],
  },
  {
    title: 'T2 rénové proche métro',
    description: 'Appartement de deux pièces traversant, refait à neuf : parquet, cuisine équipée, salle de bain avec douche à l\'italienne. À deux pas du métro et des commerces.',
    propertyType: 'APARTMENT', transactionType: 'RENT', status: 'AVAILABLE',
    price: null, rentPrice: 510000,
    address: '21 cours de la Libération', city: 'Lyon', district: 'La Guillotière',
    surfaceArea: 45, bedrooms: 1, bathrooms: 1,
    ownerIndex: 2, photos: 2, documents: [],
  },
  {
    title: 'Terrain constructible viabilisé',
    description: 'Terrain plat et viabilisé en bordure de lotissement, exposition sud. Raccordements eau, électricité et tout-à-l\'égout en limite de parcelle. Libre de tout constructeur.',
    propertyType: 'LAND', transactionType: 'SALE', status: 'AVAILABLE',
    price: 121500000, rentPrice: null,
    address: 'Lotissement des Chênes, lot 7', city: 'Massy', district: 'Les Graviers',
    surfaceArea: 650, bedrooms: null, bathrooms: null,
    ownerIndex: 3, photos: 1, documents: ['Certificat d\'urbanisme'],
  },
  {
    title: 'Local commercial pied d\'immeuble',
    description: 'Emplacement n°1 : local commercial avec vaste vitrine, anciennement une boulangerie. Fort passage piétonnier, stationnement à proximité. Bail tout commerce possible.',
    propertyType: 'COMMERCIAL', transactionType: 'RENT', status: 'AVAILABLE',
    price: null, rentPrice: 1575000,
    address: '58 rue du Faubourg Saint-Antoine', city: 'Paris', district: 'Bastille',
    surfaceArea: 85, bedrooms: null, bathrooms: 1,
    ownerIndex: 0, photos: 2, documents: ['Bail type 3/6/9'],
  },
  {
    title: 'Plateau de bureaux moderne',
    description: 'Plateau de bureaux lumineux au 3e étage d\'un immeuble de standing récent : climatisation, fibre optique, accès PMR, 4 places de parking en sous-sol.',
    propertyType: 'OFFICE', transactionType: 'RENT', status: 'AVAILABLE',
    price: null, rentPrice: 1900000,
    address: '9 rue Garibaldi', city: 'Lyon', district: 'Part-Dieu',
    surfaceArea: 140, bedrooms: null, bathrooms: 2,
    ownerIndex: 2, photos: 2, documents: ['DPE', 'Plan des locaux'],
  },
  {
    title: 'Villa contemporaine avec piscine',
    description: 'Villa d\'architecte de 2018 : vastes volumes baignés de lumière, cuisine ouverte haut de gamme, piscine chauffée et pool house. Prestations premium.',
    propertyType: 'HOUSE', transactionType: 'SALE', status: 'RESERVED',
    price: 449500000, rentPrice: null,
    address: '11 allée des Palmiers', city: 'Bordeaux', district: 'Caudéran',
    surfaceArea: 180, bedrooms: 5, bathrooms: 3,
    ownerIndex: 5, photos: 3, documents: ['Titre de propriété', 'Notice de la piscine'],
  },
  {
    title: 'Duplex atypique sous combles',
    description: 'Duplex plein de charme au dernier étage : mezzanine, poutres apparentes, terrasse plein sud. Possibilité d\'achat ou de location meublée longue durée.',
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
    description: 'Hangar de 320 m² sur terrain clos de 1 500 m², en périphérie immédiate. Nécessite des travaux de mise aux normes. Idéal artisan ou investisseur.',
    propertyType: 'OTHER', transactionType: 'SALE', status: 'UNAVAILABLE',
    price: 164000000, rentPrice: null,
    address: 'Route de Saucats', city: 'Cestas', district: 'Le Burck',
    surfaceArea: 320, bedrooms: null, bathrooms: null,
    ownerIndex: 4, photos: 1, documents: [],
  },
  {
    title: 'Loft industriel en plein ciel de la Croix-Rousse',
    description: 'Ancien atelier de canuts transformé en loft : verrière d\'époque, béton ciré, hauteur sous plafond de 4 m. (Dossier archivé en attente de décision du propriétaire.)',
    propertyType: 'APARTMENT', transactionType: 'SALE', status: 'AVAILABLE',
    price: 272000000, rentPrice: null,
    address: '2 montée Saint-Sébastien', city: 'Lyon', district: 'Croix-Rousse',
    surfaceArea: 88, bedrooms: 2, bathrooms: 1,
    ownerIndex: 1, isArchived: true, photos: 2, documents: [],
  },
];

// ─── Génération des fichiers médias ──────────────────────────────────────────

const uploadDir = path.resolve(process.cwd(), 'uploads');

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
        phone: null,
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
    seedClients.map((client) => prisma.client.create({ data: client })),
  );
  console.log(`✓ ${clients.length} clients créés`);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const year = new Date().getFullYear();
  let photosCreated = 0;
  let documentsCreated = 0;

  for (let i = 0; i < seedProperties.length; i++) {
    const property = seedProperties[i];
    const reference = `BIEN-${year}-${String(i + 1).padStart(4, '0')}`;
    const owner = owners[property.ownerIndex];
    // Du plus ancien au plus récent : espacement de 5 jours.
    const createdAt = new Date(now - (seedProperties.length - i) * 5 * day);

    const media: {
      kind: 'PHOTO' | 'DOCUMENT';
      url: string;
      fileName: string;
      mimeType: string;
      size: number;
      isPrimary: boolean;
    }[] = [];

    for (let p = 0; p < property.photos; p++) {
      const fileName = `seed-photo-${String(i + 1).padStart(2, '0')}-${p + 1}.svg`;
      const svg = buildPhotoSvg(property, reference, p, property.photos);
      fs.writeFileSync(path.join(uploadDir, fileName), svg, 'utf8');
      media.push({
        kind: 'PHOTO',
        url: `/uploads/${fileName}`,
        fileName: `photo-${p + 1}.svg`,
        mimeType: 'image/svg+xml',
        size: Buffer.byteLength(svg, 'utf8'),
        isPrimary: p === 0,
      });
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

    await prisma.property.create({
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
  }

  console.log(`✓ ${seedProperties.length} biens créés (${photosCreated} photos, ${documentsCreated} documents)`);
}

async function main() {
  await seedUsers_();
  await resetDemoData();
  await seedDemoData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
