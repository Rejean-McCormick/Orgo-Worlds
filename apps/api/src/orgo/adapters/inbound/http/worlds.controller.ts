import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Module,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import 'reflect-metadata';
import { z } from 'zod';
import {
  contextFromHeaders,
  type HeaderBag,
  WorldsService,
} from '../../../modules/worlds/worlds.service';
import { WorldsModule } from '../../../modules/worlds/worlds.module';
import { assertSafeStandaloneBinding, assertSafeStandaloneRequest, LOCAL_WORLDS_ORIGINS } from '../../../modules/worlds/standalone-security';

const keySchema = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/);
const uuid = z.string().uuid();
const createSchema = z
  .object({
    key: keySchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000).optional(),
    visibility: z.enum(['organization', 'private']).optional(),
  })
  .strict();
const releaseSchema = z
  .object({
    label: z.string().trim().max(200).optional(),
    config: z.record(z.unknown()).optional(),
  })
  .strict();
const membershipSchema = z
  .object({
    role: z.enum(['owner', 'maintainer', 'member', 'viewer']),
    is_active: z.boolean().optional(),
  })
  .strict();

@Controller('control/worlds')
export class WorldsController {
  constructor(@Inject(WorldsService) private readonly worlds: WorldsService) {}

  @Get()
  list(@Headers() headers: HeaderBag) {
    return this.worlds.list(contextFromHeaders(headers));
  }

  @Post()
  create(@Headers() headers: HeaderBag, @Body() body: unknown) {
    return this.worlds.create(contextFromHeaders(headers), createSchema.parse(body));
  }

  @Get(':key')
  get(@Headers() headers: HeaderBag, @Param('key') raw: string) {
    return this.worlds.get(contextFromHeaders(headers), keySchema.parse(raw));
  }

  @Get(':key/releases')
  releases(@Headers() headers: HeaderBag, @Param('key') raw: string) {
    return this.worlds.releases(contextFromHeaders(headers), keySchema.parse(raw));
  }

  @Post(':key/releases')
  createRelease(
    @Headers() headers: HeaderBag,
    @Param('key') raw: string,
    @Body() body: unknown,
  ) {
    return this.worlds.createRelease(
      contextFromHeaders(headers),
      keySchema.parse(raw),
      releaseSchema.parse(body),
    );
  }

  @Post(':key/releases/:releaseId/promote')
  promote(
    @Headers() headers: HeaderBag,
    @Param('key') raw: string,
    @Param('releaseId') releaseId: string,
  ) {
    return this.worlds.promote(
      contextFromHeaders(headers),
      keySchema.parse(raw),
      uuid.parse(releaseId),
    );
  }

  @Get(':key/memberships')
  memberships(@Headers() headers: HeaderBag, @Param('key') raw: string) {
    return this.worlds.memberships(contextFromHeaders(headers), keySchema.parse(raw));
  }

  @Put(':key/memberships/:userId')
  membership(
    @Headers() headers: HeaderBag,
    @Param('key') raw: string,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    return this.worlds.setMembership(
      contextFromHeaders(headers),
      keySchema.parse(raw),
      uuid.parse(userId),
      membershipSchema.parse(body),
    );
  }

  @Post(':key/archive')
  archive(@Headers() headers: HeaderBag, @Param('key') raw: string) {
    return this.worlds.archive(contextFromHeaders(headers), keySchema.parse(raw));
  }
}

@Controller('runtime')
export class WorldRuntimeController {
  constructor(@Inject(WorldsService) private readonly worlds: WorldsService) {}

  @Get()
  runtime(@Headers() headers: HeaderBag) {
    return this.worlds.runtime(contextFromHeaders(headers));
  }
}

@Module({
  imports: [WorldsModule],
  controllers: [WorldsController, WorldRuntimeController],
})
class StandaloneApiModule {}

async function bootstrap() {
  // Refuse BEFORE creating a listener or loading control-plane state.
  const host = assertSafeStandaloneBinding(process.env);
  const app = await NestFactory.create(StandaloneApiModule);
  // CORS is not authentication. Restrict browser origins and, independently,
  // reject nonlocal TCP peers and foreign Origin headers on every request.
  app.use((req: { socket?: { remoteAddress?: string }; headers?: { origin?: string } },
           res: { status: (value: number) => { json: (value: unknown) => void } },
           next: () => void) => {
    try {
      assertSafeStandaloneRequest(req.socket?.remoteAddress, req.headers?.origin);
      next();
    } catch {
      res.status(403).json({ code: 'ORGO_WORLDS_LOCAL_ONLY', message: 'Standalone control plane is local-development only' });
    }
  });
  app.enableCors({ origin: [...LOCAL_WORLDS_ORIGINS], credentials: false });
  app.setGlobalPrefix('api');
  const port = Number(process.env.ORGO_WORLDS_API_PORT ?? 4100);
  await app.listen(port, host);
  console.log(`Orgo Worlds DEV API (untrusted headers) at http://${host}:${port}/api`);
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entry && entry === path.resolve(fileURLToPath(import.meta.url))) {
  void bootstrap();
}
