import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { loadEnv } from "@rataria/shared";
import {
  createApiFootballMapper,
  defaultHttpOptions,
  MockOddsProvider,
  MockOddsProviderBravo,
  ProviderRegistry,
  RestOddsProvider,
} from "@rataria/provider-sdk";
import { disconnectPrisma, getPrisma } from "@rataria/database";
import { logger } from "./logger";
import { runIngestion } from "./ingestion";
import { runDetection } from "./detection";
import { runExpiration } from "./expiration";

const QUEUE_INGESTION = "ingestion";
const QUEUE_DETECTION = "detection";
const QUEUE_EXPIRATION = "expiration";

async function main() {
  const env = loadEnv();

  // Objeto de opções (não instância) evita conflito de versão de tipos
  // entre o ioredis local e o interno do BullMQ.
  const redisUrl = new URL(env.REDIS_URL);
  const bullConnection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    maxRetriesPerRequest: null as null,
  };
  const publisher = new Redis(env.REDIS_URL);

  const registry = new ProviderRegistry();
  registry.register(new MockOddsProvider({ variability: env.MOCK_VARIABILITY }));
  registry.register(new MockOddsProviderBravo());

  // Provedor REST real (API-Football) — só ativa se a chave estiver no ambiente.
  // A chave nunca é hardcoded; vem de REST_PROVIDER_API_KEY.
  if (env.REST_PROVIDER_API_KEY) {
    // Garante a linha do provedor no banco (para health logs / batches).
    await getPrisma().provider.upsert({
      where: { key: env.REST_PROVIDER_ID },
      update: { name: env.REST_PROVIDER_NAME, enabled: true },
      create: {
        key: env.REST_PROVIDER_ID,
        name: env.REST_PROVIDER_NAME,
        kind: "REST",
        enabled: true,
      },
    });
    registry.register(
      new RestOddsProvider({
        providerId: env.REST_PROVIDER_ID,
        baseUrl: env.REST_PROVIDER_BASE_URL,
        auth: { kind: "header", name: env.REST_PROVIDER_AUTH_NAME, apiKey: env.REST_PROVIDER_API_KEY },
        mapper: createApiFootballMapper({
          date: env.REST_PROVIDER_DATE,
          maxOddsPages: env.REST_PROVIDER_MAX_PAGES,
        }),
        http: defaultHttpOptions(),
      }),
    );
    logger.info(
      { providerId: env.REST_PROVIDER_ID, baseUrl: env.REST_PROVIDER_BASE_URL },
      "provedor REST real registrado",
    );
  }

  const ingestionQueue = new Queue(QUEUE_INGESTION, { connection: bullConnection });
  const detectionQueue = new Queue(QUEUE_DETECTION, { connection: bullConnection });
  const expirationQueue = new Queue(QUEUE_EXPIRATION, { connection: bullConnection });

  const defaultJobOptions = {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  };

  const ingestionWorker = new Worker(
    QUEUE_INGESTION,
    async () => {
      // Ciclo determinístico pela janela de tempo: retry do mesmo ciclo
      // reutiliza o batch (unique providerId+cycle) — idempotente.
      const cycle = Math.floor(Date.now() / env.INGESTION_INTERVAL_MS);
      for (const provider of registry.list()) {
        const health = await provider.healthCheck();
        const prisma = getPrisma();
        const providerRow = await prisma.provider.findUnique({
          where: { key: provider.providerId },
        });
        if (providerRow) {
          await prisma.providerHealthLog.create({
            data: {
              providerId: providerRow.id,
              healthy: health.healthy,
              latencyMs: health.latencyMs,
              message: health.message,
              checkedAt: health.checkedAt,
            },
          });
        }
        if (!health.healthy) {
          logger.warn({ providerId: provider.providerId }, "provedor indisponível — ciclo pulado");
          continue; // um provedor com falha não derruba o pipeline
        }

        const result = await runIngestion(provider, cycle);
        for (const eventId of result.eventIds) {
          await detectionQueue.add(
            "detect-event",
            { eventId },
            { ...defaultJobOptions, jobId: `detect:${cycle}:${eventId}` },
          );
        }
      }
    },
    { connection: bullConnection, concurrency: 1 },
  );

  const detectionWorker = new Worker(
    QUEUE_DETECTION,
    async (job) => {
      await runDetection(job.data.eventId as string, env, publisher);
    },
    { connection: bullConnection, concurrency: 1 },
  );

  const expirationWorker = new Worker(
    QUEUE_EXPIRATION,
    async () => {
      await runExpiration(publisher);
    },
    { connection: bullConnection, concurrency: 1 },
  );

  for (const w of [ingestionWorker, detectionWorker, expirationWorker]) {
    w.on("failed", (job, error) => {
      logger.error({ queue: w.name, jobId: job?.id, err: error.message }, "job falhou");
    });
  }

  // Agendamento recorrente + disparo imediato do primeiro ciclo.
  await ingestionQueue.upsertJobScheduler("ingestion-scheduler", {
    every: env.INGESTION_INTERVAL_MS,
  });
  await expirationQueue.upsertJobScheduler("expiration-scheduler", {
    every: Math.min(env.OPPORTUNITY_TTL_MS / 4, 30000),
  });

  logger.info(
    {
      ingestionIntervalMs: env.INGESTION_INTERVAL_MS,
      opportunityTtlMs: env.OPPORTUNITY_TTL_MS,
      providers: registry.list().map((p) => p.providerId),
    },
    "worker iniciado",
  );

  const shutdown = async () => {
    logger.info("encerrando worker...");
    await Promise.allSettled([
      ingestionWorker.close(),
      detectionWorker.close(),
      expirationWorker.close(),
      ingestionQueue.close(),
      detectionQueue.close(),
      expirationQueue.close(),
    ]);
    publisher.disconnect();
    await disconnectPrisma();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  logger.error({ err: error instanceof Error ? error.message : error }, "worker abortou");
  process.exit(1);
});
