import { Router } from "express";
import { prisma } from "../db.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

const router = Router();

// Pārbauda Prisma serializācijas transakciju konfliktu.
function isTransactionConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

// Iegūst maršruta parametru.
function getParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

// Pārbauda daudzumu, ņemot vērā Decimal(10, 2) datubāzē.
function parseAmount(
  value: unknown,
  allowZero = false,
): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  if (typeof value === "string" && !value.trim()) {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount > 99999999.99) {
    return null;
  }

  if (allowZero ? amount < 0 : amount <= 0) {
    return null;
  }

  const rounded = Math.round(amount * 100) / 100;

  if (Math.abs(amount - rounded) > 0.0000001) {
    return null;
  }

  return rounded;
}

// GET /api/materials/projects/:projectId
// Iegūst projekta materiālus. Pieejams tikai projekta īpašniekam.
router.get(
  "/projects/:projectId",
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
        select: { id: true },
      });

      if (!project) {
        res.status(404).json({
          message: "Projekts nav atrasts vai tev nav tiesību to apskatīt.",
        });
        return;
      }

      const materials = await prisma.projectMaterial.findMany({
        where: { projectId },
        include: {
          stepMaterials: {
            include: {
              step: {
                select: {
                  id: true,
                  title: true,
                  stepNumber: true,
                },
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      res.json({ materials });
    } catch (error) {
      console.error("Materiālu ielādes kļūda:", error);
      res.status(500).json({
        message: "Neizdevās ielādēt projekta materiālus.",
      });
    }
  },
);

// POST /api/materials/projects/:projectId
// Pievieno jaunu materiālu projekta kopējam sarakstam.
router.post(
  "/projects/:projectId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = getParam(req.params.projectId);
      const { name, unit, notes, quantityAvailable } = req.body;

      if (!projectId) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({
          message: "Norādi materiāla nosaukumu.",
        });
        return;
      }

      if (
        unit !== undefined &&
        (typeof unit !== "string" || !unit.trim())
      ) {
        res.status(400).json({
          message: "Norādi derīgu mērvienību.",
        });
        return;
      }

      if (
        notes !== undefined &&
        notes !== null &&
        typeof notes !== "string"
      ) {
        res.status(400).json({
          message: "Piezīmei jābūt tekstam.",
        });
        return;
      }

      const initialQuantity =
        quantityAvailable === undefined
          ? 0
          : parseAmount(quantityAvailable, true);

      if (initialQuantity === null) {
        res.status(400).json({
          message: "Norādi derīgu sākotnējo materiāla atlikumu.",
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

      const lastMaterial = await prisma.projectMaterial.aggregate({
        where: { projectId },
        _max: { sortOrder: true },
      });

      const material = await prisma.projectMaterial.create({
        data: {
          name: name.trim(),
          unit: unit?.trim() || "gab.",
          notes: notes?.trim() || null,
          quantityAvailable: initialQuantity,
          sortOrder: (lastMaterial._max.sortOrder ?? 0) + 1,
          projectId,
        },
      });

      res.status(201).json({
        message: "Materiāls veiksmīgi pievienots.",
        material,
      });
    } catch (error) {
      console.error("Materiāla pievienošanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās pievienot materiālu.",
      });
    }
  },
);

// PATCH /api/materials/:materialId
// Rediģē materiāla nosaukumu, mērvienību un piezīmes.
router.patch(
  "/:materialId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const materialId = getParam(req.params.materialId);
      const { name, unit, notes } = req.body;

      if (!materialId) {
        res.status(400).json({
          message: "Nav norādīts materiāla ID.",
        });
        return;
      }

      const data: {
        name?: string;
        unit?: string;
        notes?: string | null;
      } = {};

      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          res.status(400).json({
            message: "Materiāla nosaukums nedrīkst būt tukšs.",
          });
          return;
        }

        data.name = name.trim();
      }

      if (unit !== undefined) {
        if (typeof unit !== "string" || !unit.trim()) {
          res.status(400).json({
            message: "Mērvienība nedrīkst būt tukša.",
          });
          return;
        }

        data.unit = unit.trim();
      }

      if (notes !== undefined) {
        if (notes !== null && typeof notes !== "string") {
          res.status(400).json({
            message: "Piezīmei jābūt tekstam.",
          });
          return;
        }

        data.notes = notes?.trim() || null;
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({
          message: "Nav norādītas izmaiņas.",
        });
        return;
      }

      const result = await prisma.projectMaterial.updateMany({
        where: {
          id: materialId,
          project: {
            userId: req.userId,
          },
        },
        data,
      });

      if (result.count === 0) {
        res.status(404).json({
          message: "Materiāls nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      const material = await prisma.projectMaterial.findUnique({
        where: { id: materialId },
      });

      res.json({
        message: "Materiāls veiksmīgi atjaunots.",
        material,
      });
    } catch (error) {
      console.error("Materiāla rediģēšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās rediģēt materiālu.",
      });
    }
  },
);

