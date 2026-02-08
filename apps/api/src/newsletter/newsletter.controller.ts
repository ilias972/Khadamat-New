import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { ConfirmDto } from './dto/confirm.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Subscribe to newsletter (double opt-in)' })
  @ApiResponse({ status: 200, description: 'Confirmation email sent' })
  async subscribe(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: SubscribeDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'] || undefined;

    return this.newsletterService.subscribe(dto.email, ip, userAgent);
  }

  @Get('confirm')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Confirm newsletter subscription via token (redirects to frontend)' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with status query param' })
  async confirm(
    @Query(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    query: ConfirmDto,
    @Res() res: Response,
  ) {
    const result = await this.newsletterService.confirm(query.token);

    const statusMap: Record<string, string> = {
      confirmed: 'success',
      already_confirmed: 'already',
      invalid_or_expired_token: 'invalid',
    };
    const param = statusMap[result.message] || 'invalid';
    const frontendUrl =
      this.newsletterService.getFrontendUrl();

    res.redirect(`${frontendUrl}/?newsletter=${param}`);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Unsubscribe from newsletter' })
  @ApiResponse({ status: 200, description: 'Unsubscribed' })
  async unsubscribe(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: UnsubscribeDto,
  ) {
    return this.newsletterService.unsubscribe(dto.email, dto.token);
  }

  @Get('admin/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export active subscribers as CSV (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'CSV file' })
  async exportCSV(@Res() res: Response) {
    const csv = await this.newsletterService.exportCSV();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="newsletter-subscribers-${Date.now()}.csv"`,
    );
    res.send(csv);
  }
}
