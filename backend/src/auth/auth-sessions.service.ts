import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import { DatabaseService } from '../db/database.service.js';
import { authSessions } from '../db/schema.js';
import { and, eq, gt, isNull } from 'drizzle-orm';

@Injectable()
export class AuthSessionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createSession(userId: string) {
    const refreshToken = randomBytes(32).toString('hex');

    const tokenHash = this.hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [session] = await this.databaseService.db
      .insert(authSessions)
      .values({
        userId,
        tokenHash,
        expiresAt,
      })
      .returning({
        id: authSessions.id,
        expiresAt: authSessions.expiresAt,
      });

    return {
      sessionId: session.id,
      refreshToken,
      expiresAt: session.expiresAt,
    };
  }

  async rotateSession(refreshToken: string) {
    const oldTokenHash = this.hashToken(refreshToken);

    const newRefreshToken = randomBytes(32).toString('hex');

    const newTokenHash = this.hashToken(newRefreshToken);

    const [session] = await this.databaseService.db
      .update(authSessions)
      .set({
        tokenHash: newTokenHash,
      })
      .where(
        and(
          eq(authSessions.tokenHash, oldTokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .returning({
        userId: authSessions.userId,
        expiresAt: authSessions.expiresAt,
      });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return {
      userId: session.userId,
      refreshToken: newRefreshToken,
      expiresAt: session.expiresAt,
    };
  }

  async revokeSession(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.databaseService.db
      .update(authSessions)
      .set({
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash),
          isNull(authSessions.revokedAt),
        ),
      );
  }
}