// POST /api/materials/:materialId/restock
// Papildina autora pieejamo materiālu atlikumu.
router.post(
  "/:materialId/restock",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const materialId = getParam(req.params.materialId);
      const quantity = parseAmount(req.body.quantity);

      if (!materialId) {
        res.status(400).json({
          message: "Nav norādīts materiāla ID.",
        });
        return;
      }

      if (quantity === null) {
        res.status(400).json({
          message: "Norādi derīgu papildināmo daudzumu.",
        });
        return;
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const material = await tx.projectMaterial.findFirst({
            where: {
              id: materialId,
              project: {
                userId: req.userId,
              },
            },
            select: {
              id: true,
              quantityAvailable: true,
            },
          });

          if (!material) {
            return {
              status: 404 as const,
              message:
                "Materiāls nav atrasts vai tev nav tiesību to mainīt.",
            };
          }

          // Decimal(10, 2) maksimālā vērtība ir 99 999 999,99.
          // Aprēķins centos novērš peldošā komata neprecizitātes.
          const currentCents = Math.round(
            Number(material.quantityAvailable) * 100,
          );
          const addedCents = Math.round(quantity * 100);
          const maxCents = 9_999_999_999;

          if (currentCents + addedCents > maxCents) {
            return {
              status: 400 as const,
              message:
                "Materiāla atlikums pārsniegtu maksimāli atļauto vērtību.",
            };
          }

          await tx.projectMaterial.update({
            where: {
              id: materialId,
            },
            data: {
              quantityAvailable: {
                increment: quantity,
              },
            },
          });

          const updatedMaterial = await tx.projectMaterial.findUnique({
            where: { id: materialId },
            select: {
              id: true,
              name: true,
              unit: true,
              quantityAvailable: true,
            },
          });

          return {
            status: 200 as const,
            material: updatedMaterial,
          };
        },
        {
          isolationLevel: "Serializable",
        },
      );

      if (result.status !== 200) {
        res.status(result.status).json({
          message: result.message,
        });
        return;
      }

      res.json({
        message: "Materiālu atlikums veiksmīgi papildināts.",
        material: result.material,
      });
    } catch (error) {
      if (isTransactionConflict(error)) {
        res.status(409).json({
          message:
            "Materiāla atlikums tikko tika mainīts. Lūdzu, mēģini vēlreiz.",
        });
        return;
      }

      console.error("Materiālu atlikuma papildināšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās papildināt materiālu atlikumu.",
      });
    }
  },
);

// DELETE /api/materials/:materialId
// Dzēš materiālu, ja tas nav piesaistīts projekta soļiem.
router.delete(
  "/:materialId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const materialId = getParam(req.params.materialId);

      if (!materialId) {
        res.status(400).json({
          message: "Nav norādīts materiāla ID.",
        });
        return;
      }

      const material = await prisma.projectMaterial.findFirst({
        where: {
          id: materialId,
          project: {
            userId: req.userId,
          },
        },
        include: {
          _count: {
            select: { stepMaterials: true },
          },
        },
      });

      if (!material) {
        res.status(404).json({
          message: "Materiāls nav atrasts vai tev nav tiesību to dzēst.",
        });
        return;
      }

      if (material._count.stepMaterials > 0) {
        res.status(409).json({
          message:
            "Vispirms noņem materiāla piesaisti projekta soļiem, lai to varētu dzēst.",
        });
        return;
      }

      await prisma.projectMaterial.delete({
        where: { id: materialId },
      });

      res.json({
        message: "Materiāls veiksmīgi izdzēsts.",
      });
    } catch (error) {
      console.error("Materiāla dzēšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās izdzēst materiālu.",
      });
    }
  },
);

