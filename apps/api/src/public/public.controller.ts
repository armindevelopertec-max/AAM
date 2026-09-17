import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../auth/jwt-auth.guard';
import type { ContactFormInput } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Get('store')
  async getStoreInfo() {
    return this.publicService.getStoreInfo();
  }

  @Public()
  @Get('kits')
  async getPublicKits() {
    return this.publicService.getPublicKits();
  }

  @Public()
  @Post('contact')
  @HttpCode(HttpStatus.OK)
  async submitContact(@Body() input: ContactFormInput) {
    return this.publicService.submitContactForm(input);
  }
}