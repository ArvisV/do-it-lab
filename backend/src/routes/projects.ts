
import { Router } from "express";
import { prisma } from "../db.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import { deleteStoredImage } from "../utils/imageStorage.js";

const router = Router();

// Palīgfunkcija maršruta parametru iegūšanai.
function getParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

// GET /api/projects — publicēto projektu saraksts
router.get("/", async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { isPublished: true },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            displayName: true,
          },
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
    res.status(500).json({
      message: "Neizdevās ielādēt projektus.",
    });
  }
});


// GET /api/projects/public-catalog
// Publiskais katalogs ar meklēšanu, kategorijām un lapošanu.
router.get("/public-catalog", async (req, res) => {
  try {
    // Vienā lapā vienmēr rādām 12 projektus.
    const pageSize = 12;

    // Nosakām pašreizējo lapu.
    const requestedPage = Number.parseInt(
      String(req.query.page ?? "1"),
      10,
    );

    const page = Number.isFinite(requestedPage)
      ? Math.max(1, requestedPage)
      : 1;

    // Izvēlētās kategorijas ID.
    const categoryId =
      typeof req.query.categoryId === "string"
        ? req.query.categoryId.trim()
        : "";

    // Meklēšanas teksts.
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    // Atlases nosacījumi.
    const where = {
      isPublished: true,

      ...(categoryId ? { categoryId } : {}),

      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    // Vienlaikus iegūstam vajadzīgās lapas projektus
    // un kopējo atbilstošo projektu skaitu.
    const [projects, totalProjects] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),

      prisma.project.count({ where }),
    ]);

    const totalPages = Math.ceil(totalProjects / pageSize);

    res.json({
      projects,
      pagination: {
        currentPage: page,
        pageSize,
        totalProjects,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Publiskā kataloga ielādes kļūda:", error);

    res.status(500).json({
      message: "Neizdevās ielādēt publiskā kataloga projektus.",
    });
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

// GET /api/projects/:id/manage — projekta īpašnieka skats
// Šeit īpašnieks redz arī privātos materiālus un galeriju.
router.get(
  "/:id/manage",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = getParam(req.params.id);

      if (!id) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      const project = await prisma.project.findFirst({
        where: {
          id,
          userId: req.userId,
        },
        include: {
          category: true,
          user: {
            select: { 
              id: true,
              displayName: true,
            },
          },
          steps: {
            orderBy: { stepNumber: "asc" },
            include: {
              materialsUsed: {
                include: {
                  material: true,
                },
              },
            },
          },
          materials: {
            orderBy: { sortOrder: "asc" },
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
          },
          galleryImages: {
            orderBy: { sortOrder: "asc" },
          },
          _count: {
            select: { steps: true },
          },
        },
      });

      if (!project) {
        res.status(404).json({
          message: "Projekts nav atrasts vai tev nav tiesību to apskatīt.",
        });
        return;
      }

      res.json({ project });
    } catch (error) {
      console.error("Projekta īpašnieka skata ielādes kļūda:", error);
      res.status(500).json({
        message: "Neizdevās ielādēt projektu.",
      });
    }
  },
);

// GET /api/projects/:id — publiska projekta lapa
// Pieejama tikai publicētiem projektiem.
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = getParam(req.params.id);

    if (!id) {
      res.status(400).json({
        message: "Nav norādīts projekta ID.",
      });
      return;
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        isPublished: true,
      },
      include: {
        category: true,
        user: {
          select: { id: true, email: true },
        },
        steps: {
          orderBy: { stepNumber: "asc" },
          include: {
            materialsUsed: {
              select: {
                id: true,
                quantityNeeded: true,
                material: {
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                  },
                },
              },
            },
          },
        },
        materials: {
          where: {
            stepMaterials: {
              some: {},
            },
          },
          select: {
            id: true,
            name: true,
            unit: true,
            stepMaterials: {
              select: {
                quantityNeeded: true,
              },
            },
          },
        },
        galleryImages: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { steps: true },
        },
      },
    });

    if (!project) {
      res.status(404).json({
        message: "Projekts nav atrasts vai nav publiski pieejams.",
      });
      return;
    }

    // Aprēķinām kopējo nepieciešamo materiālu daudzumu.
    // Publiskajā atbildē netiek iekļauts autora atlikums,
    // piezīmes vai jau izlietotais daudzums.
    const requiredMaterials = project.materials.map((material) => {
      const totalQuantity = material.stepMaterials.reduce(
        (total, stepMaterial) =>
          total + Number(stepMaterial.quantityNeeded),
        0,
      );

      return {
        id: material.id,
        name: material.name,
        unit: material.unit,
        quantity: totalQuantity,
      };
    });

    // Privātas galerijas attēlus publiskajā atbildē neiekļaujam.
    const publicGalleryImages = project.isGalleryPublic
      ? project.galleryImages
      : [];

    const {
      materials: _privateMaterials,
      galleryImages: _galleryImages,
      ...publicProject
    } = project;

    res.json({
      project: {
        ...publicProject,
        requiredMaterials,
        galleryImages: publicGalleryImages,
      },
    });
  } catch (error) {
    console.error("Publiskā projekta ielādes kļūda:", error);
    res.status(500).json({
      message: "Neizdevās ielādēt projektu.",
    });
  }
});

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

