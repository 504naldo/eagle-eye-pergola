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
