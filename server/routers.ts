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
  getRenderingsByProject, createRendering, deleteRendering,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";

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
        scopeType: z.enum(["pergola", "canopy", "enclosure"]).default("pergola"),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createProject({ ...input, userId: ctx.user.id, status: "draft" });
        // Pergola: seed default params, checklist, and scope
        if (input.scopeType === "pergola") {
          await upsertProjectParams({ projectId: id });
          await seedChecklistItems(id);
          await seedScopeItems(id);
        }
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
        const newId = await createProject({
          userId: ctx.user.id,
          projectName: `${project.projectName} (Copy)`,
          clientName: project.clientName,
          location: project.location,
          notes: project.notes,
          scopeType: project.scopeType,
          inputsJson: project.inputsJson,
          status: "draft",
        });
        if (project.scopeType === "pergola") {
          const params = await getProjectParams(input.id);
          if (params) {
            const { id: _id, ...paramsData } = params;
            await upsertProjectParams({ ...paramsData, projectId: newId });
          }
          await seedChecklistItems(newId);
          await seedScopeItems(newId);
        }
        return { id: newId };
      }),
  }),

  // ─── Generic Inputs (Canopy / Enclosure) ─────────────────────────────────
  inputs: router({
    save: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        inputsJson: z.record(z.string(), z.unknown()),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        await updateProject(input.projectId, { inputsJson: input.inputsJson });
        return { success: true };
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

  // ─── Notes / Cover Letter ──────────────────────────────────────────────────
  notes: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        return { notes: project.notes ?? "" };
      }),

    save: protectedProcedure
      .input(z.object({ projectId: z.number(), notes: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        await updateProject(input.projectId, { notes: input.notes });
        return { success: true };
      }),

    generateAI: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        projectName: z.string(),
        clientName: z.string().optional(),
        location: z.string().optional(),
        widthFt: z.string().optional(),
        depthFt: z.string().optional(),
        heightFt: z.string().optional(),
        postCount: z.number().optional(),
        slatType: z.string().optional(),
        glassFront: z.boolean().optional(),
        glassLeft: z.boolean().optional(),
        glassRight: z.boolean().optional(),
        finishColor: z.string().optional(),
        ledLighting: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");

        const glassZones = [
          input.glassFront ? "front" : null,
          input.glassLeft ? "left side" : null,
          input.glassRight ? "right side" : null,
        ].filter(Boolean).join(", ");

        const prompt = `You are a professional architectural estimating consultant writing a project summary for a pre-fabrication concept package.

Write a concise, professional project summary (3–4 paragraphs) for the following pergola/patio enclosure project. The tone should be formal, client-ready, and suitable for a concept package cover letter. Do not use bullet points. Write in complete paragraphs.

Project Details:
- Project Name: ${input.projectName}
- Client: ${input.clientName || "Not specified"}
- Location: ${input.location || "Not specified"}
- Patio Dimensions: ${input.widthFt || "58"} ft wide × ${input.depthFt || "15.67"} ft deep
- Clear Height: ${input.heightFt || "10"} ft
- Post Configuration: ${input.postCount || 5} front posts only (wall-mounted lean-to — no rear posts)
- Roof System: Aluminum ${input.slatType === "operable" ? "operable louver" : "fixed slat"} canopy, connected to building wall via concealed ledger
- Lumin Glass Enclosure: Vertical glass panels on ${glassZones || "all sides"}, top rail integrated with fascia beam
- Finish: ${input.finishColor || "Matte Black"} powder coat
- LED Lighting: ${input.ledLighting ? "Included" : "Not included"}
- Prepared by: Ranaldo Daniels, Eagle Eye Management Services

The summary should cover: (1) project overview and intent, (2) structural system description, (3) enclosure and glazing system, (4) next steps and disclaimers.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional architectural estimating consultant. Write formal, client-ready project summaries for pre-fabrication concept packages." },
            { role: "user", content: prompt },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content ?? "";
        const summary = typeof rawContent === "string" ? rawContent : "";
        // Auto-save to project notes
        await updateProject(input.projectId, { notes: summary });
        return { summary };
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

  // ─── AI Visual Renderings ────────────────────────────────────────────────────────────────────────────────────
  renderings: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        return getRenderingsByProject(input.projectId);
      }),

    generate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        style: z.enum(["photorealistic", "dusk", "interior", "aerial"]),
        // Project params for prompt building
        widthFt: z.string().optional(),
        depthFt: z.string().optional(),
        heightFt: z.string().optional(),
        postCount: z.number().optional(),
        slatType: z.string().optional(),
        glassFront: z.boolean().optional(),
        glassLeft: z.boolean().optional(),
        glassRight: z.boolean().optional(),
        finishColor: z.string().optional(),
        ledLighting: z.boolean().optional(),
        clientName: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");

        const width = parseFloat(input.widthFt ?? "58") || 58;
        const depth = parseFloat(input.depthFt ?? "15.67") || 15.67;
        const height = parseFloat(input.heightFt ?? "10") || 10;
        const posts = input.postCount ?? 5;
        const finish = input.finishColor ?? "Matte Black";
        const slatDesc = input.slatType === "operable" ? "motorized operable aluminum louver slats" : "fixed aluminum slats";
        const glassZones = [
          input.glassFront ? "front" : null,
          input.glassLeft ? "left side" : null,
          input.glassRight ? "right side" : null,
        ].filter(Boolean);
        const glassDesc = glassZones.length > 0
          ? `Lumin frameless glass vertical enclosure panels on the ${glassZones.join(", ")}`
          : "no glass enclosure panels";
        const ledDesc = input.ledLighting ? "integrated LED strip lighting along the beams" : "no LED lighting";
        const locationDesc = input.location ? ` located at ${input.location}` : "";

        // Style-specific photography direction
        const stylePrompts: Record<string, string> = {
          photorealistic: `Bright midday sun, clear blue sky, photorealistic architectural photography, shot from a 3/4 angle at eye level showing the front and one side of the pergola. Commercial restaurant patio setting${locationDesc}. People dining in background, soft bokeh.`,
          dusk: `Golden hour dusk lighting, warm amber sky, long shadows. The ${ledDesc} glowing softly. Atmospheric, moody architectural photography. Commercial patio${locationDesc}. Shot from a low 3/4 angle.`,
          interior: `Interior view looking outward from under the pergola canopy. Showing the ${slatDesc} overhead, ${glassDesc} on the sides. Warm interior lighting, tables and chairs visible. Photorealistic interior architectural photography.`,
          aerial: `Aerial bird's-eye view from above and slightly in front, showing the full ${width} ft wide by ${depth} ft deep pergola footprint. Clearly showing the ${slatDesc} roof pattern, ${posts} front posts (no rear posts — wall-mounted lean-to), ${glassDesc}. Photorealistic aerial architectural rendering.`,
        };

        const prompt = `Photorealistic architectural rendering of a premium commercial aluminum pergola / patio enclosure system.

Structure: ${width} ft wide x ${depth} ft deep x ${height} ft clear height. Wall-mounted lean-to configuration — ${posts} front posts only, NO rear posts (attached to building wall at rear via concealed ledger). Roof system: ${slatDesc}. ${glassDesc}. Finish: ${finish} powder coat aluminum. ${ledDesc}. Modern, high-end commercial restaurant patio aesthetic.

IMPORTANT: Do NOT include any rear posts or back beams. The rear of the structure is attached directly to the building wall.

${stylePrompts[input.style]}

High resolution, 16:9 aspect ratio, professional architectural visualization quality.`;

        const styleLabels: Record<string, string> = {
          photorealistic: "Photorealistic Day View",
          dusk: "Dusk / Evening View",
          interior: "Interior View",
          aerial: "Aerial Overview",
        };

        const { url: imageUrl } = await generateImage({ prompt });
        if (!imageUrl) throw new Error("Image generation returned no URL");

        // The imageGeneration helper already uploads to S3 and returns the URL
        // Use the URL path as the file key for reference
        const fileKey = `renderings/${input.projectId}/${input.style}-${Date.now()}.png`;

        const id = await createRendering({
          projectId: input.projectId,
          imageUrl,
          fileKey,
          prompt,
          style: input.style,
          label: styleLabels[input.style],
        });

        return { id, imageUrl, style: input.style, label: styleLabels[input.style] };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await deleteRendering(input.id);
        return { success: !!deleted };
      }),
  }),
});

export type AppRouter = typeof appRouter;
