import { Controller, Get, Post, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
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
  @Get('kits/:id')
  async getPublicKit(@Param('id') id: string) {
    return this.publicService.getPublicKit(id);
  }

  @Public()
  @Post('contact')
  @HttpCode(HttpStatus.OK)
  async submitContact(@Body() input: ContactFormInput) {
    return this.publicService.submitContactForm(input);
  }
}