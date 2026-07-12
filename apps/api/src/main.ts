import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "@nestjs/common";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { loadEnv } from "@rataria/shared";
import { AppModule } from "./app.module";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { logger: ["warn", "error", "log"] });

  // Cabeçalhos de segurança (Helmet). CSP relaxada para o Swagger UI.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Logs JSON estruturados com correlation id em toda requisição.
  app.use(
    pinoHttp({
      level: env.LOG_LEVEL,
      genReqId: (req) => (req.headers["x-correlation-id"] as string) ?? randomUUID(),
      redact: ["req.headers.authorization", "req.headers.cookie"],
      customProps: () => ({ service: "api" }),
    }),
  );

  // CORS restritivo: apenas a origem do dashboard.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Rataria — Surebet API")
    .setDescription(
      "Agregação de odds e detecção de arbitragem esportiva. " +
        "Oportunidades são matemáticas, sujeitas a revalidação, e nunca garantia de lucro.",
    )
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(env.API_PORT);
  new Logger("bootstrap").log(`API ouvindo em http://localhost:${env.API_PORT} (docs em /docs)`);
}

bootstrap().catch((error) => {
  console.error("API abortou na inicialização:", error);
  process.exit(1);
});
