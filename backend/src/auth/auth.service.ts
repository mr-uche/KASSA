import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RegisterDto } from './dto/register.dto';

const ACCESS_TOKEN_SECONDS = 15 * 60;
const REMEMBER_DAYS = 30;
const REMEMBER_SECONDS = REMEMBER_DAYS * 24 * 60 * 60;

type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
};

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async resultFor(user: PublicUser, rememberMe = false) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, scope: 'access' });
    if (!rememberMe) {
      return { user, tokenType: 'Bearer', accessToken, expiresInSeconds: ACCESS_TOKEN_SECONDS };
    }

    // The browser receives an opaque random token; the database stores only its hash.
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        tokenHash: digest(refreshToken),
        expiresAt: new Date(Date.now() + REMEMBER_SECONDS * 1000),
      },
    });
    return {
      user,
      tokenType: 'Bearer',
      accessToken,
      expiresInSeconds: ACCESS_TOKEN_SECONDS,
      refreshToken,
      refreshExpiresInSeconds: REMEMBER_SECONDS,
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await hash(dto.password, 12);
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName: dto.fullName.trim(),
          phone: dto.phone?.trim() || null,
        },
        select: { id: true, email: true, fullName: true, phone: true },
      });
      return this.resultFor(user);
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.resultFor({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
    }, dto.rememberMe === true);
  }

  async refresh(dto: RefreshSessionDto) {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: digest(dto.refreshToken) },
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true } },
      },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Remembered session has expired or was revoked');
    }
    // Do not extend the session's absolute expiry during refresh.
    return {
      user: session.user,
      tokenType: 'Bearer',
      accessToken: await this.jwt.signAsync({ sub: session.user.id, scope: 'access' }),
      expiresInSeconds: ACCESS_TOKEN_SECONDS,
    };
  }

  async logout(dto: RefreshSessionDto) {
    await this.prisma.authSession.updateMany({
      where: { tokenHash: digest(dto.refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Signed out' };
  }

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, fullName: true, phone: true, createdAt: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
