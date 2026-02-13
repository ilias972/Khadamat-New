// @ts-check
const { PrismaClient } = require('@prisma/client');

// bcrypt fallback
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch {
  try {
    bcrypt = require('bcryptjs');
  } catch {
    console.error(
      '❌ Ni bcrypt ni bcryptjs ne sont installés.\n' +
        'Installe avec : pnpm add bcryptjs\n' +
        'Le seed ne peut pas fonctionner sans hachage de mot de passe.',
    );
    process.exit(1);
  }
}

const crypto = require('crypto');

const prisma = new PrismaClient();

async function safeDelete(modelName) {
  const model = prisma[modelName];
  if (model && typeof model.deleteMany === 'function') {
    await model.deleteMany({});
  }
}

function randomPublicId(prefix) {
  return `${prefix}${crypto.randomBytes(16).toString('hex')}`;
}

async function main() {
  console.log('🌱 Seed Khadamat — début\n');

  // ──────────────────────────────────────────────
  // RESET DB (ordre FK-safe)
  // ──────────────────────────────────────────────
  console.log('🗑️  Reset des données existantes...');
  await safeDelete('review');
  await safeDelete('favorite');
  await safeDelete('paymentOrder');
  await safeDelete('bookingEvent');
  await safeDelete('booking');
  await safeDelete('proPortfolioImage');
  await safeDelete('proBoost');
  await safeDelete('proSubscription');
  await safeDelete('weeklyAvailability');
  await safeDelete('proService');
  await safeDelete('proProfile');
  await safeDelete('refreshToken');
  await safeDelete('kycAccessLog');
  await safeDelete('newsletterSubscriber');
  await safeDelete('user');
  await safeDelete('city');
  await safeDelete('category');
  console.log('   ✔ Reset terminé\n');

  // ──────────────────────────────────────────────
  // HASH PASSWORD
  // ──────────────────────────────────────────────
  const PASSWORD_CLEAR = 'Password1234';
  const hashedPassword = await bcrypt.hash(PASSWORD_CLEAR, 10);

  // ──────────────────────────────────────────────
  // 1) VILLES (3)
  // ──────────────────────────────────────────────
  console.log('📍 Création des villes...');
  const cityCasa = await prisma.city.upsert({
    where: { publicId: 'city_casa_001' },
    update: { name: 'Casablanca', slug: 'casablanca' },
    create: { publicId: 'city_casa_001', name: 'Casablanca', slug: 'casablanca' },
  });
  const cityRabat = await prisma.city.upsert({
    where: { publicId: 'city_rabat_001' },
    update: { name: 'Rabat-Salé', slug: 'rabat-sale' },
    create: { publicId: 'city_rabat_001', name: 'Rabat-Salé', slug: 'rabat-sale' },
  });
  const cityMarr = await prisma.city.upsert({
    where: { publicId: 'city_marr_001' },
    update: { name: 'Marrakech', slug: 'marrakech' },
    create: { publicId: 'city_marr_001', name: 'Marrakech', slug: 'marrakech' },
  });
  console.log('   ✔ 3 villes créées\n');

  // ──────────────────────────────────────────────
  // 2) CATÉGORIES (6)
  // ──────────────────────────────────────────────
  console.log('🏷️  Création des catégories...');
  const catDemenagement = await prisma.category.upsert({
    where: { publicId: 'cat_demenagement_001' },
    update: { name: 'Déménagement', slug: 'demenagement' },
    create: { publicId: 'cat_demenagement_001', name: 'Déménagement', slug: 'demenagement' },
  });
  const catPeinture = await prisma.category.upsert({
    where: { publicId: 'cat_peinture_001' },
    update: { name: 'Peinture', slug: 'peinture' },
    create: { publicId: 'cat_peinture_001', name: 'Peinture', slug: 'peinture' },
  });
  const catMenage = await prisma.category.upsert({
    where: { publicId: 'cat_menage_001' },
    update: { name: 'Ménage à domicile', slug: 'menage-a-domicile' },
    create: { publicId: 'cat_menage_001', name: 'Ménage à domicile', slug: 'menage-a-domicile' },
  });
  const catClim = await prisma.category.upsert({
    where: { publicId: 'cat_clim_001' },
    update: { name: 'Climatisation / Froid', slug: 'climatisation-froid' },
    create: { publicId: 'cat_clim_001', name: 'Climatisation / Froid', slug: 'climatisation-froid' },
  });
  const catElec = await prisma.category.upsert({
    where: { publicId: 'cat_electricite_001' },
    update: { name: 'Électricité', slug: 'electricite' },
    create: { publicId: 'cat_electricite_001', name: 'Électricité', slug: 'electricite' },
  });
  const catPlomberie = await prisma.category.upsert({
    where: { publicId: 'cat_plomberie_001' },
    update: { name: 'Plomberie', slug: 'plomberie' },
    create: { publicId: 'cat_plomberie_001', name: 'Plomberie', slug: 'plomberie' },
  });
  console.log('   ✔ 6 catégories créées\n');

  // ──────────────────────────────────────────────
  // 3) USERS CLIENT (3)
  // ──────────────────────────────────────────────
  console.log('👤 Création des clients...');
  const client1 = await prisma.user.create({
    data: {
      publicId: randomPublicId('usr_'),
      role: 'CLIENT',
      status: 'ACTIVE',
      firstName: 'Amine',
      lastName: 'El Idrissi',
      phone: '0612345678',
      email: 'amine.client@khadamat.test',
      password: hashedPassword,
      cityId: cityCasa.id,
      addressLine: '10 Rue Test, Casablanca',
    },
  });
  const client2 = await prisma.user.create({
    data: {
      publicId: randomPublicId('usr_'),
      role: 'CLIENT',
      status: 'ACTIVE',
      firstName: 'Sara',
      lastName: 'Bennani',
      phone: '0623456789',
      email: 'sara.client@khadamat.test',
      password: hashedPassword,
      cityId: cityRabat.id,
      addressLine: '22 Avenue Demo, Rabat',
    },
  });
  const client3 = await prisma.user.create({
    data: {
      publicId: randomPublicId('usr_'),
      role: 'CLIENT',
      status: 'ACTIVE',
      firstName: 'Youssef',
      lastName: 'Alaoui',
      phone: '0634567890',
      email: 'youssef.client@khadamat.test',
      password: hashedPassword,
      cityId: cityMarr.id,
      addressLine: '5 Boulevard Exemple, Marrakech',
    },
  });
  console.log('   ✔ 3 clients créés\n');

  // ──────────────────────────────────────────────
  // 4) USERS PRO (5) + ProProfile
  // ──────────────────────────────────────────────
  console.log('🔧 Création des pros...');
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  // PRO 1 — Khalid (Premium, APPROVED, Casablanca) — WITH avatarUrl
  const pro1 = await prisma.user.create({
    data: {
      publicId: randomPublicId('usr_'),
      role: 'PRO',
      status: 'ACTIVE',
      firstName: 'Khalid',
      lastName: 'Lahlou',
      phone: '0651111111',
      email: 'khalid.pro@khadamat.test',
      password: hashedPassword,
      avatarUrl: 'https://i.pravatar.cc/300?u=khalid',
      proProfile: {
        create: {
          publicId: randomPublicId('pro_'),
          cityId: cityCasa.id,
          whatsapp: '+212651111111',
          kycStatus: 'APPROVED',
          isPremium: true,
          premiumActiveUntil: new Date(now.getTime() + 25 * msPerDay),
          boostActiveUntil: null,
          bio: 'Plombier et électricien certifié avec 10 ans d\'expérience à Casablanca. Intervention rapide et devis gratuit.',
        },
      },
    },
  });

  // PRO 2 — Hana (Premium, APPROVED, Rabat-Salé) — WITH avatarUrl
  const pro2 = await prisma.user.create({
    data: {
      publicId: randomPublicId('usr_'),
      role: 'PRO',
      status: 'ACTIVE',
      firstName: 'Hana',
      lastName: 'Chraibi',
      phone: '0662222222',
      email: 'hana.pro@khadamat.test',
      password: hashedPassword,
      avatarUrl: 'https://i.pravatar.cc/300?u=hana',
      proProfile: {
        create: {
          publicId: randomPublicId('pro_'),
          cityId: cityRabat.id,
          whatsapp: '+212662222222',
          kycStatus: 'APPROVED',
          isPremium: true,
          premiumActiveUntil: new Date(now.getTime() + 25 * msPerDay),
          boostActiveUntil: null,
          bio: 'Spécialiste peinture et ménage professionnel. Qualité garantie à Rabat et environs.',
        },
      },
    },
  });

  // PRO 3 — Rachid (Non premium, APPROVED, Marrakech, boost actif)
  const boostEndsAt = new Date(now.getTime() + 7 * msPerDay);
  const pro3 = await prisma.user.create({
    data: {
      publicId: randomPublicId('usr_'),
      role: 'PRO',
      status: 'ACTIVE',
      firstName: 'Rachid',
      lastName: 'Omar',
      phone: '0673333333',
      email: 'rachid.pro@khadamat.test',
      password: hashedPassword,
      proProfile: {
        create: {
          publicId: randomPublicId('pro_'),
          cityId: cityMarr.id,
          whatsapp: '+212673333333',
          kycStatus: 'APPROVED',
          isPremium: false,
          premiumActiveUntil: null,
          boostActiveUntil: boostEndsAt,
        },
      },
    },
  });

  // PRO 4 — Oumaima (Non premium, APPROVED, Casablanca)
  const pro4 = await prisma.user.create({
    data: {
      publicId: randomPublicId('usr_'),
      role: 'PRO',
      status: 'ACTIVE',
      firstName: 'Oumaima',
      lastName: 'Zerouali',
      phone: '0654444444',
      email: 'oumaima.pro@khadamat.test',
      password: hashedPassword,
      proProfile: {
        create: {
          publicId: randomPublicId('pro_'),
          cityId: cityCasa.id,
          whatsapp: '+212654444444',
          kycStatus: 'APPROVED',
          isPremium: false,
          premiumActiveUntil: null,
          boostActiveUntil: null,
        },
      },
    },
  });

  // PRO 5 — Said (Non premium, PENDING KYC, Casablanca)
  const pro5 = await prisma.user.create({
    data: {
      publicId: randomPublicId('usr_'),
      role: 'PRO',
      status: 'ACTIVE',
      firstName: 'Said',
      lastName: 'Mouline',
      phone: '0665555555',
      email: 'said.pro@khadamat.test',
      password: hashedPassword,
      proProfile: {
        create: {
          publicId: randomPublicId('pro_'),
          cityId: cityCasa.id,
          whatsapp: '+212665555555',
          kycStatus: 'PENDING',
          isPremium: false,
          premiumActiveUntil: null,
          boostActiveUntil: null,
        },
      },
    },
  });
  console.log('   ✔ 5 pros créés (2 premium, 2 standard, 1 pending KYC)\n');

  // ──────────────────────────────────────────────
  // 5) ProService (PRO APPROVED uniquement)
  // ──────────────────────────────────────────────
  console.log('📋 Création des services pro...');
  // PRO 1 — Plomberie + Électricité
  await prisma.proService.createMany({
    data: [
      {
        proUserId: pro1.id,
        categoryId: catPlomberie.id,
        isActive: true,
        pricingType: 'RANGE',
        minPriceMad: 200,
        maxPriceMad: 500,
      },
      {
        proUserId: pro1.id,
        categoryId: catElec.id,
        isActive: true,
        pricingType: 'RANGE',
        minPriceMad: 250,
        maxPriceMad: 600,
      },
    ],
  });
  // PRO 2 — Peinture + Ménage à domicile
  await prisma.proService.createMany({
    data: [
      {
        proUserId: pro2.id,
        categoryId: catPeinture.id,
        isActive: true,
        pricingType: 'RANGE',
        minPriceMad: 300,
        maxPriceMad: 800,
      },
      {
        proUserId: pro2.id,
        categoryId: catMenage.id,
        isActive: true,
        pricingType: 'RANGE',
        minPriceMad: 150,
        maxPriceMad: 350,
      },
    ],
  });
  // PRO 3 — Climatisation / Froid + Électricité
  await prisma.proService.createMany({
    data: [
      {
        proUserId: pro3.id,
        categoryId: catClim.id,
        isActive: true,
        pricingType: 'RANGE',
        minPriceMad: 400,
        maxPriceMad: 900,
      },
      {
        proUserId: pro3.id,
        categoryId: catElec.id,
        isActive: true,
        pricingType: 'RANGE',
        minPriceMad: 200,
        maxPriceMad: 500,
      },
    ],
  });
  // PRO 4 — Déménagement + Ménage à domicile
  await prisma.proService.createMany({
    data: [
      {
        proUserId: pro4.id,
        categoryId: catDemenagement.id,
        isActive: true,
        pricingType: 'RANGE',
        minPriceMad: 500,
        maxPriceMad: 1500,
      },
      {
        proUserId: pro4.id,
        categoryId: catMenage.id,
        isActive: true,
        pricingType: 'RANGE',
        minPriceMad: 150,
        maxPriceMad: 400,
      },
    ],
  });
  console.log('   ✔ 8 services créés (2 par PRO APPROVED)\n');

  // ──────────────────────────────────────────────
  // 6) WeeklyAvailability (PRO APPROVED uniquement, 7j)
  // ──────────────────────────────────────────────
  console.log('📅 Création des disponibilités hebdomadaires...');
  const approvedPros = [pro1.id, pro2.id, pro3.id, pro4.id];
  const availData = [];
  for (const proUserId of approvedPros) {
    for (let day = 0; day <= 6; day++) {
      availData.push({
        proUserId,
        dayOfWeek: day,
        startMin: 540,  // 09:00
        endMin: 1020,   // 17:00
        isActive: true,
      });
    }
  }
  await prisma.weeklyAvailability.createMany({ data: availData });
  console.log('   ✔ 28 lignes WeeklyAvailability créées (4 pros x 7 jours)\n');

  // ──────────────────────────────────────────────
  // 7) ProSubscription (PRO1 + PRO2) + ProBoost (PRO3)
  // ──────────────────────────────────────────────
  console.log('💎 Création des abonnements et boosts...');
  // PRO 1 — subscription
  await prisma.proSubscription.create({
    data: {
      proUserId: pro1.id,
      plan: 'PREMIUM_MONTHLY_NO_COMMIT',
      status: 'ACTIVE',
      priceMad: 499,
      startedAt: new Date(now.getTime() - 2 * msPerDay),
      endedAt: new Date(now.getTime() + 25 * msPerDay),
    },
  });
  // PRO 2 — subscription
  await prisma.proSubscription.create({
    data: {
      proUserId: pro2.id,
      plan: 'PREMIUM_MONTHLY_NO_COMMIT',
      status: 'ACTIVE',
      priceMad: 499,
      startedAt: new Date(now.getTime() - 2 * msPerDay),
      endedAt: new Date(now.getTime() + 25 * msPerDay),
    },
  });
  // PRO 3 — boost (Électricité à Marrakech)
  await prisma.proBoost.create({
    data: {
      proUserId: pro3.id,
      cityId: cityMarr.id,
      categoryId: catElec.id,
      status: 'ACTIVE',
      startsAt: now,
      endsAt: boostEndsAt,
      priceMad: 200,
    },
  });
  console.log('   ✔ 2 subscriptions + 1 boost créés\n');

  // ──────────────────────────────────────────────
  // 8) BOOKINGS (12+)
  // ──────────────────────────────────────────────
  console.log('📝 Création des bookings...');
  const msPerHour = 60 * 60 * 1000;

  const bookings = [
    // 1. PENDING — expiresAt dans le passé (pour tester cron expiration)
    {
      status: 'PENDING',
      timeSlot: new Date(now.getTime() + 2 * msPerDay),
      cityId: cityCasa.id,
      categoryId: catPlomberie.id,
      clientId: client1.id,
      proId: pro1.id,
      expiresAt: new Date(now.getTime() - 2 * msPerHour),
      estimatedDuration: 'H1',
      duration: 1,
    },
    // 2. PENDING — expiresAt futur
    {
      status: 'PENDING',
      timeSlot: new Date(now.getTime() + 3 * msPerDay),
      cityId: cityCasa.id,
      categoryId: catElec.id,
      clientId: client1.id,
      proId: pro1.id,
      expiresAt: new Date(now.getTime() + 24 * msPerHour),
      estimatedDuration: 'H2',
      duration: 2,
    },
    // 3. WAITING_FOR_CLIENT — expiresAt dans le passé (pour tester cron expiration)
    {
      status: 'WAITING_FOR_CLIENT',
      timeSlot: new Date(now.getTime() + 1 * msPerDay),
      cityId: cityRabat.id,
      categoryId: catPeinture.id,
      clientId: client2.id,
      proId: pro2.id,
      expiresAt: new Date(now.getTime() - 2 * msPerHour),
      estimatedDuration: 'H2',
      duration: 2,
    },
    // 4. CONFIRMED
    {
      status: 'CONFIRMED',
      timeSlot: new Date(now.getTime() + 4 * msPerDay),
      cityId: cityRabat.id,
      categoryId: catMenage.id,
      clientId: client2.id,
      proId: pro2.id,
      expiresAt: new Date(now.getTime() + 48 * msPerHour),
      confirmedAt: new Date(now.getTime() - 1 * msPerHour),
      estimatedDuration: 'H1',
      duration: 1,
    },
    // 5. DECLINED
    {
      status: 'DECLINED',
      timeSlot: new Date(now.getTime() + 5 * msPerDay),
      cityId: cityMarr.id,
      categoryId: catClim.id,
      clientId: client3.id,
      proId: pro3.id,
      expiresAt: new Date(now.getTime() - 1 * msPerHour),
      estimatedDuration: 'H2',
      duration: 2,
    },
    // 6. COMPLETED
    {
      status: 'COMPLETED',
      timeSlot: new Date(now.getTime() - 3 * msPerDay),
      cityId: cityCasa.id,
      categoryId: catPlomberie.id,
      clientId: client1.id,
      proId: pro1.id,
      expiresAt: new Date(now.getTime() - 4 * msPerDay),
      completedAt: new Date(now.getTime() - 2 * msPerDay),
      estimatedDuration: 'H2',
      duration: 2,
    },
    // 7. EXPIRED
    {
      status: 'EXPIRED',
      timeSlot: new Date(now.getTime() - 1 * msPerDay),
      cityId: cityMarr.id,
      categoryId: catElec.id,
      clientId: client3.id,
      proId: pro3.id,
      expiresAt: new Date(now.getTime() - 2 * msPerDay),
      estimatedDuration: 'H1',
      duration: 1,
    },
    // 8. CANCELLED_BY_CLIENT
    {
      status: 'CANCELLED_BY_CLIENT',
      timeSlot: new Date(now.getTime() + 2 * msPerDay),
      cityId: cityRabat.id,
      categoryId: catPeinture.id,
      clientId: client2.id,
      proId: pro2.id,
      expiresAt: new Date(now.getTime() + 24 * msPerHour),
      cancelledAt: new Date(now.getTime() - 1 * msPerHour),
      estimatedDuration: 'H1',
      duration: 1,
    },
    // 9. CANCELLED_BY_CLIENT_LATE
    {
      status: 'CANCELLED_BY_CLIENT_LATE',
      timeSlot: new Date(now.getTime() + 1 * msPerDay),
      cityId: cityCasa.id,
      categoryId: catDemenagement.id,
      clientId: client1.id,
      proId: pro4.id,
      expiresAt: new Date(now.getTime() + 12 * msPerHour),
      cancelledAt: new Date(now.getTime() - 1 * msPerHour),
      estimatedDuration: 'H4',
      duration: 4,
    },
    // 10. CANCELLED_BY_PRO
    {
      status: 'CANCELLED_BY_PRO',
      timeSlot: new Date(now.getTime() + 3 * msPerDay),
      cityId: cityMarr.id,
      categoryId: catClim.id,
      clientId: client3.id,
      proId: pro3.id,
      expiresAt: new Date(now.getTime() + 24 * msPerHour),
      cancelledAt: new Date(now.getTime() - 1 * msPerHour),
      cancelReason: 'Indisponible',
      estimatedDuration: 'H2',
      duration: 2,
    },
    // 11. CANCELLED_AUTO_OVERLAP
    {
      status: 'CANCELLED_AUTO_OVERLAP',
      timeSlot: new Date(now.getTime() + 2 * msPerDay),
      cityId: cityCasa.id,
      categoryId: catMenage.id,
      clientId: client1.id,
      proId: pro4.id,
      expiresAt: new Date(now.getTime() + 24 * msPerHour),
      cancelledAt: new Date(now.getTime() - 30 * 60 * 1000),
      estimatedDuration: 'H1',
      duration: 1,
    },
    // 12. COMPLETED (2e, pour diversité)
    {
      status: 'COMPLETED',
      timeSlot: new Date(now.getTime() - 5 * msPerDay),
      cityId: cityRabat.id,
      categoryId: catMenage.id,
      clientId: client2.id,
      proId: pro2.id,
      expiresAt: new Date(now.getTime() - 6 * msPerDay),
      completedAt: new Date(now.getTime() - 4 * msPerDay),
      estimatedDuration: 'H1',
      duration: 1,
    },
  ];

  const createdBookings = [];
  for (const b of bookings) {
    createdBookings.push(await prisma.booking.create({ data: b }));
  }
  console.log(`   ✔ ${bookings.length} bookings créés\n`);

  // ──────────────────────────────────────────────
  // 9) PORTFOLIO (Premium PRO1 uniquement)
  // ──────────────────────────────────────────────
  console.log('🖼️  Création du portfolio...');
  await prisma.proPortfolioImage.createMany({
    data: [
      { proUserId: pro1.id, url: 'https://picsum.photos/seed/khadamat1/600/400' },
      { proUserId: pro1.id, url: 'https://picsum.photos/seed/khadamat2/600/400' },
    ],
  });
  console.log('   ✔ 2 images portfolio créées (PRO1 premium)\n');

  // ──────────────────────────────────────────────
  // 10) FAVORIS
  // ──────────────────────────────────────────────
  console.log('❤️  Création des favoris...');
  await prisma.favorite.createMany({
    data: [
      { clientId: client1.id, proId: pro1.id },
      { clientId: client2.id, proId: pro2.id },
    ],
  });
  console.log('   ✔ 2 favoris créés\n');

  // ──────────────────────────────────────────────
  // 11) REVIEWS (sur bookings COMPLETED)
  // ──────────────────────────────────────────────
  console.log('⭐ Création des avis...');
  const completedBookings = createdBookings.filter((b) => b.status === 'COMPLETED');
  if (completedBookings.length >= 2) {
    await prisma.review.create({
      data: {
        bookingId: completedBookings[0].id,
        clientId: completedBookings[0].clientId,
        proId: completedBookings[0].proId,
        rating: 5,
        comment: 'Excellent travail, très professionnel et ponctuel.',
      },
    });
    await prisma.review.create({
      data: {
        bookingId: completedBookings[1].id,
        clientId: completedBookings[1].clientId,
        proId: completedBookings[1].proId,
        rating: 4,
        comment: 'Bon service, je recommande.',
      },
    });
  }
  console.log('   ✔ 2 reviews créées\n');

  // ──────────────────────────────────────────────
  // LOGS FINAUX
  // ──────────────────────────────────────────────
  const counts = {
    cities: await prisma.city.count(),
    categories: await prisma.category.count(),
    clients: await prisma.user.count({ where: { role: 'CLIENT' } }),
    pros: await prisma.user.count({ where: { role: 'PRO' } }),
    proProfiles: await prisma.proProfile.count(),
    proServices: await prisma.proService.count(),
    weeklyAvailability: await prisma.weeklyAvailability.count(),
    subscriptions: await prisma.proSubscription.count(),
    boosts: await prisma.proBoost.count(),
    bookings: await prisma.booking.count(),
    portfolio: await prisma.proPortfolioImage.count(),
    favorites: await prisma.favorite.count(),
    reviews: await prisma.review.count(),
  };

  console.log('═══════════════════════════════════════');
  console.log('  SEED TERMINÉ — Récapitulatif');
  console.log('═══════════════════════════════════════');
  for (const [key, val] of Object.entries(counts)) {
    console.log(`   ${key.padEnd(22)} ${val}`);
  }
  console.log('═══════════════════════════════════════\n');

  console.log('🔑 Mot de passe commun (tous les users) : Password1234\n');

  console.log('📌 Commandes de vérification :');
  console.log('   cd packages/database');
  console.log('   npx prisma db seed');
  console.log('   psql -U postgres -d khadamat -c \'SELECT COUNT(*) FROM "User";\'');
  console.log('   psql -U postgres -d khadamat -c \'SELECT COUNT(*) FROM "ProProfile";\'');
  console.log('   psql -U postgres -d khadamat -c \'SELECT COUNT(*) FROM "Booking";\'');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed échoué :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