// POST /api/materials/steps/:stepId/assignments
// Piesaista esošu projekta materiālu konkrētam solim.
router.post(
  "/steps/:stepId/assignments",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const stepId = getParam(req.params.stepId);
      const { materialId } = req.body;
      const quantityNeeded = parseAmount(req.body.quantityNeeded);

      if (!stepId) {
        res.status(400).json({
          message: "Nav norādīts projekta soļa ID.",
        });
        return;
      }

      if (typeof materialId !== "string" || !materialId.trim()) {
        res.status(400).json({
          message: "Norādi materiālu, kuru vēlies piesaistīt.",
        });
        return;
      }

      if (quantityNeeded === null) {
        res.status(400).json({
          message: "Norādi derīgu nepieciešamo materiāla daudzumu.",
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
        },
      });

      if (!step) {
        res.status(404).json({
          message: "Projekta solis nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      const material = await prisma.projectMaterial.findFirst({
        where: {
          id: materialId,
          projectId: step.projectId,
        },
        select: { id: true },
      });

      if (!material) {
        res.status(404).json({
          message: "Materiāls nav atrasts šajā projektā.",
        });
        return;
      }

      const existingAssignment = await prisma.stepMaterial.findUnique({
        where: {
          stepId_materialId: {
            stepId,
            materialId,
          },
        },
        select: { id: true },
      });

      if (existingAssignment) {
        res.status(409).json({
          message: "Šis materiāls jau ir pievienots attiecīgajam solim.",
        });
        return;
      }

      const assignment = await prisma.stepMaterial.create({
        data: {
          stepId,
          materialId,
          quantityNeeded,
        },
        include: {
          material: true,
          step: {
            select: {
              id: true,
              title: true,
              stepNumber: true,
            },
          },
        },
      });

      res.status(201).json({
        message: "Materiāls veiksmīgi piesaistīts projekta solim.",
        assignment,
      });
    } catch (error) {
      console.error("Materiāla piesaistes kļūda:", error);
      res.status(500).json({
        message: "Neizdevās piesaistīt materiālu projekta solim.",
      });
    }
  },
);

// PATCH /api/materials/assignments/:assignmentId
// Maina konkrētajam solim nepieciešamo materiāla daudzumu.
router.patch(
  "/assignments/:assignmentId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const assignmentId = getParam(req.params.assignmentId);
      const quantityNeeded = parseAmount(req.body.quantityNeeded);

      if (!assignmentId) {
        res.status(400).json({
          message: "Nav norādīts materiāla piesaistes ID.",
        });
        return;
      }

      if (quantityNeeded === null) {
        res.status(400).json({
          message: "Norādi derīgu nepieciešamo materiāla daudzumu.",
        });
        return;
      }

      const assignment = await prisma.stepMaterial.findFirst({
        where: {
          id: assignmentId,
          step: {
            project: {
              userId: req.userId,
            },
          },
        },
        select: {
          id: true,
          quantityUsed: true,
        },
      });

      if (!assignment) {
        res.status(404).json({
          message: "Materiāla piesaiste nav atrasta.",
        });
        return;
      }

      if (quantityNeeded < Number(assignment.quantityUsed)) {
        res.status(400).json({
          message:
            "Nepieciešamo daudzumu nevar samazināt zem jau izlietotā daudzuma.",
        });
        return;
      }

      const updatedAssignment = await prisma.stepMaterial.update({
        where: { id: assignmentId },
        data: { quantityNeeded },
        include: {
          material: true,
          step: {
            select: {
              id: true,
              title: true,
              stepNumber: true,
            },
          },
        },
      });

      res.json({
        message: "Materiāla daudzums veiksmīgi atjaunots.",
        assignment: updatedAssignment,
      });
    } catch (error) {
      console.error("Materiāla daudzuma maiņas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās mainīt materiāla daudzumu.",
      });
    }
  },
);

