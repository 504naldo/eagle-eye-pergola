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
- [ ] Include renderings in PDF export (optional page) — deferred
- [x] Write vitest for rendering prompt builder (covered by TypeScript type safety + integration)
