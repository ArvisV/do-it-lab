import { Router } from "express";
import { prisma } from "../db.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

const router = Router();

// GET /api/favorites — pašreizējā lietotāja saglabātie publiskie projekti
router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const favorites = await prisma.favorite.findMany({
        where: {
          userId: req.userId,
          project: {
            isPublished: true,
          },
        },
        include: {
          project: {
            include: {
              category: true,
              _count: {
                select: {
                  steps: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({ favorites });
    } catch (error) {
      console.error("Favorītu ielādes kļūda:", error);
      res.status(500).json({
        message: "Neizdevās ielādēt saglabātos projektus.",
      });
    }
  },
);

// GET /api/favorites/:projectId/status — pārbauda, vai projekts ir saglabāts
router.get(
  "/:projectId/status",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = Array.isArray(req.params.projectId)
        ? req.params.projectId[0]
        : req.params.projectId;

      if (!projectId) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      const favorite = await prisma.favorite.findUnique({
        where: {
          userId_projectId: {
            userId: req.userId!,
            projectId,
          },
        },
        select: {
          id: true,
        },
      });

      res.json({
        isSaved: Boolean(favorite),
      });
    } catch (error) {
      console.error("Favorīta statusa pārbaudes kļūda:", error);
      res.status(500).json({
        message: "Neizdevās pārbaudīt projekta saglabāšanas statusu.",
      });
    }
  },
);

// POST /api/favorites/:projectId — pievieno projektu favorītiem
router.post(
  "/:projectId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = Array.isArray(req.params.projectId)
        ? req.params.projectId[0]
        : req.params.projectId;

      if (!projectId) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          isPublished: true,
        },
        select: {
          id: true,
        },
      });

      if (!project) {
        res.status(404).json({
          message: "Projekts nav atrasts vai nav publiski pieejams.",
        });
        return;
      }

      await prisma.favorite.upsert({
        where: {
          userId_projectId: {
            userId: req.userId!,
            projectId,
          },
        },
        create: {
          userId: req.userId!,
          projectId,
        },
        update: {},
      });

      res.json({
        message: "Projekts pievienots favorītiem.",
        isSaved: true,
      });
    } catch (error) {
      console.error("Favorīta pievienošanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās pievienot projektu favorītiem.",
      });
    }
  },
);

// DELETE /api/favorites/:projectId — noņem projektu no favorītiem
router.delete(
  "/:projectId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = Array.isArray(req.params.projectId)
        ? req.params.projectId[0]
        : req.params.projectId;

      if (!projectId) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      await prisma.favorite.deleteMany({
        where: {
          userId: req.userId!,
          projectId,
        },
      });

      res.json({
        message: "Projekts noņemts no favorītiem.",
        isSaved: false,
      });
    } catch (error) {
      console.error("Favorīta noņemšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās noņemt projektu no favorītiem.",
      });
    }
  },
);

export default router;