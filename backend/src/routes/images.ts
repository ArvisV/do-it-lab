
import { Router } from "express";
import * as path from "node:path";
import { prisma } from "../db.js";
import {
  requireAuth,
  optionalAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import { uploadSingleImage } from "../middleware/imageUpload.js";
import {
  saveProjectImage,
  deleteStoredImage,
} from "../utils/imageStorage.js";

const router = Router();

function getParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}



// Droši nosūta saglabātu attēlu.
// Faili netiek publiskoti ar express.static.
function sendStoredImage(
  res: import("express").Response,
  relativePath: string,
): void {
  const segments = relativePath.replace(/\\/g, "/").split("/");

  if (
    segments[0] !== "projects" ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === "..",
    )
  ) {
    res.status(404).json({
      message: "Attēls nav atrasts.",
    });
    return;
  }

  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  const absolutePath = path.resolve(uploadsRoot, ...segments);

  if (!absolutePath.startsWith(uploadsRoot + path.sep)) {
    res.status(404).json({
      message: "Attēls nav atrasts.",
    });
    return;
  }

  res.setHeader("Cache-Control", "private, no-store");

  res.sendFile(
    absolutePath,
    { dotfiles: "deny" },
    (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({
          message: "Attēls nav atrasts.",
        });
      }
    },
  );
}

// ======================================================
// TITULBILDE
// ======================================================

// GET /api/images/projects/:projectId/cover
// Publisku projektu titulbildi var apskatīt visi.
// Privāta projekta titulbildi var apskatīt tikai īpašnieks.
router.get(
  "/projects/:projectId/cover",
  optionalAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = getParam(req.params.projectId);

      if (!projectId) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          userId: true,
          isPublished: true,
          imagePath: true,
        },
      });

      if (
        !project ||
        (!project.isPublished && project.userId !== req.userId)
      ) {
        res.status(404).json({
          message: "Attēls nav pieejams.",
        });
        return;
      }

      if (!project.imagePath) {
        res.status(404).json({
          message: "Projektam nav pievienota titulbilde.",
        });
        return;
      }

      sendStoredImage(res, project.imagePath);
    } catch (error) {
      console.error("Titulbildes ielādes kļūda:", error);
      res.status(500).json({
        message: "Neizdevās ielādēt titulbildi.",
      });
    }
  },
);

// POST /api/images/projects/:projectId/cover
// Pievieno vai aizstāj projekta titulbildi.
router.post(
  "/projects/:projectId/cover",
  requireAuth,
  uploadSingleImage,
  async (req: AuthenticatedRequest, res) => {
    let newImagePath: string | null = null;

    try {
      const projectId = getParam(req.params.projectId);

      if (!projectId) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          message: "Izvēlies attēlu.",
        });
        return;
      }

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: req.userId,
        },
        select: {
          id: true,
          imagePath: true,
        },
      });

      if (!project) {
        res.status(404).json({
          message: "Projekts nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      newImagePath = await saveProjectImage(
        req.file.buffer,
        projectId,
        "cover",
      );

      await prisma.project.update({
        where: { id: projectId },
        data: { imagePath: newImagePath },
      });

      if (project.imagePath) {
        await deleteStoredImage(project.imagePath).catch((error) => {
          console.error("Vecās titulbildes dzēšanas kļūda:", error);
        });
      }

      res.json({
        message: "Projekta titulbilde veiksmīgi atjaunota.",
        imagePath: newImagePath,
        imageUrl: `/api/images/projects/${projectId}/cover`,
      });
    } catch (error) {
      if (newImagePath) {
        await deleteStoredImage(newImagePath).catch(console.error);
      }

      console.error("Titulbildes saglabāšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās saglabāt projekta titulbildi.",
      });
    }
  },
);

