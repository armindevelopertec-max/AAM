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
import { AuditService } from '../audit/audit.service';
import type { User } from '@prisma/client';

/** Solo el rol root puede gestionar usuarios. */
function assertRoot(user: User) {
  if (user.role !== 'root') {
    throw new ForbiddenException(
      'Solo el rol root puede gestionar usuarios',
    );
  }
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly audit: AuditService,
  ) {}

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
    assertRoot(user);
    return this.authService.listUsers(user.storeId);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard)
  async createUser(@CurrentUser() user: User, @Body() dto: CreateUserDto) {
    assertRoot(user);
    const created = await this.authService.createUser(dto, user.storeId);
    await this.audit.log({
      storeId: user.storeId,
      actorId: user.id,
      actorName: user.name,
      action: 'usuario.creado',
      entity: 'User',
      entityId: created.id,
      details: { nombre: created.name, email: created.email, rol: created.role },
    });
    return created;
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateUserDto,
  ) {
    assertRoot(user);
    const updated = await this.authService.updateUser(id, dto, user.storeId);
    await this.audit.log({
      storeId: user.storeId,
      actorId: user.id,
      actorName: user.name,
      action: 'usuario.editado',
      entity: 'User',
      entityId: id,
      details: { nombre: updated.name, email: updated.email, rol: updated.role },
    });
    return updated;
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('id') id: string, @CurrentUser() user: User) {
    assertRoot(user);
    const result = await this.authService.deleteUser(
      id,
      user.storeId,
      user.id,
      user.role,
    );
    await this.audit.log({
      storeId: user.storeId,
      actorId: user.id,
      actorName: user.name,
      action: 'usuario.eliminado',
      entity: 'User',
      entityId: id,
    });
    return result;
  }
}
