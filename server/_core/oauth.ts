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
    console.log("[OAuth Login] Received request to /api/auth/login");
    const state = getQueryParam(req, "state") || "";
    // Always use https for redirect URI (Manus proxy handles SSL)
    const origin = `https://${req.get('host')}`;
    console.log("[OAuth Login] Origin:", origin);
    
    try {
      const authUrl = await microsoftOAuth.getAuthorizationUrl(state, origin);
      res.redirect(302, authUrl);
    } catch (error) {
      console.error("[OAuth] Login failed", error);
      res.status(500).json({ error: "Failed to initiate login" });
    }
  });

  // Callback route - matches Azure AD redirect URI
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    console.log("[OAuth Callback] Received request to /api/auth/callback");
    console.log("[OAuth Callback] Full URL:", req.url);
    console.log("[OAuth Callback] Query params from req.query:", req.query);
    
    // Parse query params from URL directly as fallback
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
    const code = urlParams.get('code') || getQueryParam(req, "code");
    const state = urlParams.get('state') || getQueryParam(req, "state");
    
    console.log("[OAuth Callback] Parsed code:", code ? 'present' : 'missing');
    console.log("[OAuth Callback] Parsed state:", state ? 'present' : 'missing');

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      // Always use https for redirect URI (Manus proxy handles SSL)
      const origin = `https://${req.get('host')}`;
      console.log("[OAuth Callback] Origin:", origin);
      const tokenResponse = await microsoftOAuth.getTokenFromCode(code, origin);
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

      // Create session token with same format as Manus OAuth
      const sessionToken = await new SignJWT({ 
        openId: userInfo.id, 
        appId: process.env.VITE_APP_ID || '',
        name: userInfo.name 
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setExpirationTime("1y")
        .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Parse state to get returnPath
      let returnPath = "/";
      try {
        const stateData = JSON.parse(atob(state));
        returnPath = stateData.returnPath || "/";
      } catch (e) {
        console.error("[OAuth Callback] Failed to parse state:", e);
      }
      
      console.log("[OAuth Callback] Redirecting to:", returnPath);
      res.redirect(302, returnPath);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
