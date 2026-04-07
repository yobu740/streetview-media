import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startScheduledJobs } from "../scheduled-jobs";
import multer from "multer";
import { storagePut } from "../storage";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Global request logger - FIRST middleware
  app.use((req, res, next) => {
    if (req.url.includes('/api/auth')) {
      console.log('[REQUEST] Method:', req.method, 'URL:', req.url);
      console.log('[REQUEST] Query string:', req.url.split('?')[1] || 'none');
    }
    next();
  });
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // File upload endpoint for PO documents and other files
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
  app.post("/api/upload", upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });
      const ext = (req.file.originalname.split(".").pop() || "bin").toLowerCase();
      const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);
      res.json({ url, key });
    } catch (err) {
      console.error("[Upload] Error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // DocuSeal webhook endpoint - receives signature completion events
  app.post("/api/docuseal/webhook", async (req: any, res: any) => {
    try {
      const event = req.body;
      console.log('[DocuSeal Webhook] Event received:', event?.event_type, 'submission:', event?.data?.id);

      if (event?.event_type === 'submission.completed') {
        const submissionId = event?.data?.id;
        // DocuSeal provides the signed PDF URL in documents[0].url
        const signedDocUrl = event?.data?.documents?.[0]?.url ?? null;

        if (submissionId) {
          const { getDb } = await import('../db');
          const { contratos } = await import('../../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          const { storagePut } = await import('../storage');
          const database = await getDb();

          if (database) {
            let savedPdfUrl = signedDocUrl; // fallback: keep DocuSeal URL

            // Option A: Download the signed PDF from DocuSeal and re-upload to our S3
            // This replaces the original contract document with the fully signed version
            if (signedDocUrl) {
              try {
                const pdfRes = await fetch(signedDocUrl);
                if (pdfRes.ok) {
                  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
                  const fileKey = `contratos/signed/${submissionId}-${Date.now()}.pdf`;
                  const { url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
                  savedPdfUrl = url;
                  console.log('[DocuSeal Webhook] Signed PDF uploaded to S3:', savedPdfUrl);
                }
              } catch (uploadErr) {
                console.error('[DocuSeal Webhook] Failed to upload signed PDF to S3, keeping DocuSeal URL:', uploadErr);
                // savedPdfUrl remains as signedDocUrl (fallback)
              }
            }

            await database.update(contratos).set({
              estado: 'Firmado',
              firmaUrl: savedPdfUrl,   // link to signed PDF (shown as "Ver PDF Firmado")
              pdfUrl: savedPdfUrl,     // replace the contract document with the signed version
            }).where(eq(contratos.docusealSubmissionId, submissionId));
            console.log('[DocuSeal Webhook] Contrato marked as Firmado for submission:', submissionId);
          }
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[DocuSeal Webhook] Error:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start background scheduled jobs
    startScheduledJobs();
  });
}

startServer().catch(console.error);
