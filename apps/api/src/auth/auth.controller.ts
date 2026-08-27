import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser('id') userId: number) {
    return this.authService.me(userId);
  }

  @Post('create-user')
  @UseGuards(JwtAuthGuard)
  createUser(@CurrentUser() user: User, @Body() dto: CreateUserDto) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Solo los administradores pueden crear usuarios',
      );
    }
    return this.authService.createUser(dto, user.storeId);
  }
}
