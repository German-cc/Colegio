import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import analyzeRouter from "./routes/analyze.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";

app.disable("x-powered-by");
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "X-Gemini-API-Key"],
  })
);
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "RAEEBot",
    point: "Punto Verde - Parque Saavedra",
  });
});

app.use("/api", analyzeRouter);
app.use(express.static(publicDir, { extensions: ["html"] }));
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(port, host, () => {
  console.log(`RAEEBot listo en http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`El puerto ${port} ya está en uso. Probá con PORT=3001 npm start.`);
    process.exit(1);
  }

  if (error.code === "EACCES" || error.code === "EPERM") {
    console.error(`No hay permiso para iniciar el servidor en ${host}:${port}.`);
    process.exit(1);
  }

  throw error;
});