// PATCH /api/projects/:id — projekta pamatinformācijas rediģēšana
router.patch(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = getParam(req.params.id);

      if (!id) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      const { title, description, categoryId } = req.body;
      const data: {
        title?: string;
        description?: string;
        categoryId?: string | null;
      } = {};

      if (title !== undefined) {
        if (typeof title !== "string" || !title.trim()) {
          res.status(400).json({
            message: "Projekta nosaukums nedrīkst būt tukšs.",
          });
          return;
        }

        data.title = title.trim();
      }

      if (description !== undefined) {
        if (typeof description !== "string" || !description.trim()) {
          res.status(400).json({
            message: "Projekta apraksts nedrīkst būt tukšs.",
          });
          return;
        }

        data.description = description.trim();
      }

      if (categoryId !== undefined) {
        if (categoryId !== null && typeof categoryId !== "string") {
          res.status(400).json({
            message: "Kategorija nav derīga.",
          });
          return;
        }

        if (typeof categoryId === "string" && categoryId.trim()) {
          const category = await prisma.category.findUnique({
            where: { id: categoryId.trim() },
            select: { id: true },
          });

          if (!category) {
            res.status(400).json({
              message: "Norādītā kategorija nav atrasta.",
            });
            return;
          }

          data.categoryId = category.id;
        } else {
          data.categoryId = null;
        }
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({
          message: "Nav norādītas izmaiņas.",
        });
        return;
      }

      const existingProject = await prisma.project.findFirst({
        where: {
          id,
          userId: req.userId,
        },
        select: { id: true },
      });

      if (!existingProject) {
        res.status(404).json({
          message: "Projekts nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      const project = await prisma.project.update({
        where: { id },
        data,
        include: {
          category: true,
        },
      });

      res.json({
        message: "Projekta informācija veiksmīgi atjaunota.",
        project,
      });
    } catch (error) {
      console.error("Projekta informācijas maiņas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās atjaunot projekta informāciju.",
      });
    }
  },
);

// PATCH /api/projects/:id/completion
// Atzīmē projektu kā pabeigtu vai atgriež to procesā.
router.patch(
  "/:id/completion",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = getParam(req.params.id);

      if (!id) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      const { completed } = req.body;

      if (typeof completed !== "boolean") {
        res.status(400).json({
          message: "Norādi projekta pabeigšanas statusu.",
        });
        return;
      }

      const existingProject = await prisma.project.findFirst({
        where: {
          id,
          userId: req.userId,
        },
        select: {
          id: true,
          completedAt: true,
        },
      });

      if (!existingProject) {
        res.status(404).json({
          message: "Projekts nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          completedAt: completed
            ? existingProject.completedAt ?? new Date()
            : null,
        },
        select: {
          id: true,
          completedAt: true,
        },
      });

      res.json({
        message: completed
          ? "Projekts atzīmēts kā pabeigts."
          : "Projekts atgriezts statusā Procesā.",
        project,
      });
    } catch (error) {
      console.error("Projekta pabeigšanas statusa maiņas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās mainīt projekta statusu.",
      });
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
      const id = getParam(req.params.id);

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

