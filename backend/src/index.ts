import "dotenv/config";

import express from "express";
import { prisma } from "./db.js";
import authRouter from "./routes/auth.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import projectsRouter from "./routes/projects.js";
import categoriesRouter from "./routes/categories.js";
import favoritesRouter from "./routes/favorites.js";
import materialsRouter from "./routes/materials.js";
import imagesRouter from "./routes/images.js";

const app = express();
const PORT = process.env.PORT || 5000;

// CORS konfigurācija
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// Pieprasījumu apstrāde
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// API maršruti
app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/images", imagesRouter);

// Galvenā API pārbaude
app.get("/", (_req, res) => {
  res.json({
    message: "Do It Lab API darbojas!",
  });
});

// Datubāzes savienojuma pārbaude
app.get("/api/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "ok",
      message: "Savienojums ar datubāzi darbojas!",
    });
  } catch (error) {
    console.error("Datubāzes savienojuma kļūda:", error);

    res.status(500).json({
      status: "error",
      message: "Neizdevās pieslēgties datubāzei.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Do It Lab backend darbojas portā ${PORT}`);
});