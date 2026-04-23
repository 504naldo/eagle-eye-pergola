import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  projects, InsertProject, Project,
  projectParams, InsertProjectParams, ProjectParams,
  checklistItems, InsertChecklistItem, ChecklistItem,
  scopeItems, InsertScopeItem, ScopeItem,
  renderings, InsertRendering, Rendering,
  projectFiles, InsertProjectFile, ProjectFile,
  rateOverrides,
  referencePhotos, InsertReferencePhoto, ReferencePhoto,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (e) { console.warn("[Database] Failed to connect:", e); _db = null; }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getProjectsByUser(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
}

export async function getProjectById(id: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}

export async function createProject(data: InsertProject): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateProject(id: number, data: Partial<InsertProject>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(checklistItems).where(eq(checklistItems.projectId, id));
  await db.delete(scopeItems).where(eq(scopeItems.projectId, id));
  await db.delete(projectParams).where(eq(projectParams.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
}

// ─── Project Params ───────────────────────────────────────────────────────────

export async function getProjectParams(projectId: number): Promise<ProjectParams | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectParams).where(eq(projectParams.projectId, projectId)).limit(1);
  return result[0];
}

export async function upsertProjectParams(data: InsertProjectParams): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getProjectParams(data.projectId);
  if (existing) {
    await db.update(projectParams).set(data).where(eq(projectParams.projectId, data.projectId));
  } else {
    await db.insert(projectParams).values(data);
  }
}

// ─── Checklist Items ──────────────────────────────────────────────────────────

export const DEFAULT_CHECKLIST: Omit<InsertChecklistItem, 'projectId'>[] = [
  // Dimensions
  { category: "Dimensions", label: "Overall patio width verified on site", sortOrder: 1 },
  { category: "Dimensions", label: "Overall patio depth verified on site", sortOrder: 2 },
  { category: "Dimensions", label: "Slab edge location confirmed", sortOrder: 3 },
  { category: "Dimensions", label: "Storefront offset from slab edge confirmed", sortOrder: 4 },
  { category: "Dimensions", label: "Entry / egress clearances measured", sortOrder: 5 },
  { category: "Dimensions", label: "Door swing clearances confirmed (min. 36\")", sortOrder: 6 },
  // Heights & Clearances
  { category: "Heights & Clearances", label: "Underside height of existing canopy at front measured", sortOrder: 10 },
  { category: "Heights & Clearances", label: "Underside height of existing canopy at mid-point measured", sortOrder: 11 },
  { category: "Heights & Clearances", label: "Underside height of existing canopy at rear measured", sortOrder: 12 },
  { category: "Heights & Clearances", label: "Finished floor to canopy underside confirmed at all four corners", sortOrder: 13 },
  { category: "Heights & Clearances", label: "Slab slope / elevation changes noted across patio", sortOrder: 14 },
  // Obstructions
  { category: "Obstructions", label: "Overhead signage locations mapped", sortOrder: 20 },
  { category: "Obstructions", label: "Exterior lighting fixtures located and noted", sortOrder: 21 },
  { category: "Obstructions", label: "Speakers / PA system locations noted", sortOrder: 22 },
  { category: "Obstructions", label: "Sprinkler heads / fire suppression locations noted", sortOrder: 23 },
  { category: "Obstructions", label: "Security cameras / CCTV locations noted", sortOrder: 24 },
  { category: "Obstructions", label: "Patio heater locations and clearances noted", sortOrder: 25 },
  // Utilities
  { category: "Utilities & Coordination", label: "Electrical panel / service location confirmed", sortOrder: 30 },
  { category: "Utilities & Coordination", label: "Existing electrical conduit paths noted", sortOrder: 31 },
  { category: "Utilities & Coordination", label: "Drain locations and flow direction confirmed", sortOrder: 32 },
  { category: "Utilities & Coordination", label: "Gas line locations confirmed (if applicable)", sortOrder: 33 },
  { category: "Utilities & Coordination", label: "Building wall material confirmed (for anchor type selection)", sortOrder: 34 },
  { category: "Utilities & Coordination", label: "Landlord / building owner coordination initiated", sortOrder: 35 },
];

