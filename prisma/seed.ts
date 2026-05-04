import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function seedCatalogForTenant(tenantId: string): Promise<void> {
  const count = await prisma.product.count({ where: { tenantId } });
  if (count > 0) return;

  await prisma.product.createMany({
    data: [
      { tenantId, displayCode: "01", name: "Pizza mussarela", price: new Prisma.Decimal("55.80") },
      { tenantId, displayCode: "02", name: "Pizza calabresa", price: new Prisma.Decimal("58.80") },
      { tenantId, displayCode: "03", name: "Pizza 4 queijos", price: new Prisma.Decimal("65.80") },
    ],
  });
}

async function main(): Promise<void> {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  for (const t of tenants) {
    await seedCatalogForTenant(t.id);
    console.log(`Seeded catalog for tenant ${t.name} (${t.id})`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
