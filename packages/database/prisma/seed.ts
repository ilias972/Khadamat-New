import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run via: pnpm seed (uses dotenv-cli)');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('🌱 Seeding database...\n');

  // Helper function to generate cuid-like IDs
  function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 1. Seed Cities
  console.log('📍 Seeding cities...');
  const casaId = 'city_casa_001';
  const rabatId = 'city_rabat_002';
  const marrakechId = 'city_marrakech_003';

  await client.query(`
    INSERT INTO "City" (id, name, slug, "createdAt")
    VALUES
      ($1, 'Casablanca', 'casablanca', NOW()),
      ($2, 'Rabat-Salé', 'rabat-sale', NOW()),
      ($3, 'Marrakech', 'marrakech', NOW())
    ON CONFLICT (name) DO NOTHING
  `, [casaId, rabatId, marrakechId]);

  // 2. Seed Categories
  console.log('🏷️  Seeding categories...');
  const plomberieId = 'cat_plomberie_001';
  const electriciteId = 'cat_electricite_002';
  const climatisationId = 'cat_climatisation_003';
  const serrurerieId = 'cat_serrurerie_004';
  const menageId = 'cat_menage_005';
  const peintureId = 'cat_peinture_006';
  const bricolageId = 'cat_bricolage_007';
  const jardinageId = 'cat_jardinage_008';

  await client.query(`
    INSERT INTO "Category" (id, name, slug, "createdAt")
    VALUES
      ($1, 'Plomberie', 'plomberie', NOW()),
      ($2, 'Électricité', 'electricite', NOW()),
      ($3, 'Climatisation', 'climatisation', NOW()),
      ($4, 'Serrurerie', 'serrurerie', NOW()),
      ($5, 'Ménage', 'menage', NOW()),
      ($6, 'Peinture', 'peinture', NOW()),
      ($7, 'Bricolage', 'bricolage', NOW()),
      ($8, 'Jardinage', 'jardinage', NOW())
    ON CONFLICT (name) DO NOTHING
  `, [plomberieId, electriciteId, climatisationId, serrurerieId, menageId, peintureId, bricolageId, jardinageId]);

  // 3. Seed Users
  console.log('👤 Seeding users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Admin
  const adminId = 'user_admin_001';
  await client.query(`
    INSERT INTO "User" (id, role, status, phone, email, password, "firstName", "lastName", "createdAt", "updatedAt")
    VALUES ($1, 'ADMIN', 'ACTIVE', '+212600000000', 'admin@khadamat.com', $2, 'Admin', 'Khadamat', NOW(), NOW())
    ON CONFLICT (phone) DO NOTHING
  `, [adminId, hashedPassword]);

  // Pro 1 - Casablanca
  const pro1Id = 'user_pro1_002';
  await client.query(`
    INSERT INTO "User" (id, role, status, phone, email, password, "firstName", "lastName", "createdAt", "updatedAt")
    VALUES ($1, 'PRO', 'ACTIVE', '+212611111111', 'pro1@khadamat.com', $2, 'Mohammed', 'Alami', NOW(), NOW())
    ON CONFLICT (phone) DO NOTHING
  `, [pro1Id, hashedPassword]);

  await client.query(`
    INSERT INTO "ProProfile" ("userId", "cityId", whatsapp, "kycStatus", "createdAt", "updatedAt")
    VALUES ($1, $2, '+212611111111', 'NOT_SUBMITTED', NOW(), NOW())
    ON CONFLICT ("userId") DO NOTHING
  `, [pro1Id, casaId]);

  // Pro 2 - Marrakech
  const pro2Id = 'user_pro2_003';
  await client.query(`
    INSERT INTO "User" (id, role, status, phone, email, password, "firstName", "lastName", "createdAt", "updatedAt")
    VALUES ($1, 'PRO', 'ACTIVE', '+212622222222', 'pro2@khadamat.com', $2, 'Fatima', 'Bennani', NOW(), NOW())
    ON CONFLICT (phone) DO NOTHING
  `, [pro2Id, hashedPassword]);

  await client.query(`
    INSERT INTO "ProProfile" ("userId", "cityId", whatsapp, "kycStatus", "createdAt", "updatedAt")
    VALUES ($1, $2, '+212622222222', 'NOT_SUBMITTED', NOW(), NOW())
    ON CONFLICT ("userId") DO NOTHING
  `, [pro2Id, marrakechId]);

  // Client 1
  const client1Id = 'user_client1_004';
  await client.query(`
    INSERT INTO "User" (id, role, status, phone, email, password, "firstName", "lastName", "createdAt", "updatedAt")
    VALUES ($1, 'CLIENT', 'ACTIVE', '+212633333333', 'client1@example.com', $2, 'Youssef', 'Idrissi', NOW(), NOW())
    ON CONFLICT (phone) DO NOTHING
  `, [client1Id, hashedPassword]);

  // Client 2
  const client2Id = 'user_client2_005';
  await client.query(`
    INSERT INTO "User" (id, role, status, phone, email, password, "firstName", "lastName", "createdAt", "updatedAt")
    VALUES ($1, 'CLIENT', 'ACTIVE', '+212644444444', 'client2@example.com', $2, 'Salma', 'Tazi', NOW(), NOW())
    ON CONFLICT (phone) DO NOTHING
  `, [client2Id, hashedPassword]);

  // 4. Seed ProServices
  console.log('🔧 Seeding pro services...');

  // Pro1 (Casa) - Plomberie
  const service1Id = 'service_001';
  await client.query(`
    INSERT INTO "ProService" (id, "proUserId", "categoryId", "isActive", "pricingType", "minPriceMad", "maxPriceMad", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, true, 'RANGE', 200, 500, NOW(), NOW())
    ON CONFLICT ("proUserId", "categoryId") DO NOTHING
  `, [service1Id, pro1Id, plomberieId]);

  // Pro1 (Casa) - Électricité
  const service2Id = 'service_002';
  await client.query(`
    INSERT INTO "ProService" (id, "proUserId", "categoryId", "isActive", "pricingType", "minPriceMad", "maxPriceMad", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, true, 'RANGE', 250, 600, NOW(), NOW())
    ON CONFLICT ("proUserId", "categoryId") DO NOTHING
  `, [service2Id, pro1Id, electriciteId]);

  // Pro2 (Marrakech) - Ménage
  const service3Id = 'service_003';
  await client.query(`
    INSERT INTO "ProService" (id, "proUserId", "categoryId", "isActive", "pricingType", "fixedPriceMad", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, true, 'FIXED', 150, NOW(), NOW())
    ON CONFLICT ("proUserId", "categoryId") DO NOTHING
  `, [service3Id, pro2Id, menageId]);

  // Pro2 (Marrakech) - Jardinage
  const service4Id = 'service_004';
  await client.query(`
    INSERT INTO "ProService" (id, "proUserId", "categoryId", "isActive", "pricingType", "minPriceMad", "maxPriceMad", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, true, 'RANGE', 300, 800, NOW(), NOW())
    ON CONFLICT ("proUserId", "categoryId") DO NOTHING
  `, [service4Id, pro2Id, jardinageId]);

  // Count results
  console.log('\n✅ Seed completed!\n');
  console.log('📊 Database counts:');

  const citiesCount = await client.query('SELECT COUNT(*) FROM "City"');
  console.log(`   - Cities: ${citiesCount.rows[0].count}`);

  const categoriesCount = await client.query('SELECT COUNT(*) FROM "Category"');
  console.log(`   - Categories: ${categoriesCount.rows[0].count}`);

  const usersCount = await client.query('SELECT COUNT(*) FROM "User"');
  console.log(`   - Users: ${usersCount.rows[0].count}`);

  const proServicesCount = await client.query('SELECT COUNT(*) FROM "ProService"');
  console.log(`   - ProServices: ${proServicesCount.rows[0].count}`);

  console.log('\n🎉 Seeding finished successfully!\n');

  await client.end();
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
