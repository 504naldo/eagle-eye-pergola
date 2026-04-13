import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getProjectsByUser, getProjectById, createProject, updateProject, deleteProject,
  getProjectParams, upsertProjectParams,
  getChecklistItems, seedChecklistItems, updateChecklistItem,
  getScopeItems, seedScopeItems, updateScopeItem, addScopeItem, deleteScopeItem,
} from "./db";

const ProjectStatusEnum = z.enum(["draft", "in_review", "approved", "archived"]);
const SlatTypeEnum = z.enum(["fixed", "operable"]);
const ScopeTypeEnum = z.enum(["inclusion", "exclusion", "assumption", "by_others"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Projects ──────────────────────────────────────────────────────────────
  projects: router({
    list: protectedProcedure.query(({ ctx }) =>
      getProjectsByUser(ctx.user.id)
    ),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.id);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        return project;
      }),

    create: protectedProcedure
      .input(z.object({
        projectName: z.string().min(1),
        clientName: z.string().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createProject({ ...input, userId: ctx.user.id, status: "draft" });
        // Seed default params, checklist, and scope
        await upsertProjectParams({ projectId: id });
        await seedChecklistItems(id);
        await seedScopeItems(id);
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectName: z.string().min(1).optional(),
        clientName: z.string().optional(),
        location: z.string().optional(),
        status: ProjectStatusEnum.optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const project = await getProjectById(id);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        await updateProject(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.id);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        await deleteProject(input.id);
        return { success: true };
      }),

    duplicate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.id);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        const params = await getProjectParams(input.id);
        const newId = await createProject({
          userId: ctx.user.id,
          projectName: `${project.projectName} (Copy)`,
          clientName: project.clientName,
          location: project.location,
          notes: project.notes,
          status: "draft",
        });
        if (params) {
          const { id: _id, ...paramsData } = params;
          await upsertProjectParams({ ...paramsData, projectId: newId });
        }
        await seedChecklistItems(newId);
        await seedScopeItems(newId);
        return { id: newId };
      }),
  }),

  // ─── Project Params ────────────────────────────────────────────────────────
  params: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        return getProjectParams(input.projectId);
      }),

    save: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        widthFt: z.string().optional(),
        depthFt: z.string().optional(),
        heightFt: z.string().optional(),
        postCount: z.number().optional(),
        postSpacingFt: z.string().optional(),
        slatType: SlatTypeEnum.optional(),
        slatSpacingIn: z.string().optional(),
        glassFront: z.boolean().optional(),
        glassLeft: z.boolean().optional(),
        glassRight: z.boolean().optional(),
        finishColor: z.string().optional(),
        ledLighting: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        await upsertProjectParams(input);
        return { success: true };
      }),
  }),

  // ─── Checklist ─────────────────────────────────────────────────────────────
  checklist: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        return getChecklistItems(input.projectId);
      }),

    toggle: protectedProcedure
      .input(z.object({ id: z.number(), checked: z.boolean() }))
      .mutation(async ({ input }) => {
        await updateChecklistItem(input.id, { checked: input.checked });
        return { success: true };
      }),

    updateNote: protectedProcedure
      .input(z.object({ id: z.number(), fieldNote: z.string() }))
      .mutation(async ({ input }) => {
        await updateChecklistItem(input.id, { fieldNote: input.fieldNote });
        return { success: true };
      }),
  }),

  // ─── Scope Items ───────────────────────────────────────────────────────────
  scope: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        return getScopeItems(input.projectId);
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), text: z.string() }))
      .mutation(async ({ input }) => {
        await updateScopeItem(input.id, { text: input.text });
        return { success: true };
      }),

    add: protectedProcedure
      .input(z.object({ projectId: z.number(), type: ScopeTypeEnum, text: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        const id = await addScopeItem({ ...input, sortOrder: 99 });
        return { id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteScopeItem(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