// DELETE /api/images/projects/:projectId/cover
// Noņem projekta titulbildi.
router.delete(
  "/projects/:projectId/cover",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = getParam(req.params.projectId);

      if (!projectId) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: req.userId,
        },
        select: {
          id: true,
          imagePath: true,
        },
      });

      if (!project) {
        res.status(404).json({
          message: "Projekts nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { imagePath: null },
      });

      if (project.imagePath) {
        await deleteStoredImage(project.imagePath).catch((error) => {
          console.error("Titulbildes dzēšanas kļūda:", error);
        });
      }

      res.json({
        message: "Projekta titulbilde noņemta.",
      });
    } catch (error) {
      console.error("Titulbildes noņemšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās noņemt titulbildi.",
      });
    }
  },
);

// ======================================================
// PROJEKTA SOĻU ATTĒLI
// ======================================================

// GET /api/images/steps/:stepId
// Publiska projekta soļa attēlu var apskatīt visi.
// Privāta projekta attēlu var apskatīt tikai īpašnieks.
router.get(
  "/steps/:stepId",
  optionalAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const stepId = getParam(req.params.stepId);

      if (!stepId) {
        res.status(400).json({
          message: "Nav norādīts projekta soļa ID.",
        });
        return;
      }

      const step = await prisma.projectStep.findUnique({
        where: { id: stepId },
        select: {
          imagePath: true,
          project: {
            select: {
              userId: true,
              isPublished: true,
            },
          },
        },
      });

      if (
        !step ||
        (!step.project.isPublished &&
          step.project.userId !== req.userId)
      ) {
        res.status(404).json({
          message: "Attēls nav pieejams.",
        });
        return;
      }

      if (!step.imagePath) {
        res.status(404).json({
          message: "Šim solim nav pievienots attēls.",
        });
        return;
      }

      sendStoredImage(res, step.imagePath);
    } catch (error) {
      console.error("Soļa attēla ielādes kļūda:", error);
      res.status(500).json({
        message: "Neizdevās ielādēt soļa attēlu.",
      });
    }
  },
);

// POST /api/images/steps/:stepId
// Pievieno vai aizstāj attēlu projekta solim.
router.post(
  "/steps/:stepId",
  requireAuth,
  uploadSingleImage,
  async (req: AuthenticatedRequest, res) => {
    let newImagePath: string | null = null;

    try {
      const stepId = getParam(req.params.stepId);

      if (!stepId) {
        res.status(400).json({
          message: "Nav norādīts projekta soļa ID.",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          message: "Izvēlies attēlu.",
        });
        return;
      }

      const step = await prisma.projectStep.findFirst({
        where: {
          id: stepId,
          project: {
            userId: req.userId,
          },
        },
        select: {
          id: true,
          projectId: true,
          imagePath: true,
        },
      });

      if (!step) {
        res.status(404).json({
          message: "Projekta solis nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      newImagePath = await saveProjectImage(
        req.file.buffer,
        step.projectId,
        "steps",
      );

      await prisma.projectStep.update({
        where: { id: stepId },
        data: { imagePath: newImagePath },
      });

      if (step.imagePath) {
        await deleteStoredImage(step.imagePath).catch((error) => {
          console.error("Vecā soļa attēla dzēšanas kļūda:", error);
        });
      }

      res.json({
        message: "Soļa attēls veiksmīgi atjaunots.",
        imagePath: newImagePath,
        imageUrl: `/api/images/steps/${stepId}`,
      });
    } catch (error) {
      if (newImagePath) {
        await deleteStoredImage(newImagePath).catch(console.error);
      }

      console.error("Soļa attēla saglabāšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās saglabāt soļa attēlu.",
      });
    }
  },
);

// DELETE /api/images/steps/:stepId
// Noņem projekta soļa attēlu.
router.delete(
  "/steps/:stepId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const stepId = getParam(req.params.stepId);

      if (!stepId) {
        res.status(400).json({
          message: "Nav norādīts projekta soļa ID.",
        });
        return;
      }

      const step = await prisma.projectStep.findFirst({
        where: {
          id: stepId,
          project: {
            userId: req.userId,
          },
        },
        select: {
          id: true,
          imagePath: true,
        },
      });

      if (!step) {
        res.status(404).json({
          message: "Projekta solis nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      await prisma.projectStep.update({
        where: { id: stepId },
        data: { imagePath: null },
      });

      if (step.imagePath) {
        await deleteStoredImage(step.imagePath).catch((error) => {
          console.error("Soļa attēla dzēšanas kļūda:", error);
        });
      }

      res.json({
        message: "Soļa attēls noņemts.",
      });
    } catch (error) {
      console.error("Soļa attēla noņemšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās noņemt soļa attēlu.",
      });
    }
  },
);

