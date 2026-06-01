import type { Express } from "express";

// Auth is handled by tRPC procedures (auth.login / auth.register / auth.logout).
// This file intentionally left minimal — no OAuth routes are registered.
export function registerOAuthRoutes(_app: Express) {}
