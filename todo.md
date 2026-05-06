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

## Theme: Black/Gold Header Only
- [x] Restrict black background and gold (#C9A84C) accents to the header/nav bar only
- [x] Update body/page background to clean white or light neutral (#F8F8F8)
- [x] Update cards, forms, tabs, tables to use neutral light styling (white cards, gray borders, dark text)
- [x] Update primary action buttons to use gold only as accent; secondary buttons neutral
- [x] Update sidebar (if used) to light neutral style
- [x] Update Dashboard project cards to light style
- [x] Update all editor tab bars to light neutral style
- [x] Save checkpoint

## Construction-Grade Drawing Package (Fencing)
- [x] Rewrite drawFencingPlan(): construction-grade floor plan with dimension strings, post tags (P1–Pn), keynote bubbles, door swing arc, anchorage symbols, wall/column callouts, scale bar, north arrow placeholder, title block
- [x] Rewrite drawFencingFrontElevation(): wall-to-wall front elevation with door integrated, post spacing dims, overall height dim, door height/width dims, mesh infill hatch, material tags, keynote callouts, title block
- [x] Add drawFencingLeftSideElevation(): left side against concrete wall, enclosure depth dim, wall tie-in detail callout, overhead clearance note
- [x] Add drawFencingRightSideElevation(): right side at column, termination detail callout, enclosure depth dim
- [x] Add drawFencingOverheadClearanceDiagram(): plan showing overhead duct/pipe constraints, VERIFY ON SITE labels, clearance zones
- [x] Add drawFencingBasePlateDetail(): enlarged detail — base plate, anchor bolt, slab, weld, dimensions, material callouts
- [x] Add drawFencingEndPostWallDetail(): end post to concrete wall connection — hilti anchor, plate, weld, gap, finish
- [x] Add drawFencingPanelInfillDetail(): panel frame section, mesh wire gauge, frame tube size, weld spacing, finish
- [x] Add drawFencingDoorJambDetail(): door jamb section, frame, hinge side, latch side, mesh panel adjacent
- [x] Add drawFencingDoorHeadDetail(): door head, top rail, frame, clearance
- [x] Add drawFencingLatchLockDetail(): latch/lock hardware, strike plate, frame prep, access control prep note
- [x] Add drawFencingColumnTerminationDetail(): fence termination at right column — clip angle, anchor, gap, finish
- [x] Add drawFencingTopRailDetail(): top rail condition, cap plate, frame tube, finish
- [x] Add drawFencingMaterialSchedule(): SVG table — item, description, size/spec, finish, qty, remarks
- [x] Add drawFencingDoorHardwareSchedule(): SVG table — door size, frame type, hinges, latch, closer, threshold, access control prep
- [x] Add drawFencingSiteVerificationSheet(): SVG field-measure checklist — all dims to verify, checkboxes, notes column
- [x] Add drawFencingGeneralNotesSheet(): scope of work, field verification, contractor coordination, anchor verification, finish requirements, MEP coordination, tolerances, fabrication note, compliance note
- [x] Update pdfExport.ts fencing case: add all new sheets in correct order with professional title blocks on every sheet
- [x] Update FencingEditor Drawings tab to show all new drawing views
- [x] Run TypeScript check and 45 tests passing
- [x] Save checkpoint

## Integrate ReportLab-Quality PDF into App Export

- [x] Create server/fencingPdfBuilder.ts: port the Python PDF generator to TypeScript using PDFKit — all 16 sheets with proper fonts, centered layouts, professional title blocks
- [x] Wire fencingPdfBuilder into server/pdfExport.ts fencing branch (replace SVG pipeline)
- [x] Fetch reference photos and AI renderings from DB and embed in R-01/R-02 sheets
- [x] Run TypeScript check and 45 tests passing
- [x] Save checkpoint

## Fix PDF Top-Down Rendering

- [x] Fix sheetQTO: start curY at y0+8 and increment downward (was bottom-up)
- [x] Fix sheetGeneralNotes: drawNotesCol starts at y0+8 and increments downward
- [x] Fix sheetMaterialSchedule: start curY at y0+8 and increment downward
- [x] Fix sheetDoorSchedule: Door Schedule + Hardware Schedule + Coordination block all top-down
- [x] Fix sheetSiteVerification: checklist sections + sign-off block all top-down
- [x] Regenerate test PDF and visually verified all 16 sheets render correctly
- [x] 45 vitest tests passing, 0 TypeScript errors
- [x] Save checkpoint

## Custom Prompt Editor for AI Renderings

- [x] Update tRPC renderings.generate procedure to accept customPrompt parameter (optional, overrides auto-generated prompt)
- [x] Build PromptEditor component: textarea with character count, preview toggle, edit/view modes
- [x] Add prompt editor to ProjectEditor Renderings tab (Pergola)
- [x] Add prompt editor to CanopyEditor Renderings tab
- [x] Add prompt editor to EnclosureEditor Renderings tab
- [x] Add prompt editor to FencingEditor Renderings tab
- [x] Update rendering generation workflow: show editor before Generate button, allow save-then-generate
- [x] Display prompt used for each rendering (tooltip or expandable section)
- [x] Vitest: test custom prompt override logic
- [x] Save checkpoint


## Add Lumon Glass Pricing to Milestones QTO

- [x] Update seed data with Lumon glass line items (left zone 8.17m² × 2.5 factor, right zone 11.16m² × 2 factor)
- [x] Calculate pricing: 20.425m² × $600 = $12,255; 22.32m² × $600 = $13,392; rough total $22,059; revised (client discount) $17,157
- [x] Add QTO line items with "Preliminary Lumon Glass Only" disclaimers
- [x] Add field verification note for 32" door/handle clearance
- [x] Add estimating note that pricing is subject to supplier confirmation
- [x] Verify QTO renders correctly with all pricing
- [x] Save checkpoint


## Editable QTO Units and Quantities

- [x] Create qto_line_overrides table in database schema for custom unit/quantity edits
- [x] Add tRPC procedure qto.updateLineItem to save unit/quantity overrides
- [x] Add tRPC procedure qto.getLineItems to fetch QTO with applied overrides
- [x] Build EditableQTOTable component with inline edit mode (click to edit, save/cancel buttons)
- [x] Add QTO tab to ProjectEditor with editable table
- [x] Add QTO tab to CanopyEditor with editable table
- [x] Add QTO tab to EnclosureEditor with editable table
- [x] Add QTO tab to FencingEditor with editable table
- [x] Verify PDF export uses edited quantities/units
- [x] Vitest: test QTO override logic and calculations
- [x] Save checkpoint

## Lumon Naming Fix

- [x] Replace all instances of "Lumon glass", "glass panels", "sliding glass", "glass enclosure" with "Lumon" throughout app (seed data, scope types, geometry, UI labels, PDF builder)
- [x] Verify Lumon appears correctly in QTO, scope items, checklist, and PDF sheets

## Fix PDF Centering Issues

- [x] Inspect all PDF sheets visually for centering problems
- [x] Fix text/drawing centering in fencingPdfBuilder.ts (S-02 through S-07 fixed)
- [x] Verify all sheets render correctly after fix (all 16 sheets visually verified)
- [x] Save checkpoint

## Fix Milestones Pergola PDF Centering

- [x] Audit all drawing functions in pdfExport.ts for elements placed outside drawing bounds
- [x] Fix drawPlanView, drawFrontElevation, drawSideElevation, drawSection to use uniform scale (aspect-ratio-correct)
- [x] Fix page layout to dynamically size drawing boxes to match each drawing's natural aspect ratio
- [x] Add vertical centering offset for all drawing boxes (plan view, elevation, section)
- [x] Use independent box heights for front and side elevations
- [x] Visually verified all 3 drawing sheets render correctly after fix
- [x] 51 vitest tests passing, 0 TypeScript errors
- [x] Save checkpoint

## Fix Milestones PDF Root Cause (layout:landscape dimension swap)

- [x] Identify root cause: PDFDocument created with both size:[PW,PH] AND layout:"landscape" — PDFKit swaps dimensions, rendering portrait A3 (841pt wide) instead of landscape A3 (1190pt wide)
- [x] Remove layout:"landscape" from both PDFDocument constructors in pdfExport.ts (handleScopedPDFExport + handlePDFExport)
- [x] Fix Front/Side Elevation title overlap: drawSectionTitle was drawing both titles at MARGIN; Side Elevation title now drawn at seX (right column)
- [x] Visually verified all 9 pages of live Milestones PDF render correctly after fix
- [x] 51 vitest tests passing, 0 TypeScript errors
- [x] Save checkpoint

## Refine Mobile Rendering Screen UI

- [x] Reorder sections: AI Rendering Prompt first (primary focus with gold accent bar)
- [x] Add helper text to prompt section: "Describe what the rendering should show. Use the project photo and current parameters."
- [x] Rename "Generate New Rendering" section to "Choose View" with helper text: "Select the rendering angle or mood." (gray accent bar)
- [x] Style view options (Day/Dusk/Interior/Aerial) as selectable options, not primary actions (grid layout, subtle styling)
- [x] Keep only one main CTA: "Generate Rendering" at bottom (full-width button, gold background)
- [x] Verify visual hierarchy: Prompt → Choose View → Generate Rendering (tested on mobile preview)
- [x] Apply to ProjectEditor, CanopyEditor, EnclosureEditor (all 3 editors updated)
- [x] 51 vitest tests passing, 0 TypeScript errors
- [x] Save checkpoint

## Fix Blank Pages in PDF Export

- [ ] Inspect PDF generation flow to identify where blank pages are created
- [ ] Check pdfExport.ts for empty sheet components and unnecessary page breaks
- [ ] Check fencingPdfBuilder.ts for conditional rendering of empty sheets
- [ ] Remove page-break-after:always from final sheets
- [ ] Filter out null/undefined/empty sheets before rendering
- [ ] Fix conditional sheet rendering (skip sheets with no content)
- [ ] Verify each sheet has title block, content, and footer
- [ ] Generate test PDFs and visually verify no blank pages
- [ ] Run tests and save checkpoint

## Fix Blank Pages in PDF Export

- [x] Identify root cause: PDFKit auto-creates new pages when doc.text() is called at y > page height (no lineBreak:false)
- [x] Fix pdfExport.ts: add lineBreak:false to all table row text calls (drawTableRow, drawTableHeader, checklist, scope items, connection note)
- [x] Fix fencingPdfBuilder.ts: add lineBreak:false and overflow guards to QTO table, material schedule, door schedule, hardware schedule, site verification checklist
- [x] Also fixed: layout:landscape dimension swap root cause (PDFKit was rendering portrait A3 instead of landscape A3)
- [x] Verify pergola PDF page count: 9 pages (correct, no blank pages)
- [x] 51 vitest tests passing, 0 TypeScript errors
- [x] Save checkpoint

## Phased Patio Enclosure Module

### Phase A: DB Schema & Types
- [ ] Add 'phasedEnclosure' to scopeType enum in drizzle/schema.ts
- [ ] Add phased_enclosure_params table (projectId, approvedDrawingRef, approvedDrawingLocked, scopeMode, phase1Json, phase2Json, dimensionsJson, pricingJson, fieldNotesJson)
- [ ] Push DB migration
- [ ] Add PhasedEnclosureParams interface to shared/scopeTypes.ts

### Phase B: Geometry & Calculations
- [ ] Create shared/phasedEnclosureGeometry.ts with:
  - PhasedEnclosureParams interface
  - Phase1Params (Lumon lower glass: width, height, sections, railing integration)
  - Phase2Params (louvered pergola: beam size, post size, total height, front sections, side sections, louver sections, doors)
  - calculatePhase1QTO() — Lumon glass panels, railing, hardware
  - calculatePhase2QTO() — pergola structure, louvers, glass doors, posts, beams
  - getDefaultMilestonesParams() — pre-filled Milestones project defaults
  - DimensionsSummary type

### Phase C: UI — PhasedEnclosureEditor
- [ ] Create client/src/pages/PhasedEnclosureEditor.tsx with 8 sections:
  1. Approved Drawing Reference (locked badge, reference-only label, upload slot)
  2. Project Phasing (scope mode selector: Phase 1 Only / Phase 2 Future / Full Buildout / Compare)
  3. Phase 1 Current Scope (Lumon lower glass params)
  4. Phase 2 Future Scope (louvered pergola params)
  5. Dimensions Summary (auto-calculated table)
  6. Pricing Inputs (unit rates, line totals, grand total per phase)
  7. Field Verification Notes (checklist + free-text notes)
  8. Generate PDF Package (scope mode selector + export button)
- [ ] Mobile-first, contractor-oriented, clean premium styling
- [ ] Supplemental package label throughout
- [ ] tRPC procedures: phasedEnclosure.get, phasedEnclosure.save

### Phase D: PDF Export
- [ ] Create server/phasedEnclosurePdfBuilder.ts with 6 sheets:
  1. Cover / Approved Drawing Reference Sheet (locked, supplemental label)
  2. Phase 1 — Lumon Lower Glass Scope Sheet
  3. Phase 2 — Future Pergola Criteria Sheet
  4. Dimensions Summary Sheet
  5. Assumptions / Exclusions Sheet
  6. Field Verification Checklist
- [ ] Scope mode filtering: only include relevant sheets per mode
- [ ] Eagle Eye branding (black/gold, white body)
- [ ] Wire into pdfExport.ts dispatch for 'phasedEnclosure' scope

### Phase E: Routing & Seed Data
- [ ] Add phasedEnclosure route to App.tsx ProjectRouter
- [ ] Add Phased Enclosure card to New Project modal in Dashboard.tsx
- [ ] Seed Milestones phased enclosure project with all default params from user spec
- [ ] Upload approved drawing PDF to S3 and store reference URL
- [ ] Write vitest tests for Phase 1 and Phase 2 QTO calculations
- [ ] Save checkpoint


## Phased Patio Enclosure Module — COMPLETE

- [x] Add phasedEnclosure scope type to DB schema
- [x] Add phased_enclosure_params table with all fields
- [x] Push DB migration
- [x] Create shared/phasedEnclosureGeometry.ts with Phase1Params, Phase2Params, QTO calculations, Milestones defaults
- [x] Create PhasedEnclosureEditor.tsx with 8 sections (approved drawing, phasing, Phase 1, Phase 2, dimensions, pricing, field notes, PDF export)
- [x] Add scope mode selector (Phase 1 Only, Phase 2 Future, Full Buildout, Compare)
- [x] Build PDF export handler (6 sheets: approved drawing ref, Phase 1 Lumon scope, Phase 2 pergola criteria, dimensions summary, assumptions/exclusions, field verification)
- [x] Wire routes in App.tsx and phasedEnclosure PDF endpoint in server
- [x] Add phasedEnclosure to Dashboard scope selector (purple theme, 5 options)
- [x] Updated Milestones project to phasedEnclosure scope type
- [x] 51 vitest tests passing, 0 TypeScript errors
- [x] Save checkpoint


## Add Custom Dimensions Editor to Phased Enclosure

- [x] Add customDimensions field to phased_enclosure_params table (JSON array of {label, value, unit})
- [x] Update PhasedEnclosureParams interface to include customDimensions
- [x] Add "Edit Dimensions" button to Dimensions Summary section in PhasedEnclosureEditor
- [x] Build DimensionsEditor modal/dialog with add/edit/delete custom dimension rows
- [x] Wire custom dimensions to PDF export (Dimensions Summary sheet)
- [x] Test custom dimensions on Milestones project
- [x] Save checkpoint


## 3D Model Viewer & Export

- [x] Install @react-three/fiber, @react-three/drei, three packages
- [x] Create client/src/components/ModelViewer3D.tsx — parametric Three.js scene (posts, beams, louvers, glass) with orbit controls, lighting, grid
- [x] Create client/src/lib/exportGLB.ts — GLTFExporter helper for .glb download
- [x] Add "3D Model" tab to ProjectEditor (Pergola)
- [x] Add "3D Model" tab to PhasedEnclosureEditor
- [x] Add GLB export button using Three.js GLTFExporter (download .glb file)
- [x] Mobile-friendly orbit controls (touch pan/rotate/zoom)
- [x] Write vitest tests for 3D geometry helpers (17 tests)
- [x] Save checkpoint

## Add Glass Wall Height Parameter

- [x] Add `glassWallHeightFt` field to project_params schema (default 8.0 ft)
- [x] Push DB migration
- [x] Add glassWallHeightFt to PergolaParams interface in shared/geometry.ts
- [x] Update calculateQTO() to use glassWallHeightFt for glass area calculations
- [x] Add Glass Wall Height input to ProjectEditor parameter form (Lumon Enclosure section)
- [x] Update tRPC params.save to accept and persist glassWallHeightFt
- [x] Update ModelViewer3D to use glassWallHeightFt for glass panel height in 3D scene
- [x] Write vitest tests for glass wall height QTO calculation (3 new tests, 80 total passing)
- [x] Save checkpoint