// ======================================================
// PROJEKTA GALERIJA
// ======================================================

// GET /api/images/gallery/:imageId
// Galerijas attēlu drīkst apskatīt īpašnieks vai jebkurš
// apmeklētājs, ja projekts ir publicēts un galerija publiska.
router.get(
  "/gallery/:imageId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const imageId = getParam(req.params.imageId);

      if (!imageId) {
        res.status(400).json({
          message: "Nav norādīts galerijas attēla ID.",
        });
        return;
      }

      const image = await prisma.projectGalleryImage.findUnique({
        where: { id: imageId },
        select: {
          imagePath: true,
          project: {
            select: {
              userId: true,
              isPublished: true,
              isGalleryPublic: true,
            },
          },
        },
      });

      if (!image) {
        res.status(404).json({
          message: "Attēls nav atrasts.",
        });
        return;
      }

      const isOwner = image.project.userId === req.userId;
      const isPublic =
        image.project.isPublished &&
        image.project.isGalleryPublic;

      if (!isOwner && !isPublic) {
        res.status(404).json({
          message: "Attēls nav publiski pieejams.",
        });
        return;
      }

      sendStoredImage(res, image.imagePath);
    } catch (error) {
      console.error("Galerijas attēla ielādes kļūda:", error);
      res.status(500).json({
        message: "Neizdevās ielādēt galerijas attēlu.",
      });
    }
  },
);

// POST /api/images/projects/:projectId/gallery
// Pievieno jaunu attēlu projekta galerijai.
// Galerija pēc noklusējuma ir privāta.
router.post(
  "/projects/:projectId/gallery",
  requireAuth,
  uploadSingleImage,
  async (req: AuthenticatedRequest, res) => {
    let newImagePath: string | null = null;

    try {
      const projectId = getParam(req.params.projectId);
      const { caption } = req.body;

      if (!projectId) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          message: "Izvēlies attēlu.",
        });
        return;
      }

      if (
        caption !== undefined &&
        typeof caption !== "string"
      ) {
        res.status(400).json({
          message: "Attēla aprakstam jābūt tekstam.",
        });
        return;
      }

      if (
        typeof caption === "string" &&
        caption.length > 2000
      ) {
        res.status(400).json({
          message: "Attēla apraksts nedrīkst pārsniegt 2000 rakstzīmes.",
        });
        return;
      }

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: req.userId,
        },
        select: { id: true },
      });

      if (!project) {
        res.status(404).json({
          message: "Projekts nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      newImagePath = await saveProjectImage(
        req.file.buffer,
        projectId,
        "gallery",
      );

      const lastImage = await prisma.projectGalleryImage.aggregate({
        where: { projectId },
        _max: { sortOrder: true },
      });

      const image = await prisma.projectGalleryImage.create({
        data: {
          projectId,
          imagePath: newImagePath,
          caption: caption?.trim() || null,
          sortOrder: (lastImage._max.sortOrder ?? 0) + 1,
        },
      });

      res.status(201).json({
        message: "Attēls veiksmīgi pievienots galerijai.",
        image: {
          ...image,
          imageUrl: `/api/images/gallery/${image.id}`,
        },
      });
    } catch (error) {
      if (newImagePath) {
        await deleteStoredImage(newImagePath).catch(console.error);
      }

      console.error("Galerijas attēla pievienošanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās pievienot attēlu galerijai.",
      });
    }
  },
);

