
import express from "express";
import dotenv from "dotenv";
import { prisma } from "./db.js";
import authRouter from "./routes/auth.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import projectsRouter from "./routes/projects.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);



app.get("/", (_req, res) => {
  res.json({
    message: "Do It Lab API darbojas!",
  });
});

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
