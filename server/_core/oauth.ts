import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import * as microsoftOAuth from "./microsoft-oauth";
import { SignJWT } from "jose";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Login route - redirects to Microsoft
  app.get("/api/auth/login", async (req: Request, res: Response) => {
    const state = getQueryParam(req, "state") || "";
    
    try {
      const authUrl = await microsoftOAuth.getAuthorizationUrl(state);
      res.redirect(302, authUrl);
    } catch (error) {
      console.error("[OAuth] Login failed", error);
      res.status(500).json({ error: "Failed to initiate login" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await microsoftOAuth.getTokenFromCode(code);
      const userInfo = await microsoftOAuth.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.id) {
        res.status(400).json({ error: "User ID missing from Microsoft" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.id,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: "microsoft",
        lastSignedIn: new Date(),
      });

      const sessionToken = await new SignJWT({ openId: userInfo.id, name: userInfo.name })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1y")
        .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
