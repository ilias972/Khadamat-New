import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  PublicCity,
  PublicCategory,
  PublicProCard,
  PublicProProfile,
} from '@khadamat/contracts';

/**
 * CatalogService
 *
 * Service PUBLIC pour la découverte du marketplace.
 *
 * ⚠️ PRIVACY SHIELD ACTIF ⚠️
 * Ce service ne doit JAMAIS exposer :
 * - email, phone, whatsapp, password
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/public/cities
   * Renvoie toutes les villes disponibles
   */
  async getCities(): Promise<PublicCity[]> {
    const cities = await this.prisma.query(
      'SELECT id, name, slug FROM "City" ORDER BY name ASC',
    );
    return cities.rows;
  }

  /**
   * GET /api/public/categories
   * Renvoie toutes les catégories de services
   */
  async getCategories(): Promise<PublicCategory[]> {
    const categories = await this.prisma.query(
      'SELECT id, name, slug FROM "Category" ORDER BY name ASC',
    );
    return categories.rows;
  }

  /**
   * GET /api/public/pros
   * Liste des Pros actifs avec filtres optionnels
   *
   * @param cityId - Filtrer par ville (optionnel)
   * @param categoryId - Filtrer par catégorie de service (optionnel)
   */
  async getPros(
    cityId?: string,
    categoryId?: string,
  ): Promise<PublicProCard[]> {
    // Construction de la requête SQL avec filtres dynamiques
    let query = `
      SELECT DISTINCT
        u.id,
        u."firstName",
        u."lastName",
        u."createdAt",
        c.name as city_name,
        pp."kycStatus",
        pp."cityId"
      FROM "User" u
      INNER JOIN "ProProfile" pp ON pp."userId" = u.id
      INNER JOIN "City" c ON c.id = pp."cityId"
      WHERE u.role = 'PRO' AND u.status = 'ACTIVE'
    `;

    const params: string[] = [];
    let paramIndex = 1;

    // Filtre par ville
    if (cityId) {
      query += ` AND pp."cityId" = $${paramIndex}`;
      params.push(cityId);
      paramIndex++;
    }

    // Filtre par catégorie (via ProService)
    if (categoryId) {
      query += `
        AND EXISTS (
          SELECT 1 FROM "ProService" ps
          WHERE ps."proUserId" = u.id
          AND ps."categoryId" = $${paramIndex}
          AND ps."isActive" = true
        )
      `;
      params.push(categoryId);
      paramIndex++;
    }

    query += ' ORDER BY u."createdAt" DESC';

    const result = await this.prisma.query(query, params);

    // Pour chaque Pro, récupérer ses services
    const prosWithServices = await Promise.all(
      result.rows.map(async (row) => {
        const servicesQuery = `
          SELECT
            cat.name as category_name,
            ps."pricingType",
            ps."minPriceMad",
            ps."maxPriceMad",
            ps."fixedPriceMad"
          FROM "ProService" ps
          INNER JOIN "Category" cat ON cat.id = ps."categoryId"
          WHERE ps."proUserId" = $1 AND ps."isActive" = true
        `;

        const servicesResult = await this.prisma.query(servicesQuery, [
          row.id,
        ]);

        const services = servicesResult.rows.map((service) => ({
          name: service.category_name,
          priceFormatted: this.formatPrice(
            service.pricingType,
            service.fixedPriceMad,
            service.minPriceMad,
            service.maxPriceMad,
          ),
        }));

        // ⚠️ PRIVACY SHIELD: Masquer le nom de famille
        const maskedLastName = this.maskLastName(row.lastName);

        return {
          id: row.id,
          firstName: row.firstName,
          lastName: maskedLastName,
          city: row.city_name,
          isVerified: row.kycStatus === 'APPROVED',
          services,
        };
      }),
    );

    return prosWithServices;
  }

  /**
   * GET /api/public/pros/:id
   * Détail d'un Pro spécifique
   */
  async getProProfile(proId: string): Promise<PublicProProfile> {
    // Vérifier que le Pro existe et est actif
    const userQuery = `
      SELECT
        u.id,
        u."firstName",
        u."lastName",
        u.role,
        u.status,
        c.name as city_name,
        pp."kycStatus"
      FROM "User" u
      INNER JOIN "ProProfile" pp ON pp."userId" = u.id
      INNER JOIN "City" c ON c.id = pp."cityId"
      WHERE u.id = $1 AND u.role = 'PRO' AND u.status = 'ACTIVE'
    `;

    const userResult = await this.prisma.query(userQuery, [proId]);

    if (userResult.rows.length === 0) {
      throw new NotFoundException('Pro not found');
    }

    const user = userResult.rows[0];

    // Récupérer tous les services du Pro
    const servicesQuery = `
      SELECT
        cat.name as category_name,
        ps."pricingType",
        ps."minPriceMad",
        ps."maxPriceMad",
        ps."fixedPriceMad"
      FROM "ProService" ps
      INNER JOIN "Category" cat ON cat.id = ps."categoryId"
      WHERE ps."proUserId" = $1 AND ps."isActive" = true
    `;

    const servicesResult = await this.prisma.query(servicesQuery, [
      proId,
    ]);

    const services = servicesResult.rows.map((service) => ({
      name: service.category_name,
      priceFormatted: this.formatPrice(
        service.pricingType,
        service.fixedPriceMad,
        service.minPriceMad,
        service.maxPriceMad,
      ),
    }));

    // ⚠️ PRIVACY SHIELD: Masquer le nom de famille
    const maskedLastName = this.maskLastName(user.lastName);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: maskedLastName,
      city: user.city_name,
      isVerified: user.kycStatus === 'APPROVED',
      services,
      bio: undefined, // Pas encore implémenté dans le schéma
    };
  }

  /**
   * PRIVACY HELPER: Masquer le nom de famille
   * "Benjelloun" → "B."
   * null/undefined → ""
   */
  private maskLastName(lastName: string | null | undefined): string {
    if (!lastName || lastName.length === 0) {
      return '';
    }
    return `${lastName.charAt(0).toUpperCase()}.`;
  }

  /**
   * BUSINESS HELPER: Formater le prix selon le type
   * FIXED: "200 MAD"
   * RANGE: "De 200 à 500 MAD"
   * null: "Prix sur demande"
   */
  private formatPrice(
    pricingType: string | null,
    fixedPrice: number | null,
    minPrice: number | null,
    maxPrice: number | null,
  ): string {
    if (pricingType === 'FIXED' && fixedPrice) {
      return `${fixedPrice} MAD`;
    }

    if (pricingType === 'RANGE' && minPrice && maxPrice) {
      return `De ${minPrice} à ${maxPrice} MAD`;
    }

    return 'Prix sur demande';
  }
}