// POST /api/projects/:id/steps — jauna projekta soļa pievienošana
router.post(
  "/:id/steps",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = getParam(req.params.id);
      const { title, description } = req.body;

      if (!projectId) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      if (
        typeof title !== "string" ||
        !title.trim() ||
        typeof description !== "string" ||
        !description.trim()
      ) {
        res.status(400).json({
          message: "Norādi soļa nosaukumu un aprakstu.",
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

      const lastStep = await prisma.projectStep.aggregate({
        where: { projectId },
        _max: { stepNumber: true },
      });

      const step = await prisma.projectStep.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          projectId,
          stepNumber: (lastStep._max.stepNumber ?? 0) + 1,
        },
      });

      res.status(201).json({
        message: "Projekta solis veiksmīgi pievienots.",
        step,
      });
    } catch (error) {
      console.error("Projekta soļa izveides kļūda:", error);
      res.status(500).json({
        message: "Neizdevās pievienot projekta soli.",
      });
    }
  },
);

// PATCH /api/projects/:id/steps/reorder — projekta soļu secības maiņa
// stepIds jābūt visu projekta soļu ID jaunajā secībā.
router.patch(
  "/:id/steps/reorder",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = getParam(req.params.id);
      const { stepIds } = req.body;

      if (!projectId) {
        res.status(400).json({
          message: "Nav norādīts projekta ID.",
        });
        return;
      }

      if (
        !Array.isArray(stepIds) ||
        !stepIds.every(
          (stepId: unknown) =>
            typeof stepId === "string" && stepId.trim().length > 0,
        )
      ) {
        res.status(400).json({
          message: "Norādi derīgu projekta soļu ID sarakstu.",
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

      const existingSteps = await prisma.projectStep.findMany({
        where: { projectId },
        select: {
          id: true,
          stepNumber: true,
        },
      });

      const uniqueStepIds = new Set(stepIds);

      const allStepsMatch =
        stepIds.length === existingSteps.length &&
        uniqueStepIds.size === stepIds.length &&
        existingSteps.every((step) => uniqueStepIds.has(step.id));

      if (!allStepsMatch) {
        res.status(400).json({
          message: "Soļu sarakstam jāsatur visi šī projekta soļi bez atkārtojumiem.",
        });
        return;
      }

      // Vispirms pārvietojam soļus uz pagaidu numuriem,
      // lai nerastos konflikts ar unikālo projekta soļu numerāciju.
      if (stepIds.length > 0) {
        const highestNumber = existingSteps.reduce(
          (highest, step) => Math.max(highest, step.stepNumber),
          0,
        );
        const temporaryBase = highestNumber + stepIds.length + 1;

        await prisma.$transaction(async (tx) => {
          for (let index = 0; index < stepIds.length; index++) {
            await tx.projectStep.update({
              where: { id: stepIds[index] },
              data: { stepNumber: temporaryBase + index },
            });
          }

          for (let index = 0; index < stepIds.length; index++) {
            await tx.projectStep.update({
              where: { id: stepIds[index] },
              data: { stepNumber: index + 1 },
            });
          }
        });
      }

      res.json({
        message: "Projektu soļu secība veiksmīgi atjaunota.",
      });
    } catch (error) {
      console.error("Projektu soļu secības maiņas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās mainīt projektu soļu secību.",
      });
    }
  },
);

