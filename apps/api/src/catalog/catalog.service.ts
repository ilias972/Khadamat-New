import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  PublicCity,
  PublicCategory,
  PublicProCard,
  PublicProProfile,
} from '@khadamat/contracts';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  // 1. Récupérer les villes
  async getCities(): Promise<PublicCity[]> {
    const cities = await this.prisma.city.findMany({
      orderBy: { name: 'asc' },
    });
    // On retourne directement car l'objet City de la DB est public (id, name, slug)
    return cities;
  }

  // 2. Récupérer les catégories
  async getCategories(): Promise<PublicCategory[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return categories;
  }

  // 3. Récupérer la liste des Pros (avec Filtres & Privacy)
  async getPros(filters: { cityId?: string; categoryId?: string }): Promise<PublicProCard[]> {
    const { cityId, categoryId } = filters;

    // Construction de la requête dynamique
    const whereClause: any = {
      role: 'PRO',
      status: 'ACTIVE', // Filtre de sécurité
      proProfile: {
        isNot: null, // Le profil doit exister
      },
    };

    if (cityId) {
      whereClause.proProfile.cityId = cityId;
    }

    if (categoryId) {
      // On vérifie si le pro a au moins un service dans cette catégorie
      whereClause.proProfile.services = {
        some: {
          categoryId: categoryId,
        },
      };
    }

    // Exécution de la requête Prisma
    const pros = await this.prisma.user.findMany({
      where: whereClause,
      include: {
        proProfile: {
          include: {
            city: true,
            services: {
              include: {
                category: true, // Pour avoir le nom du service (Plomberie)
              },
            },
          },
        },
      },
    });

    // MAPPING & PRIVACY SHIELD 🛡️
    // On transforme les données brutes en DTO public sécurisé
    return pros.map((pro) => this.mapToPublicProCard(pro));
  }

  // 4. Récupérer le détail d'un Pro
  async getProDetail(id: string): Promise<PublicProProfile> {
    const pro = await this.prisma.user.findUnique({
      where: {
        id,
        role: 'PRO',
        status: 'ACTIVE',
      },
      include: {
        proProfile: {
          include: {
            city: true,
            services: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!pro || !pro.proProfile) {
      throw new NotFoundException(`Pro introuvable ou inactif`);
    }

    // MAPPING & PRIVACY SHIELD 🛡️
    const card = this.mapToPublicProCard(pro);
    
    return {
      ...card,
      bio: pro.proProfile.bio || '',
      // Ici on pourrait ajouter d'autres détails spécifiques au profil complet
    };
  }

  // ===========================================================================
  // PRIVATE HELPERS (PRIVACY CORE)
  // ===========================================================================

  private mapToPublicProCard(user: any): PublicProCard {
    const profile = user.proProfile;

    // 1. Masquage du nom (Ahmed Benani -> Ahmed B.)
    const lastNameInitial = user.lastName ? `${user.lastName.charAt(0)}.` : '';
    const displayName = `${user.firstName} ${lastNameInitial}`.trim();

    // 2. Formatage des services
    const servicesFormatted = profile.services.map((s: any) => {
      let priceText = 'Prix sur devis';
      
      if (s.pricingType === 'FIXED' && s.price) {
        priceText = `${s.price} MAD`;
      } else if (s.pricingType === 'RANGE' && s.minPrice && s.maxPrice) {
        priceText = `De ${s.minPrice} à ${s.maxPrice} MAD`;
      } else if (s.pricingType === 'RANGE' && s.minPrice) {
        priceText = `À partir de ${s.minPrice} MAD`;
      }

      // On utilise le nom de la catégorie comme nom de service
      return {
        name: s.category?.name || 'Service', 
        priceFormatted: priceText,
      };
    });

    // 3. Construction de l'objet final (SANS email, SANS phone, SANS whatsapp)
    return {
      id: user.id,
      firstName: user.firstName, // On garde le prénom complet si besoin, ou on utilise displayName
      lastName: lastNameInitial,
      city: profile.city?.name || 'Maroc',
      isVerified: profile.kycStatus === 'APPROVED',
      services: servicesFormatted,
      rating: 0, // Mock pour l'instant
    };
  }
}
