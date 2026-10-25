import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import { AuthSessionsService } from './auth-sessions.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly authSessionsService: AuthSessionsService,
  ) {}

  async register(data: RegisterDto) {
    const email = data.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
    });
    try {
      return await this.usersService.createUser({
        name: data.name.trim(),
        email,
        passwordHash,
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(data: LoginDto) {
    const email = data.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      data.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
    });

    const session = await this.authSessionsService.createSession(user.id);

    return {
      accessToken,
      refreshToken: session.refreshToken,
      refreshTokenExpiresAt: session.expiresAt,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.authSessionsService.rotateSession(refreshToken);

    const accessToken = await this.jwtService.signAsync({
      sub: session.userId,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshToken: session.refreshToken,
      refreshTokenExpiresAt: session.expiresAt,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }
    await this.authSessionsService.revokeSession(refreshToken);
  }
}
