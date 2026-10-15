/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from "path";
import express from "express";
import app from "./api/index";

const PORT = Number(process.env.PORT) || 3000;

// Serve frontend assets in production and development (Vite Middleware)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Carbon Footprint Server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start the HTTP listener if not running in a serverless environment (e.g. Vercel)
if (!process.env.VERCEL) {
  startServer();
}

export default app;