// PATCH /api/materials/assignments/:assignmentId/usage
// Atzīmē, cik daudz materiāla ir izlietots konkrētajā solī.
// Izlietotais daudzums tiek atņemts no kopējā pieejamā atlikuma.
router.patch(
  "/assignments/:assignmentId/usage",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const assignmentId = getParam(req.params.assignmentId);
      const quantityUsed = parseAmount(req.body.quantityUsed, true);

      if (!assignmentId) {
        res.status(400).json({
          message: "Nav norādīts materiāla piesaistes ID.",
        });
        return;
      }

      if (quantityUsed === null) {
        res.status(400).json({
          message: "Norādi derīgu izlietoto daudzumu.",
        });
        return;
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const assignment = await tx.stepMaterial.findFirst({
            where: {
              id: assignmentId,
              step: {
                project: {
                  userId: req.userId,
                },
              },
            },
            include: {
              material: true,
            },
          });

          if (!assignment) {
            return {
              status: 404 as const,
              message: "Materiāla piesaiste nav atrasta.",
            };
          }

          const needed = Number(assignment.quantityNeeded);
          const usedBefore = Number(assignment.quantityUsed);
          const availableBefore = Number(
            assignment.material.quantityAvailable,
          );

          if (quantityUsed > needed) {
            return {
              status: 400 as const,
              message:
                "Izlietotais daudzums nedrīkst pārsniegt solim nepieciešamo daudzumu.",
            };
          }

          // Pozitīva starpība nozīmē, ka jāizlieto papildu materiāls.
          // Negatīva starpība nozīmē, ka daļa materiāla tiek atgriezta atlikumā.
          const difference = quantityUsed - usedBefore;
          const availableAfter = availableBefore - difference;

          if (availableAfter < -0.0000001) {
            return {
              status: 400 as const,
              message:
                "Nepietiek materiāla atlikuma. Vispirms papildini materiālu sarakstu.",
            };
          }

          await tx.projectMaterial.update({
            where: { id: assignment.materialId },
            data: {
              quantityAvailable: Math.max(0, availableAfter),
            },
          });

          const updatedAssignment = await tx.stepMaterial.update({
            where: { id: assignmentId },
            data: { quantityUsed },
            include: {
              material: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  quantityAvailable: true,
                },
              },
              step: {
                select: {
                  id: true,
                  title: true,
                  stepNumber: true,
                },
              },
            },
          });

          return {
            status: 200 as const,
            assignment: updatedAssignment,
          };
        },
        {
          isolationLevel: "Serializable",
        },
      );

      if (result.status !== 200) {
        res.status(result.status).json({
          message: result.message,
        });
        return;
      }

      res.json({
        message: "Materiāla izlietotais daudzums veiksmīgi atjaunots.",
        assignment: result.assignment,
      });
    } catch (error) {
      if (isTransactionConflict(error)) {
        res.status(409).json({
          message:
            "Materiāla atlikums tikko tika mainīts. Lūdzu, mēģini vēlreiz.",
        });
        return;
      }

      console.error("Materiāla izlietošanas atjaunošanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās atjaunot materiāla izlietoto daudzumu.",
      });
    }
  },
);

// DELETE /api/materials/assignments/:assignmentId
// Noņem materiāla piesaisti no soļa.
// Vispirms jāatgriež izlietotais daudzums uz nulli.
router.delete(
  "/assignments/:assignmentId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const assignmentId = getParam(req.params.assignmentId);

      if (!assignmentId) {
        res.status(400).json({
          message: "Nav norādīts materiāla piesaistes ID.",
        });
        return;
      }

      const assignment = await prisma.stepMaterial.findFirst({
        where: {
          id: assignmentId,
          step: {
            project: {
              userId: req.userId,
            },
          },
        },
        select: {
          id: true,
          quantityUsed: true,
        },
      });

      if (!assignment) {
        res.status(404).json({
          message: "Materiāla piesaiste nav atrasta.",
        });
        return;
      }

      if (Number(assignment.quantityUsed) > 0) {
        res.status(409).json({
          message:
            "Vispirms atgriez izlietoto daudzumu uz nulli, lai varētu noņemt materiāla piesaisti.",
        });
        return;
      }

      await prisma.stepMaterial.delete({
        where: { id: assignmentId },
      });

      res.json({
        message: "Materiāla piesaiste veiksmīgi noņemta.",
      });
    } catch (error) {
      console.error("Materiāla piesaistes dzēšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās noņemt materiāla piesaisti.",
      });
    }
  },
);

export default router;