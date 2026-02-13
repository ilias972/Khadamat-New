import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProService } from './pro.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  UpdateProProfileSchema,
  UpdateServicesSchema,
  UpdateAvailabilitySchema,
  type UpdateProProfileInput,
  type UpdateServicesInput,
  type UpdateAvailabilityInput,
} from '@khadamat/contracts';

@Controller('pro')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PRO')
export class ProController {
  constructor(private readonly proService: ProService) {}

  @Get('me')
  async getMyDashboard(@Request() req) {
    return this.proService.getMyDashboard(req.user.id);
  }

  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() dto: any,
  ) {
    // Validate base fields via Zod
    const baseFields: any = {};
    if (dto.phone !== undefined) baseFields.phone = dto.phone;
    if (dto.cityId !== undefined) baseFields.cityId = dto.cityId;
    if (dto.whatsapp !== undefined) baseFields.whatsapp = dto.whatsapp;

    // Only validate base fields if any are present
    if (Object.keys(baseFields).length > 0) {
      UpdateProProfileSchema.parse(baseFields);
    }

    // Pass all fields including bio and avatarUrl
    return this.proService.updateProfile(req.user.id, {
      ...baseFields,
      bio: dto.bio,
      avatarUrl: dto.avatarUrl,
    });
  }

  @Put('services')
  async updateServices(
    @Request() req,
    @Body(new ZodValidationPipe(UpdateServicesSchema))
    dto: UpdateServicesInput,
  ) {
    return this.proService.updateServices(req.user.id, dto);
  }

  @Put('availability')
  async updateAvailability(
    @Request() req,
    @Body(new ZodValidationPipe(UpdateAvailabilitySchema))
    dto: UpdateAvailabilityInput,
  ) {
    return this.proService.updateAvailability(req.user.id, dto);
  }

  // ── Portfolio ──

  @Get('portfolio')
  async getPortfolio(@Request() req) {
    return this.proService.getPortfolio(req.user.id);
  }

  @Post('portfolio')
  async addPortfolioImage(@Request() req, @Body() body: { url: string }) {
    if (!body.url || typeof body.url !== 'string' || body.url.trim().length === 0) {
      throw new Error('URL requise');
    }
    return this.proService.addPortfolioImage(req.user.id, body.url.trim());
  }

  @Delete('portfolio/:id')
  async deletePortfolioImage(@Request() req, @Param('id') id: string) {
    return this.proService.deletePortfolioImage(req.user.id, id);
  }
}