export const DEFAULT_SCOPE: Omit<InsertScopeItem, 'projectId'>[] = [
  // Inclusions
  { type: "inclusion", text: "Supply and install aluminum pergola structure (posts, beams, slats)", sortOrder: 1 },
  { type: "inclusion", text: "Wall-mounted ledger / bracket connection to building", sortOrder: 2 },
  { type: "inclusion", text: "Powder coat finish in specified color (Matte Black standard)", sortOrder: 3 },
  { type: "inclusion", text: "Lumon vertical enclosure panels (front, left, right as specified)", sortOrder: 4 },
  { type: "inclusion", text: "Glass top rail integrated connection to fascia beam", sortOrder: 5 },
  { type: "inclusion", text: "LED strip lighting (if selected)", sortOrder: 6 },
  { type: "inclusion", text: "Base plates and anchor hardware", sortOrder: 7 },
  // Exclusions
  { type: "exclusion", text: "Structural engineering and stamped drawings", sortOrder: 10 },
  { type: "exclusion", text: "Building permit application and fees", sortOrder: 11 },
  { type: "exclusion", text: "Slab / concrete repair or modification", sortOrder: 12 },
  { type: "exclusion", text: "Electrical rough-in, wiring, and connection", sortOrder: 13 },
  { type: "exclusion", text: "Waterproofing or membrane work", sortOrder: 14 },
  { type: "exclusion", text: "Existing canopy / awning modification or removal", sortOrder: 15 },
  { type: "exclusion", text: "Furniture, landscaping, or patio accessories", sortOrder: 16 },
  // Assumptions
  { type: "assumption", text: "Final dimensions subject to field verification prior to fabrication", sortOrder: 20 },
  { type: "assumption", text: "Building wall is structurally adequate to receive wall-mounted ledger", sortOrder: 21 },
  { type: "assumption", text: "Slab is level or within acceptable tolerance for post base plates", sortOrder: 22 },
  { type: "assumption", text: "All quantities are preliminary and for estimating purposes only", sortOrder: 23 },
  { type: "assumption", text: "Concept design only — not for construction without licensed review", sortOrder: 24 },
  // By Others
  { type: "by_others", text: "Structural engineering — by licensed structural engineer", sortOrder: 30 },
  { type: "by_others", text: "Building permit — by owner or general contractor", sortOrder: 31 },
  { type: "by_others", text: "Electrical work — by licensed electrician", sortOrder: 32 },
  { type: "by_others", text: "Waterproofing / slab review — by civil or structural engineer", sortOrder: 33 },
  { type: "by_others", text: "Lumon glass final coordination — by Lumon glass supplier", sortOrder: 34 },
  { type: "by_others", text: "Landlord / building owner approval — by tenant / owner", sortOrder: 35 },
];

export async function getChecklistItems(projectId: number): Promise<ChecklistItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checklistItems).where(eq(checklistItems.projectId, projectId)).orderBy(checklistItems.sortOrder);
}

export async function seedChecklistItems(projectId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const items = DEFAULT_CHECKLIST.map(item => ({ ...item, projectId }));
  await db.insert(checklistItems).values(items);
}

export async function updateChecklistItem(id: number, data: Partial<InsertChecklistItem>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(checklistItems).set(data).where(eq(checklistItems.id, id));
}

// ─── Scope Items ──────────────────────────────────────────────────────────────

export async function getScopeItems(projectId: number): Promise<ScopeItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scopeItems).where(eq(scopeItems.projectId, projectId)).orderBy(scopeItems.sortOrder);
}

export async function seedScopeItems(projectId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const items = DEFAULT_SCOPE.map(item => ({ ...item, projectId }));
  await db.insert(scopeItems).values(items);
}

export async function updateScopeItem(id: number, data: Partial<InsertScopeItem>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(scopeItems).set(data).where(eq(scopeItems.id, id));
}

