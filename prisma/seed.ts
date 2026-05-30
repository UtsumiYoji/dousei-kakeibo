import { PrismaClient } from "@prisma/client";
import { equalRatios } from "../lib/money";

const prisma = new PrismaClient();

const defaultCategories = ["家賃", "光熱費", "通信費", "食費", "その他"];

async function main() {
  const members = await prisma.member.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }]
  });
  const ratios = equalRatios(members.map((member) => member.id));

  for (const [displayOrder, name] of defaultCategories.entries()) {
    const category = await prisma.category.upsert({
      where: { name },
      update: { displayOrder },
      create: { name, displayOrder }
    });

    if (ratios.length > 0) {
      await prisma.categoryRatio.deleteMany({ where: { categoryId: category.id } });
      await prisma.categoryRatio.createMany({
        data: ratios.map((ratio) => ({
          categoryId: category.id,
          memberId: ratio.memberId,
          basisPoints: ratio.basisPoints
        }))
      });
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
