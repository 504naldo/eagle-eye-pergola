import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Projects ────────────────────────────────────────────────────────────────

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  clientName: varchar("clientName", { length: 255 }),
  location: varchar("location", { length: 500 }),
  // Multi-scope: pergola | canopy | enclosure | fencing
  scopeType: mysqlEnum("scopeType", ["pergola", "canopy", "enclosure", "fencing"]).default("pergola").notNull(),
  // Generic JSON inputs for canopy/enclosure modules (pergola still uses project_params)
  inputsJson: json("inputsJson"),
  status: mysqlEnum("status", ["draft", "in_review", "approved", "archived"]).default("draft").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── Project Parameters ───────────────────────────────────────────────────────

export const projectParams = mysqlTable("project_params", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  // Patio dimensions (in feet, stored as decimal)
  widthFt: decimal("widthFt", { precision: 8, scale: 2 }).default("58.00"),
  depthFt: decimal("depthFt", { precision: 8, scale: 2 }).default("15.67"),
  heightFt: decimal("heightFt", { precision: 8, scale: 2 }).default("10.00"),
  // Post configuration
  postCount: int("postCount").default(5),
  postSpacingFt: decimal("postSpacingFt", { precision: 8, scale: 2 }).default("14.50"),
  // Slat system
  slatType: mysqlEnum("slatType", ["fixed", "operable"]).default("fixed").notNull(),
  slatSpacingIn: decimal("slatSpacingIn", { precision: 6, scale: 2 }).default("4.00"),
  // Lumin glass enclosure
  glassFront: boolean("glassFront").default(true),
  glassLeft: boolean("glassLeft").default(true),
  glassRight: boolean("glassRight").default(true),
  // Connection type
  connectionType: mysqlEnum("connectionType", ["wall_mounted_lean_to"]).default("wall_mounted_lean_to").notNull(),
  // Finish & extras
  finishColor: varchar("finishColor", { length: 100 }).default("Matte Black"),
  ledLighting: boolean("ledLighting").default(true),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectParams = typeof projectParams.$inferSelect;
export type InsertProjectParams = typeof projectParams.$inferInsert;

// ─── Field Verification Checklist ────────────────────────────────────────────

export const checklistItems = mysqlTable("checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  label: varchar("label", { length: 500 }).notNull(),
  checked: boolean("checked").default(false),
  fieldNote: text("fieldNote"),
  sortOrder: int("sortOrder").default(0),
});

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

// ─── Inclusions / Exclusions / Assumptions ───────────────────────────────────

export const scopeItems = mysqlTable("scope_items", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  type: mysqlEnum("type", ["inclusion", "exclusion", "assumption", "by_others"]).notNull(),
  text: text("text").notNull(),
  sortOrder: int("sortOrder").default(0),
});

export type ScopeItem = typeof scopeItems.$inferSelect;
export type InsertScopeItem = typeof scopeItems.$inferInsert;

// ─── AI Visual Renderings ────────────────────────────────────────────────────────────────────────────────────

export const renderings = mysqlTable("renderings", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  prompt: text("prompt").notNull(),
  style: varchar("style", { length: 100 }).notNull().default("photorealistic"),
  label: varchar("label", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Rendering = typeof renderings.$inferSelect;
export type InsertRendering = typeof renderings.$inferInsert;

// ─── Project Files (photo/document uploads) ───────────────────────────────────────────────────────────────────────────────

export const projectFiles = mysqlTable("project_files", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  sizeBytes: int("sizeBytes").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = typeof projectFiles.$inferInsert;
// ─── Rate Overrides (per-project unit rate customisation) ────────────────────
export const rateOverrides = mysqlTable("rate_overrides", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().unique(),
  // JSON map: { [description: string]: number } — overrides default unit rates
  rates: json("rates").notNull().$type<Record<string, number>>(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RateOverride = typeof rateOverrides.$inferSelect;
export type InsertRateOverride = typeof rateOverrides.$inferInsert;

// ─── Reference Photos (used as style references for AI rendering generation) ──
export const referencePhotos = mysqlTable("reference_photos", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReferencePhoto = typeof referencePhotos.$inferSelect;
export type InsertReferencePhoto = typeof referencePhotos.$inferInsert;
