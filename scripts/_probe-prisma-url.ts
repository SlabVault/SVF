import { prisma } from "@/lib/prisma";

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("ok");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log("ERR:", msg.slice(0, 400));
  } finally {
    await prisma.$disconnect();
  }
}

void main();
