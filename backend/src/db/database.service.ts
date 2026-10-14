import 'dotenv/config';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  readonly db;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is missing');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
