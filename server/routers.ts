import { Decimal } from "decimal.js";
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
  getFilesByProject, createProjectFile, deleteProjectFile,
  getRateOverrides, upsertRateOverrides,
  getReferencePhotosByProject, createReferencePhoto, deleteReferencePhoto,
} from './db';
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
        scopeType: z.enum(["pergola", "canopy", "enclosure", "fencing"]).default("pergola"),
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
        glassWallHeightFt: z.string().optional(),
        railWidthIn: z.string().optional(),
        railingHeightIn: z.string().optional(),
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
- Lumon Enclosure: Vertical Lumon panels on ${glassZones || "all sides"}, top rail integrated with fascia beam
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
        // Scope type — determines which prompt template is used
        scopeType: z.enum(["pergola", "canopy", "enclosure", "fencing"]).optional(),
        // Pergola / canopy / enclosure params
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
        // Fencing-specific params
        meshType: z.string().optional(),
        anchorMethod: z.string().optional(),
        hasGate: z.boolean().optional(),
        gateWidthFt: z.number().optional(),
        // Reference images to guide the rendering style
        referenceImageUrls: z.array(z.string().url()).optional(),
        // Custom prompt override (optional) — if provided, replaces auto-generated prompt
        customPrompt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");

        // Determine scope — fall back to project.scopeType if not passed explicitly
        const scope = input.scopeType ?? project.scopeType ?? "pergola";
        const locationDesc = input.location ? ` at ${input.location}` : "";
        const finish = input.finishColor ?? "Matte Black";

        let prompt: string;

        if (scope === "fencing") {
          // ── Fencing prompt ──────────────────────────────────────────────────
          const runFt = parseFloat(input.widthFt ?? "50") || 50;
          const heightFt = parseFloat(input.heightFt ?? "6") || 6;
          const postSpacingFt = parseFloat(input.depthFt ?? "8") || 8;
          const mesh = input.meshType ?? "chain_link";
          const meshLabel: Record<string, string> = {
            chain_link: "galvanised chain-link mesh infill",
            welded_wire: "welded wire mesh infill",
            expanded_metal: "expanded metal mesh infill",
            solid_panel: "solid aluminum panel infill",
            palisade: "palisade steel paling infill",
          };
          const meshDesc = meshLabel[mesh] ?? mesh;
          const anchorLabel: Record<string, string> = {
            concrete_footing: "posts set in concrete footings",
            surface_mount: "surface-mounted base plate posts",
            core_drill: "core-drilled post anchors",
          };
          const anchorDesc = anchorLabel[input.anchorMethod ?? "concrete_footing"] ?? "concrete footing posts";
          const gateDesc = input.hasGate
            ? `including a ${input.gateWidthFt ?? 4} ft wide swing gate`
            : "no gate";
          const finishDesc = finish === "Powder Coat Black" ? "powder-coat black finish"
            : finish === "Hot-Dip Galvanised" ? "hot-dip galvanised finish"
            : `${finish} finish`;

          const fencingStylePrompts: Record<string, string> = {
            photorealistic: `Bright daylight, clear sky, photorealistic architectural photography. Shot from a 3/4 angle at eye level showing the fence run and gate. Clean commercial or industrial site context${locationDesc}.`,
            dusk: `Golden hour dusk lighting, warm sky. Atmospheric, moody architectural photography. Shot from a low 3/4 angle showing the fence silhouette${locationDesc}.`,
            interior: `View from inside the secured area looking outward through the fence. Showing the mesh infill and gate from the inside. Photorealistic.`,
            aerial: `Aerial bird's-eye view from above showing the full fence run layout, post spacing, and gate position. Photorealistic aerial architectural rendering.`,
          };

          prompt = `Photorealistic architectural rendering of a commercial security fence installation.

Fence system: ${runFt} ft run, ${heightFt} ft height, ${meshDesc}, steel tube frame posts at ${postSpacingFt} ft centres, ${anchorDesc}, ${gateDesc}. Finish: ${finishDesc}. Modern, high-quality commercial fencing aesthetic.

IMPORTANT: This is a FENCE — do NOT render any pergola, canopy, roof structure, or overhead beams. The image must show only the fence panels, posts, mesh infill${input.hasGate ? ", and gate" : ""} as described above.

${fencingStylePrompts[input.style]}

High resolution, 16:9 aspect ratio, professional architectural visualization quality.`;

        } else if (scope === "canopy") {
          // ── Canopy prompt ────────────────────────────────────────────────────
          const width = parseFloat(input.widthFt ?? "30") || 30;
          const depth = parseFloat(input.depthFt ?? "12") || 12;
          const height = parseFloat(input.heightFt ?? "10") || 10;
          const canopyStylePrompts: Record<string, string> = {
            photorealistic: `Bright midday sun, photorealistic architectural photography, 3/4 angle at eye level. Commercial setting${locationDesc}.`,
            dusk: `Golden hour dusk lighting. Atmospheric architectural photography${locationDesc}.`,
            interior: `Interior view looking outward from under the canopy. Photorealistic.`,
            aerial: `Aerial bird's-eye view showing the full ${width} ft x ${depth} ft canopy footprint. Photorealistic.`,
          };
          prompt = `Photorealistic architectural rendering of a premium commercial aluminum canopy structure.

Structure: ${width} ft wide x ${depth} ft deep x ${height} ft clear height. Freestanding aluminum canopy with ${finish} powder coat finish. Modern commercial aesthetic.

${canopyStylePrompts[input.style]}

High resolution, 16:9 aspect ratio, professional architectural visualization quality.`;

        } else if (scope === "enclosure") {
          // ── Enclosure prompt ─────────────────────────────────────────────────
          const width = parseFloat(input.widthFt ?? "30") || 30;
          const depth = parseFloat(input.depthFt ?? "12") || 12;
          const height = parseFloat(input.heightFt ?? "10") || 10;
          const glassZones = [
            input.glassFront ? "front" : null,
            input.glassLeft ? "left side" : null,
            input.glassRight ? "right side" : null,
          ].filter(Boolean);
          const glassDesc = glassZones.length > 0
            ? `frameless Lumon panels on the ${glassZones.join(", ")}`
            : "Lumon panels";
          const enclosureStylePrompts: Record<string, string> = {
            photorealistic: `Bright midday sun, photorealistic architectural photography, 3/4 angle at eye level. Commercial patio setting${locationDesc}.`,
            dusk: `Golden hour dusk lighting, warm interior glow visible through Lumon panels. Atmospheric${locationDesc}.`,
            interior: `Interior view looking outward through the ${glassDesc}. Warm interior lighting, tables visible. Photorealistic.`,
            aerial: `Aerial bird's-eye view showing the full ${width} ft x ${depth} ft enclosed structure. Photorealistic.`,
          };
          prompt = `Photorealistic architectural rendering of a premium commercial aluminum patio enclosure system.

Structure: ${width} ft wide x ${depth} ft deep x ${height} ft clear height. Aluminum frame with ${glassDesc}. ${finish} powder coat finish. Modern high-end commercial aesthetic.

${enclosureStylePrompts[input.style]}

High resolution, 16:9 aspect ratio, professional architectural visualization quality.`;

        } else {
          // ── Pergola prompt (default) ─────────────────────────────────────────
          const width = parseFloat(input.widthFt ?? "58") || 58;
          const depth = parseFloat(input.depthFt ?? "15.67") || 15.67;
          const height = parseFloat(input.heightFt ?? "10") || 10;
          const posts = input.postCount ?? 5;
          const slatDesc = input.slatType === "operable" ? "motorized operable aluminum louver slats" : "fixed aluminum slats";
          const glassZones = [
            input.glassFront ? "front" : null,
            input.glassLeft ? "left side" : null,
            input.glassRight ? "right side" : null,
          ].filter(Boolean);
          const glassDesc = glassZones.length > 0
            ? `Lumon frameless glass vertical enclosure panels on the ${glassZones.join(", ")}`
            : "no Lumon panels";
          const ledDesc = input.ledLighting ? "integrated LED strip lighting along the beams" : "no LED lighting";
          const pergolaStylePrompts: Record<string, string> = {
            photorealistic: `Bright midday sun, clear blue sky, photorealistic architectural photography, shot from a 3/4 angle at eye level showing the front and one side of the pergola. Commercial restaurant patio setting${locationDesc}. People dining in background, soft bokeh.`,
            dusk: `Golden hour dusk lighting, warm amber sky, long shadows. The ${ledDesc} glowing softly. Atmospheric, moody architectural photography. Commercial patio${locationDesc}. Shot from a low 3/4 angle.`,
            interior: `Interior view looking outward from under the pergola canopy. Showing the ${slatDesc} overhead, ${glassDesc} on the sides. Warm interior lighting, tables and chairs visible. Photorealistic interior architectural photography.`,
            aerial: `Aerial bird's-eye view from above and slightly in front, showing the full ${width} ft wide by ${depth} ft deep pergola footprint. Clearly showing the ${slatDesc} roof pattern, ${posts} front posts (no rear posts — wall-mounted lean-to), ${glassDesc}. Photorealistic aerial architectural rendering.`,
          };
          prompt = `Photorealistic architectural rendering of a premium commercial aluminum pergola / patio enclosure system.

Structure: ${width} ft wide x ${depth} ft deep x ${height} ft clear height. Wall-mounted lean-to configuration — ${posts} front posts only, NO rear posts (attached to building wall at rear via concealed ledger). Roof system: ${slatDesc}. ${glassDesc}. Finish: ${finish} powder coat aluminum. ${ledDesc}. Modern, high-end commercial restaurant patio aesthetic.

IMPORTANT: Do NOT include any rear posts or back beams. The rear of the structure is attached directly to the building wall.

${pergolaStylePrompts[input.style]}

High resolution, 16:9 aspect ratio, professional architectural visualization quality.`;
        }

        const styleLabels: Record<string, string> = {
          photorealistic: "Photorealistic Day View",
          dusk: "Dusk / Evening View",
          interior: "Interior View",
          aerial: "Aerial Overview",
        };

        // Fetch reference photos from DB server-side (authoritative — never rely solely on client-passed URLs)
        const dbRefPhotos = await getReferencePhotosByProject(input.projectId);
        // Merge: DB photos take priority; client-passed URLs fill any gaps up to 4 total
        const allRefUrls = [
          ...dbRefPhotos.map(p => p.imageUrl),
          ...(input.referenceImageUrls ?? []).filter(u => !dbRefPhotos.some(p => p.imageUrl === u)),
        ].slice(0, 4);
        console.log(`[renderings.generate] projectId=${input.projectId} scope=${scope} dbRefPhotos=${dbRefPhotos.length} totalRefUrls=${allRefUrls.length}`);

        // When reference photos exist, switch to image-editing mode:
        // use the reference photo as the base image and instruct the AI to add the proposed structure to the site
        let finalPrompt = prompt;
        if (allRefUrls.length > 0) {
          const w = parseFloat(input.widthFt ?? "30") || 30;
          const d = parseFloat(input.depthFt ?? "12") || 12;
          const h = parseFloat(input.heightFt ?? "10") || 10;
          const finishDesc3 = finish === "Powder Coat Black" ? "powder-coat black" : finish === "Hot-Dip Galvanised" ? "hot-dip galvanised" : finish;

          if (scope === "fencing") {
            const runFt2 = parseFloat(input.widthFt ?? "50") || 50;
            const heightFt2 = parseFloat(input.heightFt ?? "6") || 6;
            const meshLabel2: Record<string, string> = {
              chain_link: "galvanised chain-link mesh infill",
              welded_wire: "welded wire mesh infill",
              expanded_metal: "expanded metal mesh infill",
              solid_panel: "solid aluminum panel infill",
              palisade: "palisade steel paling infill",
            };
            const meshDesc2 = meshLabel2[input.meshType ?? "welded_wire"] ?? "welded wire mesh infill";
            const gateDesc2 = input.hasGate ? `with a ${input.gateWidthFt ?? 4} ft wide swing gate` : "no gate";
            finalPrompt = `This is the actual site where the fencing will be installed. Using this reference photo as the exact background and environment, render a photorealistic visualization showing the proposed fencing system installed in this space.

Proposed fencing system: ${runFt2} ft run, ${heightFt2} ft height, steel tube frame with ${meshDesc2}, ${finishDesc3} finish, ${gateDesc2}. The fence should look like it is physically installed in this exact location — matching the floor, walls, ceiling, lighting, and spatial context shown in the reference photo.

Do NOT change the background environment. Do NOT add pergolas, canopies, or overhead structures. Only add the fence panels, posts, and gate to the existing space shown in the photo.

High resolution, photorealistic architectural visualization quality.`;

          } else if (scope === "canopy") {
            finalPrompt = `This is the actual site where the canopy will be installed. Using this reference photo as the exact background and environment, render a photorealistic visualization showing the proposed canopy structure installed in this space.

Proposed canopy: ${w} ft wide x ${d} ft deep x ${h} ft clear height, aluminum frame with ${finishDesc3} powder coat finish. The canopy should look like it is physically installed at this location — matching the building facade, ground surface, lighting, and spatial context shown in the reference photo.

Do NOT change the background environment. Only add the canopy structure to the existing space shown in the photo. Do NOT add fencing, pergola louver roofs, or Lumon panels unless they are already visible in the reference photo.

High resolution, photorealistic architectural visualization quality.`;

          } else if (scope === "enclosure") {
            const glassZones2 = [
              input.glassFront ? "front" : null,
              input.glassLeft ? "left side" : null,
              input.glassRight ? "right side" : null,
            ].filter(Boolean);
            const glassDesc2 = glassZones2.length > 0
              ? `Lumon panels on the ${glassZones2.join(", ")}`
              : "Lumon panels";
            finalPrompt = `This is the actual site where the patio enclosure will be installed. Using this reference photo as the exact background and environment, render a photorealistic visualization showing the proposed enclosure system installed in this space.

Proposed enclosure: ${w} ft wide x ${d} ft deep x ${h} ft clear height, aluminum frame with ${glassDesc2}, ${finishDesc3} powder coat finish. The enclosure should look like it is physically installed at this location — matching the building, floor, lighting, and spatial context shown in the reference photo.

Do NOT change the background environment. Only add the enclosure structure to the existing space. Do NOT add fencing or overhead canopy roofs.

High resolution, photorealistic architectural visualization quality.`;

          } else {
            // pergola (default)
            const slatDesc2 = input.slatType === "operable" ? "motorized operable aluminum louver slats" : "fixed aluminum slats";
            const glassZones3 = [
              input.glassFront ? "front" : null,
              input.glassLeft ? "left side" : null,
              input.glassRight ? "right side" : null,
            ].filter(Boolean);
            const glassDesc3 = glassZones3.length > 0
              ? `Lumon Lumon panels on the ${glassZones3.join(", ")}`
              : "no Lumon panels";
            const ledDesc2 = input.ledLighting ? "integrated LED strip lighting" : "no LED lighting";
            finalPrompt = `This is the actual site where the pergola will be installed. Using this reference photo as the exact background and environment, render a photorealistic visualization showing the proposed pergola structure installed in this space.

Proposed pergola: ${w} ft wide x ${d} ft deep x ${h} ft clear height, wall-mounted lean-to aluminum pergola with ${slatDesc2} roof, ${glassDesc3}, ${finishDesc3} powder coat finish, ${ledDesc2}. The pergola should look like it is physically installed at this location — matching the building facade, ground surface, lighting, and spatial context shown in the reference photo.

Do NOT change the background environment. Only add the pergola structure to the existing space shown in the photo.

High resolution, photorealistic architectural visualization quality.`;
          }
        }

        // Use custom prompt if provided, otherwise use auto-generated prompt
        const promptToUse = input.customPrompt ?? finalPrompt;

        const originalImages = allRefUrls.map(url => ({
          url,
          mimeType: "image/jpeg" as const,
        }));
        const { url: imageUrl } = await generateImage(
          originalImages.length > 0
            ? { prompt: promptToUse, originalImages }
            : { prompt: promptToUse }
        );
        if (!imageUrl) throw new Error("Image generation returned no URL");

        // The imageGeneration helper already uploads to S3 and returns the URL
        // Use the URL path as the file key for reference
        const fileKey = `renderings/${input.projectId}/${input.style}-${Date.now()}.png`;

        const id = await createRendering({
          projectId: input.projectId,
          imageUrl,
          fileKey,
          prompt: promptToUse,  // Store the actual prompt used (custom or auto-generated)
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

  // ─── Project Files ─────────────────────────────────────────────────────
  files: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        return getFilesByProject(input.projectId);
      }),

    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileUrl: z.string().url(),
        fileKey: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        const id = await createProjectFile({
          projectId: input.projectId,
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.fileSize ?? 0,
        });
        return { id, fileUrl: input.fileUrl, fileName: input.fileName, mimeType: input.mimeType };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership before deleting
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error('Forbidden');
        const deleted = await deleteProjectFile(input.id);
        return { success: !!deleted };
      }),
  }),
  // ─── Reference Photos ────────────────────────────────────────────────────────
  referencePhotos: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        return getReferencePhotosByProject(input.projectId);
      }),

    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        imageUrl: z.string().url(),
        fileKey: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Not found");
        // Enforce max 4 reference photos per project
        const existing = await getReferencePhotosByProject(input.projectId);
        if (existing.length >= 4) throw new Error("Maximum 4 reference photos allowed per project");
        const id = await createReferencePhoto({
          projectId: input.projectId,
          imageUrl: input.imageUrl,
          fileKey: input.fileKey,
          fileName: input.fileName,
        });
        return { id, imageUrl: input.imageUrl, fileName: input.fileName };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error("Forbidden");
        const deleted = await deleteReferencePhoto(input.id);
        return { success: !!deleted };
      }),
  }),

  // ─── Rate Overrides ──────────────────────────────────────────────────────────
  rates: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error('Not found');
        return getRateOverrides(input.projectId);
      }),
    save: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        rates: z.record(z.string(), z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error('Forbidden');
        return upsertRateOverrides(input.projectId, input.rates);
      }),
  }),

  // ─── QTO Line Overrides ────────────────────────────────────────────────────────
  qto: router({
    getLineOverrides: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error('Not found');
        const { getQTOLineOverrides } = await import('./db');
        return getQTOLineOverrides(input.projectId);
      }),

    updateLineItem: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        lineKey: z.string(),
        customQuantity: z.number().optional(),
        customUnit: z.string().optional(),
        customDescription: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error('Forbidden');
        const { upsertQTOLineOverride } = await import('./db');
        const id = await upsertQTOLineOverride({
          projectId: input.projectId,
          lineKey: input.lineKey,
          customQuantity: input.customQuantity ? input.customQuantity.toString() : undefined,
          customUnit: input.customUnit,
          customDescription: input.customDescription,
        });
        return { id, success: true };
      }),

    deleteLineItem: protectedProcedure
      .input(z.object({ projectId: z.number(), lineKey: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error('Forbidden');
        const { getQTOLineOverrides, deleteQTOLineOverride } = await import('./db');
        const overrides = await getQTOLineOverrides(input.projectId);
        const override = overrides.find(o => o.lineKey === input.lineKey);
        if (override) await deleteQTOLineOverride(override.id);
        return { success: true };
      }),
  }),

  // ─── Phased Enclosure ────────────────────────────────────────────────────────
  phasedEnclosure: router({
    getParams: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error('Forbidden');
        const { getPhasedEnclosureParams } = await import('./db');
        return getPhasedEnclosureParams(input.projectId);
      }),

    upsertParams: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        approvedDrawingUrl: z.string().optional(),
        approvedDrawingFileKey: z.string().optional(),
        approvedDrawingName: z.string().optional(),
        approvedDrawingLocked: z.boolean().optional(),
        scopeMode: z.enum(['phase1Only', 'phase2Only', 'fullBuildout', 'compare']).optional(),
        phase1Json: z.any().optional(),
        phase2Json: z.any().optional(),
        dimensionsJson: z.any().optional(),
        pricingJson: z.any().optional(),
        fieldNotesJson: z.any().optional(),
        customDimensions: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new Error('Forbidden');
        const { upsertPhasedEnclosureParams } = await import('./db');
        const id = await upsertPhasedEnclosureParams({
          projectId: input.projectId,
          approvedDrawingUrl: input.approvedDrawingUrl ?? null,
          approvedDrawingFileKey: input.approvedDrawingFileKey ?? null,
          approvedDrawingName: input.approvedDrawingName ?? null,
          approvedDrawingLocked: input.approvedDrawingLocked ?? true,
          scopeMode: input.scopeMode ?? 'fullBuildout',
          phase1Json: input.phase1Json ?? null,
          phase2Json: input.phase2Json ?? null,
          dimensionsJson: input.dimensionsJson ?? null,
          pricingJson: input.pricingJson ?? null,
          fieldNotesJson: input.fieldNotesJson ?? null,
          customDimensions: input.customDimensions ?? null,
        });
        return { id };
      }),
  }),
});
export type AppRouter = typeof appRouter;