export async function addScopeItem(data: InsertScopeItem): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scopeItems).values(data);
  return (result[0] as any).insertId as number;
}

export async function deleteScopeItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(scopeItems).where(eq(scopeItems.id, id));
}

// ─── Renderings ────────────────────────────────────────────────────────────────────────────────────

export async function getRenderingsByProject(projectId: number): Promise<Rendering[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(renderings).where(eq(renderings.projectId, projectId)).orderBy(desc(renderings.createdAt));
}

export async function createRendering(data: InsertRendering): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(renderings).values(data);
  return (result[0] as any).insertId as number;
}

export async function deleteRendering(id: number): Promise<Rendering | undefined> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(renderings).where(eq(renderings.id, id)).limit(1);
  if (existing.length > 0) {
    await db.delete(renderings).where(eq(renderings.id, id));
    return existing[0];
  }
  return undefined;
}

// ─── Rate Overrides ─────────────────────────────────────────────────────────
export async function getRateOverrides(projectId: number): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) return {};
  const row = await db.select().from(rateOverrides).where(eq(rateOverrides.projectId, projectId)).limit(1);
  return (row[0]?.rates as Record<string, number>) ?? {};
}
export async function upsertRateOverrides(projectId: number, rates: Record<string, number>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select({ id: rateOverrides.id }).from(rateOverrides).where(eq(rateOverrides.projectId, projectId)).limit(1);
  if (existing.length > 0) {
    await db.update(rateOverrides).set({ rates }).where(eq(rateOverrides.projectId, projectId));
  } else {
    await db.insert(rateOverrides).values({ projectId, rates });
  }
  return rates;
}
// ─── Project Files ────────────────────────────────────────────────────────────
export async function getFilesByProject(projectId: number): Promise<ProjectFile[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId)).orderBy(desc(projectFiles.createdAt));
}
export async function createProjectFile(data: InsertProjectFile): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectFiles).values(data);
  return (result[0] as any).insertId as number;
}
export async function deleteProjectFile(id: number): Promise<ProjectFile | undefined> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(projectFiles).where(eq(projectFiles.id, id)).limit(1);
  if (existing.length > 0) {
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
    return existing[0];
  }
  return undefined;
}

// ─── Reference Photos ─────────────────────────────────────────────────────────────────────────────────
export async function getReferencePhotosByProject(projectId: number): Promise<ReferencePhoto[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referencePhotos).where(eq(referencePhotos.projectId, projectId)).orderBy(desc(referencePhotos.createdAt));
}
export async function createReferencePhoto(data: InsertReferencePhoto): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(referencePhotos).values(data);
  return (result[0] as any).insertId as number;
}
export async function deleteReferencePhoto(id: number): Promise<ReferencePhoto | undefined> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(referencePhotos).where(eq(referencePhotos.id, id)).limit(1);
  if (existing.length > 0) {
    await db.delete(referencePhotos).where(eq(referencePhotos.id, id));
    return existing[0];
  }
  return undefined;
}

// ─── QTO Line Overrides ────────────────────────────────────────────────────────
import { qtoLineOverrides, InsertQTOLineOverride, QTOLineOverride } from "../drizzle/schema";

export async function getQTOLineOverrides(projectId: number): Promise<QTOLineOverride[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qtoLineOverrides).where(eq(qtoLineOverrides.projectId, projectId));
}

export async function upsertQTOLineOverride(data: InsertQTOLineOverride & { projectId: number; lineKey: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select({ id: qtoLineOverrides.id }).from(qtoLineOverrides)
    .where(eq(qtoLineOverrides.projectId, data.projectId) && eq(qtoLineOverrides.lineKey, data.lineKey)).limit(1);
  
  if (existing.length > 0) {
    await db.update(qtoLineOverrides).set(data).where(eq(qtoLineOverrides.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(qtoLineOverrides).values(data);
    return (result[0] as any).insertId as number;
  }
}

export async function deleteQTOLineOverride(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(qtoLineOverrides).where(eq(qtoLineOverrides.id, id));
}