// PATCH /api/projects/:id/steps/:stepId — projekta soļa rediģēšana
router.patch(
  "/:id/steps/:stepId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = getParam(req.params.id);
      const stepId = getParam(req.params.stepId);
      const { title, description } = req.body;

      if (!projectId || !stepId) {
        res.status(400).json({
          message: "Nav norādīts projekta vai soļa ID.",
        });
        return;
      }

      const data: {
        title?: string;
        description?: string;
      } = {};

      if (title !== undefined) {
        if (typeof title !== "string" || !title.trim()) {
          res.status(400).json({
            message: "Soļa nosaukums nedrīkst būt tukšs.",
          });
          return;
        }

        data.title = title.trim();
      }

      if (description !== undefined) {
        if (typeof description !== "string" || !description.trim()) {
          res.status(400).json({
            message: "Soļa apraksts nedrīkst būt tukšs.",
          });
          return;
        }

        data.description = description.trim();
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({
          message: "Nav norādītas izmaiņas.",
        });
        return;
      }

      const result = await prisma.projectStep.updateMany({
        where: {
          id: stepId,
          projectId,
          project: {
            userId: req.userId,
          },
        },
        data,
      });

      if (result.count === 0) {
        res.status(404).json({
          message: "Projekta solis nav atrasts vai tev nav tiesību to mainīt.",
        });
        return;
      }

      const step = await prisma.projectStep.findUnique({
        where: { id: stepId },
      });

      res.json({
        message: "Projekta solis veiksmīgi atjaunots.",
        step,
      });
    } catch (error) {
      console.error("Projekta soļa rediģēšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās rediģēt projekta soli.",
      });
    }
  },
);


// DELETE /api/projects/:id/steps/:stepId — projekta soļa dzēšana
router.delete(
  "/:id/steps/:stepId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = getParam(req.params.id);
      const stepId = getParam(req.params.stepId);

      if (!projectId || !stepId) {
        res.status(400).json({
          message: "Nav norādīts projekta vai soļa ID.",
        });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        const step = await tx.projectStep.findFirst({
          where: {
            id: stepId,
            projectId,
            project: {
              userId: req.userId,
            },
          },
          select: {
            id: true,
            imagePath: true,
            materialsUsed: {
              select: {
                quantityUsed: true,
              },
            },
          },
        });

        if (!step) {
          return {
            status: "not-found" as const,
          };
        }

        const usedMaterials = step.materialsUsed.filter(
          (item) => Number(item.quantityUsed) > 0,
        );

        if (usedMaterials.length > 0) {
          return {
            status: "materials-used" as const,
          };
        }

        // Dzēšam projekta soli.
        // Ar to automātiski tiek dzēstas arī materiālu piesaistes.
        await tx.projectStep.delete({
          where: { id: stepId },
        });

        // Iegūstam atlikušos projekta soļus.
        const remainingSteps = await tx.projectStep.findMany({
          where: { projectId },
          orderBy: { stepNumber: "asc" },
          select: {
            id: true,
            stepNumber: true,
          },
        });

        // Vispirms piešķiram pagaidu numurus,
        // lai izvairītos no unikālās numerācijas konfliktiem.
        const highestNumber = remainingSteps.reduce(
          (highest, currentStep) =>
            Math.max(highest, currentStep.stepNumber),
          0,
        );

        const temporaryBase =
          highestNumber + remainingSteps.length + 1;

        for (let index = 0; index < remainingSteps.length; index++) {
          await tx.projectStep.update({
            where: { id: remainingSteps[index].id },
            data: {
              stepNumber: temporaryBase + index,
            },
          });
        }

        // Piešķiram jauno secību no 1.
        for (let index = 0; index < remainingSteps.length; index++) {
          await tx.projectStep.update({
            where: { id: remainingSteps[index].id },
            data: {
              stepNumber: index + 1,
            },
          });
        }

        return {
          status: "deleted" as const,
          imagePath: step.imagePath,
        };
      });

      if (result.status === "not-found") {
        res.status(404).json({
          message:
            "Projekta solis nav atrasts vai tev nav tiesību to dzēst.",
        });
        return;
      }

      if (result.status === "materials-used") {
        res.status(409).json({
          message:
            "Šajā solī ir izlietoti materiāli. Pirms dzēšanas atgriez izlietoto daudzumu uz 0.",
        });
        return;
      }

      // Pēc veiksmīgas datubāzes dzēšanas izdzēšam arī attēla failu.
      if (result.imagePath) {
        await deleteStoredImage(result.imagePath).catch((error) => {
          console.error("Dzēstā soļa attēla faila dzēšanas kļūda:", error);
        });
      }

      res.json({
        message: "Projekta solis veiksmīgi izdzēsts.",
      });
    } catch (error) {
      console.error("Projekta soļa dzēšanas kļūda:", error);
      res.status(500).json({
        message: "Neizdevās izdzēst projekta soli.",
      });
    }
  },
);


export default router;
