import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtPayload } from './jwt-auth.guard';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async createUser(dto: CreateUserDto, callerStoreId: number) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este email');
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
        email: dto.email.toLowerCase(),
        passwordHash,
      },
    });

    return this.toSafe(user);
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

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return this.toSafe(user);
  }

  private async buildSession(user: {
    id: number;
    name: string;
    email: string;
    storeId: number;
  }) {
    const payload: JwtPayload = { sub: user.id };
    const token = await this.jwtService.signAsync(payload);
    return { token, user: this.toSafe(user) };
  }

  private toSafe(user: {
    id: number;
    name: string;
    email: string;
    storeId: number;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      storeId: user.storeId,
    };
  }
}