// PATCH /api/images/gallery/:imageId
// Maina galerijas attēla aprakstu vai secību.
router.patch(
  "/gallery/:imageId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const imageId = getParam(req.params.imageId);
      const { caption, sortOrder } = req.body;

      if (!imageId) {
        res.status(400).json({
          message: "Nav norādīts galerijas attēla ID.",
        });
        return;
      }

      const data: {
        caption?: string | null;
        sortOrder?: number;
      } = {};

      if (caption !== undefined) {
        if (
          caption !== null &&
          typeof caption !== "string"
        ) {
          res.status(400).json({
            message: "Attēla aprakstam jābūt tekstam.",
          });
          return;
        }

        if (
          typeof caption === "string" &&
          caption.length > 2000
        ) {
          res.status(400).json({
            message: "Attēla apraksts nedrīkst pārsniegt 2000 rakstzīmes.",
          });
          return;
        }

        data.caption = caption?.trim() || null;
      }

      if (sortOrder !== undefined) {
        if (
          !Number.isInteger(sortOrder) ||
          sortOrder < 0
        ) {
          res.status(400).json({
            message: "Norādi derīgu attēla secības numuru.",
          });
          return;
        }

        data.sortOrder = sortOrder;
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({
          message: "Nav norādītas izmaiņas.",
        });
        return;
      }

      const result = await prisma.projectGalleryImage.updateMany({
        where: {
          id: imageId,
          project: {
            userId: req.userId,
          },
        },
        data,
      });

      if (result.count === 0) {
        res.status(404).json({
          message: "Galerijas attēls nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      const image = await prisma.projectGalleryImage.findUnique({
        where: { id: imageId },
      });

      res.json({
        message: "Galerijas attēls veiksmīgi atjaunots.",
        image,
      });
    } catch (error) {
      console.error("Galerijas attēla rediģēšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās rediģēt galerijas attēlu.",
      });
    }
  },
);

// DELETE /api/images/gallery/:imageId
// Dzēš galerijas attēlu.
router.delete(
  "/gallery/:imageId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const imageId = getParam(req.params.imageId);

      if (!imageId) {
        res.status(400).json({
          message: "Nav norādīts galerijas attēla ID.",
        });
        return;
      }

      const image = await prisma.projectGalleryImage.findFirst({
        where: {
          id: imageId,
          project: {
            userId: req.userId,
          },
        },
        select: {
          id: true,
          imagePath: true,
        },
      });

      if (!image) {
        res.status(404).json({
          message: "Galerijas attēls nav atrasts vai tev nav tiesību to dzēst.",
        });
        return;
      }

      await prisma.projectGalleryImage.delete({
        where: { id: imageId },
      });

      await deleteStoredImage(image.imagePath).catch((error) => {
        console.error("Galerijas faila dzēšanas kļūda:", error);
      });

      res.json({
        message: "Galerijas attēls veiksmīgi izdzēsts.",
      });
    } catch (error) {
      console.error("Galerijas attēla dzēšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās izdzēst galerijas attēlu.",
      });
    }
  },
);

// PATCH /api/images/projects/:projectId/gallery-visibility
// Maina galerijas publisko redzamību.
// Projekta īpašnieks šo iestatījumu var mainīt neatkarīgi no projekta statusa.
router.patch(
  "/projects/:projectId/gallery-visibility",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = getParam(req.params.projectId);
      const { isGalleryPublic } = req.body;

      if (!projectId) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      if (typeof isGalleryPublic !== "boolean") {
        res.status(400).json({
          message: "Norādi galerijas redzamību.",
        });
        return;
      }

      const result = await prisma.project.updateMany({
        where: {
          id: projectId,
          userId: req.userId,
        },
        data: { isGalleryPublic },
      });

      if (result.count === 0) {
        res.status(404).json({
          message: "Projekts nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      res.json({
        message: isGalleryPublic
          ? "Galerija iestatīta kā publiska."
          : "Galerija iestatīta kā privāta.",
        isGalleryPublic,
      });
    } catch (error) {
      console.error("Galerijas redzamības maiņas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās mainīt galerijas redzamību.",
      });
    }
  },
);

export default router;
