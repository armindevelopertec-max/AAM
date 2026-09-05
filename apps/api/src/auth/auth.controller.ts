import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
  me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  listUsers(@CurrentUser() user: User) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Solo los administradores pueden ver los usuarios',
      );
    }
    return this.authService.listUsers(user.storeId);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard)
  createUser(@CurrentUser() user: User, @Body() dto: CreateUserDto) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Solo los administradores pueden crear usuarios',
      );
    }
    return this.authService.createUser(dto, user.storeId);
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard)
  updateUser(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateUserDto,
  ) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Solo los administradores pueden editar usuarios',
      );
    }
    return this.authService.updateUser(id, dto, user.storeId);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard)
  deleteUser(@Param('id') id: string, @CurrentUser() user: User) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Solo los administradores pueden eliminar usuarios',
      );
    }
    return this.authService.deleteUser(id, user.storeId, user.id);
  }
}
