
import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

// GET /api/categories
router.get("/", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      categories,
    });
  } catch (error) {
    console.error("Kategoriju ielādes kļūda:", error);

    res.status(500).json({
      message: "Neizdevās ielādēt kategorijas.",
    });
  }
});

export default router;
