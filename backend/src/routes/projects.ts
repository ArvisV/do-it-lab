
import { Router } from "express";
import { prisma } from "../db.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

const router = Router();

// GET /api/projects — publicēto projektu saraksts
router.get("/", async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { isPublished: true },
      include: {
        category: true,
        user: {
          select: { id: true, email: true },
        },
        _count: {
          select: { steps: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ projects });
  } catch (error) {
    console.error("Projektu ielādes kļūda:", error);
    res.status(500).json({ message: "Neizdevās ielādēt projektus." });
  }
});

// GET /api/projects/mine — pašreizējā lietotāja projekti
router.get(
  "/mine",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projects = await prisma.project.findMany({
        where: { userId: req.userId },
        include: {
          category: true,
          _count: {
            select: { steps: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      res.json({ projects });
    } catch (error) {
      console.error("Lietotāja projektu ielādes kļūda:", error);
      res.status(500).json({ message: "Neizdevās ielādēt tavus projektus." });
    }
  },
);

// POST /api/projects — jauna projekta izveide
router.post(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { title, description, categoryId } = req.body;

      if (
        typeof title !== "string" ||
        !title.trim() ||
        typeof description !== "string" ||
        !description.trim()
      ) {
        res.status(400).json({
          message: "Norādi projekta nosaukumu un aprakstu.",
        });
        return;
      }

      if (
        categoryId !== undefined &&
        categoryId !== null &&
        typeof categoryId !== "string"
      ) {
        res.status(400).json({
          message: "Kategorija nav derīga.",
        });
        return;
      }

      const project = await prisma.project.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          userId: req.userId!,
          ...(categoryId ? { categoryId } : {}),
        },
        include: {
          category: true,
        },
      });

      res.status(201).json({
        message: "Projekts veiksmīgi izveidots.",
        project,
      });
    } catch (error) {
      console.error("Projekta izveides kļūda:", error);
      res.status(500).json({ message: "Neizdevās izveidot projektu." });
    }
  },
);


/**
 * PATCH /api/projects/:id/visibility
 * Publicē projektu vai padara to privātu.
 * Projektu drīkst mainīt tikai tā īpašnieks.
 */
router.patch(
  "/:id/visibility",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }
      const { isPublished } = req.body;

      if (typeof isPublished !== "boolean") {
        res.status(400).json({
          message: "Norādi, vai projektam jābūt publicētam.",
        });
        return;
      }

      const result = await prisma.project.updateMany({
        where: {
          id,
          userId: req.userId!,
        },
        data: {
          isPublished,
        },
      });

      if (result.count === 0) {
        res.status(404).json({
          message: "Projekts nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      res.json({
        message: isPublished
          ? "Projekts veiksmīgi publicēts."
          : "Projekts padarīts privāts.",
        isPublished,
      });
    } catch (error) {
      console.error("Projekta redzamības maiņas kļūda:", error);

      res.status(500).json({
        message: "Neizdevās mainīt projekta redzamību.",
      });
    }
  },
);


export default router;
