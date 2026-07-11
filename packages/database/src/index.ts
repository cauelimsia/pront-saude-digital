import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";
export { Prisma } from "@prisma/client";

let client: PrismaClient | undefined;

/** Cliente Prisma singleton por processo. */
export function getPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
  }
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}
