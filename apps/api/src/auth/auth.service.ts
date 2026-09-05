import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtPayload } from './jwt-auth.guard';

export const USER_ROLES = ['admin', 'ventas'] as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async createUser(dto: CreateUserDto, callerStoreId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este email');
    }

    if (dto.role && !(USER_ROLES as readonly string[]).includes(dto.role)) {
      throw new BadRequestException('Rol no válido');
    }

    const storeId = dto.storeId ?? callerStoreId;
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      throw new ForbiddenException('Tienda no encontrada');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        storeId,
        name: dto.name,
        alias: dto.alias ?? null,
        phone: dto.phone ?? null,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role ?? 'admin',
      },
    });

    return this.toSafe(user);
  }

  async listUsers(storeId: string) {
    const users = await this.prisma.user.findMany({
      where: { storeId },
      orderBy: { id: 'asc' },
    });
    return users.map((user) => this.toSafe(user));
  }

  async updateUser(id: string, dto: UpdateUserDto, callerStoreId: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.storeId !== callerStoreId) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.role && !(USER_ROLES as readonly string[]).includes(dto.role)) {
      throw new BadRequestException('Rol no válido');
    }

    if (dto.email) {
      const normalized = dto.email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({
        where: { email: normalized },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe una cuenta con este email');
      }
    }

    const data: {
      name?: string;
      alias?: string | null;
      phone?: string | null;
      email?: string;
      role?: string;
      passwordHash?: string;
    } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.alias !== undefined) data.alias = dto.alias.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.password !== undefined && dto.password !== '') {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
    return this.toSafe(updated);
  }

  async deleteUser(id: string, callerStoreId: string, callerUserId: string) {
    if (id === callerUserId) {
      throw new BadRequestException('No puedes eliminar tu propio usuario');
    }

    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.storeId !== callerStoreId) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (target.role === 'admin') {
      const adminCount = await this.prisma.user.count({
        where: { storeId: callerStoreId, role: 'admin' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'No puedes eliminar el último administrador',
        );
      }
    }

    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    return this.buildSession(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return this.toSafe(user);
  }

  private async buildSession(user: {
    id: string;
    name: string;
    email: string;
    storeId: string;
    role: string;
    alias: string | null;
    phone: string | null;
  }) {
    const payload: JwtPayload = { sub: user.id };
    const token = await this.jwtService.signAsync(payload);
    return { token, user: this.toSafe(user) };
  }

  private toSafe(user: {
    id: string;
    name: string;
    email: string;
    storeId: string;
    role: string;
    alias: string | null;
    phone: string | null;
    createdAt?: Date;
  }) {
    return {
      id: user.id,
      name: user.name,
      alias: user.alias ?? null,
      phone: user.phone ?? null,
      email: user.email,
      storeId: user.storeId,
      role: user.role,
      createdAt: user.createdAt ?? null,
    };
  }
}
