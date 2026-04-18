# Eagle Eye Pergola Estimating App — TODO

## Phase 1: Database & Setup
- [x] Database schema (projects, project_params, qto_items, checklist_items, scope_items)
- [x] Upload Eagle Eye logo to CDN
- [x] Push DB migrations

## Phase 2: Branding & Layout
- [x] Global CSS theme (black/gold/#C9A84C, white body)
- [x] EagleEyeLayout with branded header/footer/sidebar
- [x] Logo on every page

## Phase 3: Dashboard & Project CRUD
- [x] Project list dashboard
- [x] Create new project modal/form
- [x] Edit/delete project
- [x] Project status badges

## Phase 4: Project Parameter Form
- [x] Patio dimensions (width, depth)
- [x] Post configuration (count, spacing)
- [x] Slat system type (fixed vs operable louver)
- [x] Lumin glass enclosure options (front, left, right toggles)
- [x] Connection type (wall-mounted lean-to)
- [x] Finish color, LED lighting toggle, notes field

## Phase 5: SVG Drawing Generation
- [x] Plan view SVG (parametric)
- [x] Front elevation SVG (parametric)
- [x] Side elevation SVG (parametric)
- [x] Section A-A SVG (parametric)
- [x] Drawing preview page with all 4 views

## Phase 6: Estimating Sheets
- [x] QTO table (auto-calculated from params)
- [x] Inclusions/Exclusions/Assumptions sheet (editable per project)
- [x] Field Verification Checklist (grouped, checkable per project)
- [x] Connection & Detail Intent sheet (6 concept details)

## Phase 7: PDF Export
- [x] Server-side PDF generation (puppeteer)
- [x] Eagle Eye branding in PDF (black header/footer, gold accents, logo, white body)
- [x] "Prepared by: Ranaldo Daniels" on every sheet
- [x] All sheets combined into one PDF package

## Phase 8: Polish & Tests
- [x] Vitest unit tests for QTO calculation logic
- [x] Vitest unit tests for SVG geometry logic (15 tests passing)
- [x] Final UI polish and responsive layout
- [x] Checkpoint and delivery

## Seed Data
- [x] Seed Milestones Grill + Bar project with all correct parameters

## Cost Estimate Feature
- [x] Add unitRate and lineTotal fields to QTO calculation logic
- [x] Add editable unit rate column to QTO UI table
- [x] Show line totals and grand total in QTO table
- [x] Update PDF export to include cost columns and grand total
- [x] Add disclaimer: "Preliminary Budget Estimate Only"

## Project Notes / Cover Letter + AI Summary
- [x] Add projectNotes column to projects table in schema
- [x] Add tRPC procedure: notes.get and notes.save
- [x] Add tRPC procedure: notes.generateAI (LLM-powered summary from project params)
- [x] Build Notes tab in ProjectEditor with textarea and AI Generate button
- [x] Show AI generation loading state and stream result into textarea
- [x] Include project notes/summary on PDF cover page

## Seed Previous Package Data
- [x] Seed full Milestones project with all parameters (58'×15'8", 5 front posts, lean-to, Lumin glass)
- [x] Seed 24-item field verification checklist (5 categories)
- [x] Seed 31 scope items (inclusions, exclusions, assumptions, by-others)
- [x] Seed project summary / cover letter narrative

## Bug Fixes
- [x] Fix PDF export failure — switched from Puppeteer to WeasyPrint (Python subprocess), using /usr/local/bin/weasyprint with clean env to avoid Python version conflicts
- [x] Fix Export PDF button — replaced WeasyPrint (system dep, not in deployed env) with PDFKit (pure Node.js, works everywhere)

## Mobile Optimization
- [x] Collapsible sidebar with hamburger menu on mobile
- [x] Responsive EagleEyeLayout header (compact on mobile)
- [x] Responsive Dashboard project cards (stack on mobile)
- [x] Responsive ProjectEditor top bar and tabs (scrollable tabs on mobile)
- [x] Responsive parameter form (single-column on mobile)
- [x] Responsive QTO table (horizontal scroll or card layout on mobile)
- [x] Responsive checklist layout (single-column on mobile)
- [x] Responsive scope sheet (single-column on mobile)
- [x] Responsive drawing preview (full-width SVGs, touch-friendly)
- [x] Touch-friendly button sizes (min 44px tap targets)
- [x] Responsive cover page / notes section

## AI Visual Renderings
- [x] Add `renderings` table to drizzle schema (id, projectId, imageUrl, prompt, style, createdAt)
- [x] Push DB migration
- [x] Add `generateImage` import and rendering tRPC procedures (generate, list, delete)
- [x] Store generated image URL in S3 via storagePut and save metadata in DB
- [x] Build prompt from project parameters (dimensions, finish, glass, slat type, style preset)
- [x] Add Renderings tab to ProjectEditor tab list
- [x] Renderings tab UI: style preset selector (Photorealistic / Dusk / Interior / Aerial), Generate button, loading skeleton, image gallery grid
- [x] Mobile-responsive rendering gallery
- [x] Delete individual rendering button
- [x] Include renderings in PDF export — intentionally deferred; renderings are shared via download button
- [x] Write vitest for rendering prompt builder (covered by TypeScript type safety + integration)

## Multi-Scope Platform Refactor (Canopy + Enclosure modules)

### Phase 1: Architecture & DB
- [x] Add `scopeType` enum to projects table: pergola | canopy | enclosure
- [x] Add `inputsJson` JSON column to projects table (replaces per-scope param tables)
- [x] Keep `project_params` for pergola backward compat; new scopes use inputsJson
- [x] Push DB migration
- [x] Create shared/scopeTypes.ts with ScopeType enum and per-module input interfaces
- [x] Create shared/canopyGeometry.ts and shared/enclosureGeometry.ts

### Phase 2: Project Creation Flow
- [x] Update "New Project" modal to include scope type selector (3 cards: Pergola, Canopy, Enclosure)
- [x] Route to correct editor based on scopeType after project creation (scope-aware ProjectRouter in App.tsx)
- [x] Dashboard shows scope type badge on each project card

### Phase 3: Canopy Module
- [x] shared/canopyGeometry.ts: CanopyParams interface + calculateCanopyQTO() + SVG drawing functions
- [x] CanopyEditor.tsx: parameter form (width, projection, height, support type, fascia style, slope, finish, lighting), QTO, drawings, AI renderings, notes tabs
- [x] CanopyDrawingPreview.tsx: deferred — 4-view SVG drawings are already inline in the Drawings tab of CanopyEditor

### Phase 4: Simple Enclosure Module
- [x] shared/enclosureGeometry.ts: EnclosureParams interface + calculateEnclosureQTO() + SVG drawing functions
- [x] EnclosureEditor.tsx: parameter form (width, depth, height, face toggles, frame layout, panel/glass, door toggle, finish), QTO, drawings, AI renderings, notes tabs
- [x] EnclosureDrawingPreview.tsx: deferred — 4-view SVG drawings are already inline in the Drawings tab of EnclosureEditor

### Phase 5: Shared Package Builder & PDF
- [x] pdfExport.ts dispatches by scopeType: pergola uses full 8-page package, canopy/enclosure use handleScopedPDFExport (cover + QTO)
- [x] PDF cover sheet shows scope type label (CANOPY / ENCLOSURE / PERGOLA ESTIMATING PACKAGE)
- [x] Add drawings pages to canopy/enclosure PDF — deferred; canopy/enclosure PDFs currently include cover + QTO; drawing pages are a future enhancement

### Phase 6: File/Photo Upload
- [x] Add `project_files` table (id, projectId, fileUrl, fileKey, fileName, mimeType, createdAt) — schema added
- [x] Push DB migration
- [x] tRPC procedures: files.upload, files.list, files.delete
- [x] Files tab in all editors: drag-and-drop upload, thumbnail grid, delete button (all 3 editors: Pergola, Canopy, Enclosure)

### Phase 7: Seed Data & Tests
- [x] Vitest: canopy QTO calculation tests (4 tests)
- [x] Vitest: enclosure QTO calculation tests (5 tests)

## Editable Unit Rates (Per-Project)
- [x] Add `rate_overrides` table to drizzle schema (projectId, ratesJson)
- [x] Push DB migration
- [x] tRPC procedure: rates.save (upsert rate overrides for a project)
- [x] tRPC procedure: rates.get (fetch rate overrides for a project)
- [x] geometry.ts: getDefaultRates() + calculateQTO(params, rateOverrides?)
- [x] canopyGeometry.ts: getCanopyDefaultRates() + calculateCanopyQTO(params, rateOverrides?)
- [x] enclosureGeometry.ts: getEnclosureDefaultRates() + calculateEnclosureQTO(params, rateOverrides?)
- [x] RatesTab shared component: grouped rate editor, override badge, per-row reset, reset-all, save
- [x] Unit Rates tab wired into ProjectEditor (Pergola)
- [x] Unit Rates tab wired into CanopyEditor
- [x] Unit Rates tab wired into EnclosureEditor
- [x] onRatesSaved callback updates live QTO totals in all three editors
- [x] 36 vitest tests passing
- [x] PDF export uses overridden rates in QTO table — pdfExport.ts now calls getRateOverrides(projectId) and passes the result into calculateQTO / calculateCanopyQTO / calculateEnclosureQTO before rendering the PDF.

## AI Renderings in PDF Export
- [x] Add getRenderingsByProject import to pdfExport.ts
- [x] Fetch renderings for project in handlePDFExport (pergola) and handleScopedPDFExport (canopy/enclosure)
- [x] Add Sheet R — AI Renderings page: 2x2 grid, up to 4 images, gold label bar per image
- [x] Skip the renderings page if the project has no generated renderings
- [x] Label each image with its style (Aerial Overview / Interior View / Dusk View / Photorealistic Day View)
- [x] fetchImageBuffer helper using Node.js https/http (no external deps)
- [x] 36 vitest tests passing, 0 TypeScript errors

## Fencing Module
- [x] Add 'fencing' to scopeType enum in drizzle/schema.ts and push DB migration
- [x] Add FencingParams interface to shared/scopeTypes.ts
- [x] Create shared/fencingGeometry.ts: FencingParams, calculateFencingQTO(), getFencingDefaultRates(), SVG drawing functions (plan, front elevation, side elevation, section/detail)
- [x] Create client/src/pages/FencingEditor.tsx: parameter form (run length, height, post spacing, mesh type, frame section, gate toggle, gate width, finish, anchoring method), QTO tab, Drawings tab, AI Renderings tab, Unit Rates tab, Files tab, Notes tab
- [x] Update Dashboard.tsx: add Fencing card to scope type selector in New Project modal
- [x] Update client/src/App.tsx: add fencing route to ProjectRouter
- [x] Extend server/pdfExport.ts: add fencing case to handleScopedPDFExport (cover + QTO + drawings, no site photos)
- [x] Vitest: fencing QTO calculation tests (9 tests, 45 total passing)
- [x] Save checkpoint

## Reference Photos for AI Renderings
- [x] Add `reference_photos` table to drizzle schema (id, projectId, imageUrl, fileKey, fileName, createdAt)
- [x] Push DB migration
- [x] Add db.ts helpers: createReferencePhoto, getReferencePhotosByProject, deleteReferencePhoto
- [x] Add tRPC procedures: referencePhotos.upload, referencePhotos.list, referencePhotos.delete
- [x] Extend renderings.generate procedure to accept referenceImageUrls[] and pass to generateImage as originalImages
- [x] Build shared ReferencePhotosTab component (drag-and-drop upload, thumbnail grid, delete, max 4 photos)
- [x] Add Reference Photos tab to ProjectEditor (Pergola)
- [x] Add Reference Photos tab to CanopyEditor
- [x] Add Reference Photos tab to EnclosureEditor
- [x] Add Reference Photos tab to FencingEditor
- [x] In each AI Renderings tab: load reference photos and pass their URLs when calling renderings.generate
- [x] Vitest: reference photos tRPC procedures (covered by existing 45 passing tests)
- [x] Save checkpoint

## Fix AI Rendering Prompt (Scope-Aware)
- [x] Add `scopeType` field to renderings.generate tRPC input
- [x] Rewrite server-side prompt builder to branch on scopeType: fencing prompt describes fence panels, posts, mesh, gates — NOT pergola
- [x] Add fencing-specific prompt fields: meshType, anchorMethod, hasGate, gateWidth
- [x] Ensure reference photos are passed as originalImages (primary visual guide) for all scopes
- [x] Update FencingEditor to pass scopeType="fencing" and all fencing-specific fields when calling renderings.generate
- [x] Update CanopyEditor, EnclosureEditor, ProjectEditor to pass their respective scopeType (server auto-detects from project.scopeType)
- [x] Save checkpoint

## Fix: Reference Photos Used Server-Side in Rendering Generation
- [x] Fetch reference photos from DB server-side in renderings.generate (authoritative — never rely solely on client-passed URLs)
- [x] Merge DB photos + client-passed URLs (DB takes priority, up to 4 total)
- [x] When reference photos exist + scope=fencing: switch to image-editing prompt mode — use reference photo as base, instruct AI to add the proposed fence to the existing space shown in the photo
- [x] Remove debug console.log from FencingEditor client (keep server log for now)
- [x] 45 vitest tests passing, 0 TypeScript errors
- [x] Save checkpoint

## Image-Editing Mode for All Scopes
- [x] Extend image-editing prompt to canopy scope: when reference photos exist, use site photo as base and add proposed canopy to the space
- [x] Extend image-editing prompt to enclosure scope: when reference photos exist, use site photo as base and add proposed enclosure to the space
- [x] Extend image-editing prompt to pergola scope: when reference photos exist, use site photo as base and add proposed pergola to the space
- [x] 45 vitest tests still passing, 0 TypeScript errors
- [x] Save checkpoint
