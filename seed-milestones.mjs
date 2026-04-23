import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

console.log("Connected to database. Seeding Milestones project...");

// ── 1. Find or create a placeholder user (owner) ─────────────────────────────
const [userRows] = await conn.execute("SELECT id FROM users LIMIT 1");
let userId;
if (userRows.length > 0) {
  userId = userRows[0].id;
  console.log(`Using existing user id=${userId}`);
} else {
  const [result] = await conn.execute(
    "INSERT INTO users (openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())",
    ["seed-owner", "Ranaldo Daniels", "ranaldo@eagleeyemgmt.com", "seed", "admin"]
  );
  userId = result.insertId;
  console.log(`Created seed user id=${userId}`);
}

// ── 2. Check if Milestones project already exists ────────────────────────────
const [existingProjects] = await conn.execute(
  "SELECT id FROM projects WHERE projectName = ? AND userId = ? LIMIT 1",
  ["Milestones Grill + Bar — Abbotsford, BC", userId]
);

let projectId;
if (existingProjects.length > 0) {
  projectId = existingProjects[0].id;
  console.log(`Milestones project already exists (id=${projectId}). Updating params...`);
} else {
  const [result] = await conn.execute(
    `INSERT INTO projects (userId, projectName, clientName, location, status, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      userId,
      "Milestones Grill + Bar — Abbotsford, BC",
      "Milestones Restaurants Inc.",
      "Abbotsford, BC — Strip Mall Patio",
      "in_review",
      "Louvered roof enclosure with 5 front sections (11'×8'), 6×6 posts, 8' side sections with glass escape doors, 5 louver bays with integrated LED lighting in 8\" beams. Total front face 58', total height 8'10\". Prepared by: Ranaldo Daniels."
    ]
  );
  projectId = result.insertId;
  console.log(`Created Milestones project id=${projectId}`);
}

// ── 3. Upsert project parameters ─────────────────────────────────────────────
await conn.execute("DELETE FROM project_params WHERE projectId = ?", [projectId]);
await conn.execute(
  `INSERT INTO project_params
     (projectId, widthFt, depthFt, heightFt, postCount, postSpacingFt,
      slatType, slatSpacingIn, glassFront, glassLeft, glassRight,
      connectionType, finishColor, ledLighting, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
  [
    projectId,
    "58.00",   // 58'-0" total front width (5 sections × 11' + 6 posts × 0.5')
    "15.67",   // 15'-8" depth (side section depth)
    "8.83",    // 8'-10" total height including 8" beams
    6,         // 6 posts (6"×6" aluminum SHS)
    "9.67",    // ~9'-8" post spacing C/C (58' ÷ 6 posts)
    "operable", // operable louvers (not fixed slats)
    "10.00",   // 10' louver bay width (between 8" beams)
    1,         // glassFront = true (5 sections of glass)
    1,         // glassLeft = true (side glass enclosure with escape door)
    1,         // glassRight = true (side glass enclosure with escape door)
    "wall_mounted_lean_to",
    "Matte Black",
    1          // LED lighting = true (integrated in 8" beams)
  ]
);
console.log("Project parameters seeded.");

// ── 4. Seed checklist items ───────────────────────────────────────────────────
await conn.execute("DELETE FROM checklist_items WHERE projectId = ?", [projectId]);

const checklistItems = [
  // Overall Dimensions
  { category: "Overall Dimensions", label: "Confirm total front face width: 58'-0\" (17,678 mm) — 5 sections × 11' + 6 posts × 0.5'", checked: 0, sortOrder: 1 },
  { category: "Overall Dimensions", label: "Confirm total depth: 15'-8\" (4,775 mm) — wall-mount option with 1 post per side", checked: 0, sortOrder: 2 },
  { category: "Overall Dimensions", label: "Confirm total height: 8'-10\" (2,692 mm) — 8' sections + 8\" beams", checked: 0, sortOrder: 3 },
  { category: "Overall Dimensions", label: "Confirm 5 louver bay sections at 10' wide each with 8\" structural beams between", checked: 0, sortOrder: 4 },
  { category: "Overall Dimensions", label: "Confirm finished floor level — any slope or drain locations", checked: 0, sortOrder: 5 },

  // Heights & Clearances
  { category: "Heights & Clearances", label: "Measure underside of existing building soffit / awning at rear wall connection", checked: 0, sortOrder: 6 },
  { category: "Heights & Clearances", label: "Confirm minimum clear height required for occupancy / code (8'-0\" min)", checked: 0, sortOrder: 7 },
  { category: "Heights & Clearances", label: "Identify any overhead obstructions (signage, lighting, HVAC, sprinklers)", checked: 0, sortOrder: 8 },
  { category: "Heights & Clearances", label: "Confirm wall ledger connection height on building face — 8'-10\" total", checked: 0, sortOrder: 9 },

  // Building Wall & Connection
  { category: "Building Wall & Connection", label: "Identify building wall construction (CMU, wood frame, steel stud)", checked: 0, sortOrder: 10 },
  { category: "Building Wall & Connection", label: "Confirm no windows or openings conflict with wall ledger zone (rear connection)", checked: 0, sortOrder: 11 },
  { category: "Building Wall & Connection", label: "Confirm landlord / building owner approval for wall penetrations and ledger bolts", checked: 0, sortOrder: 12 },
  { category: "Building Wall & Connection", label: "Locate and mark any existing wall utilities (electrical, plumbing, gas, HVAC)", checked: 0, sortOrder: 13 },

  // Post Locations
  { category: "Post Locations", label: "Mark 6 post locations (6\"×6\" aluminum SHS) on slab — confirm no conflicts", checked: 0, sortOrder: 14 },
  { category: "Post Locations", label: "Confirm slab thickness and condition at each post base location (min. 4\" recommended)", checked: 0, sortOrder: 15 },
  { category: "Post Locations", label: "Confirm no underground utilities below post base locations", checked: 0, sortOrder: 16 },

  // Utilities & Coordination
  { category: "Utilities & Coordination", label: "Locate existing patio electrical outlets and lighting circuits for LED integration", checked: 0, sortOrder: 17 },
  { category: "Utilities & Coordination", label: "Confirm LED power source location — integrated in 8\" beams between louver sections", checked: 0, sortOrder: 18 },
  { category: "Utilities & Coordination", label: "Identify any gas lines, water lines, or drains in patio zone", checked: 0, sortOrder: 19 },
  { category: "Utilities & Coordination", label: "Confirm permit requirements with local authority (City of Abbotsford)", checked: 0, sortOrder: 20 },

  // Glass Enclosure & Doors
  { category: "Glass Enclosure & Doors", label: "Confirm glass panel layout — 5 front sections (11'×8' each) + left/right side enclosure", checked: 0, sortOrder: 21 },
  { category: "Glass Enclosure & Doors", label: "Confirm glass escape door locations — 32\" swing door on each side face (closest to wall)", checked: 0, sortOrder: 22 },
  { category: "Glass Enclosure & Doors", label: "Confirm sliding glass panel configuration — remainder of each side section after escape door", checked: 0, sortOrder: 23 },
  { category: "Glass Enclosure & Doors", label: "Confirm glass top rail connection to louver beam structure", checked: 0, sortOrder: 24 },
];

for (const item of checklistItems) {
  await conn.execute(
    "INSERT INTO checklist_items (projectId, category, label, checked, fieldNote, sortOrder) VALUES (?, ?, ?, ?, NULL, ?)",
    [projectId, item.category, item.label, item.checked, item.sortOrder]
  );
}
console.log(`Seeded ${checklistItems.length} checklist items.`);

// ── 5. Seed scope items ───────────────────────────────────────────────────────
await conn.execute("DELETE FROM scope_items WHERE projectId = ?", [projectId]);

const scopeItems = [
  // Inclusions
  { type: "inclusion", text: "Supply and install prefabricated aluminum louvered roof enclosure structure (6 posts + wall-mounted rear ledger)", sortOrder: 1 },
  { type: "inclusion", text: "6 × structural posts (6\"×6\" aluminum SHS, matte black powder coat)", sortOrder: 2 },
  { type: "inclusion", text: "5 louver bay sections with operable aluminum louvers (10' wide × 15' deep each)", sortOrder: 3 },
  { type: "inclusion", text: "4 × structural beams (8\" depth) between louver sections with integrated LED lighting", sortOrder: 4 },
  { type: "inclusion", text: "Rear wall ledger beam bolted to building face (wall-mounted connection)", sortOrder: 5 },
  { type: "inclusion", text: "Operable sliding Lumon glass panels — left zone (2.44m × 3.35m) and center zone (2.44m × 4.57m)", sortOrder: 6 },
  { type: "inclusion", text: "Single 32\" swing door opening on right side (near entrance/wall) with latch hardware and handle clearance", sortOrder: 7 },
  { type: "inclusion", text: "Sliding glass panels for right side zone (remainder after 32\" door opening)", sortOrder: 8 },
  { type: "inclusion", text: "Post base plates and anchor bolts into existing concrete slab (6 posts)", sortOrder: 9 },
  { type: "inclusion", text: "LED strip lighting integrated into 8\" structural beams", sortOrder: 10 },
  { type: "inclusion", text: "Matte black powder coat finish on all aluminum components", sortOrder: 11 },
  { type: "inclusion", text: "Shop drawings and fabrication package", sortOrder: 12 },

  // Exclusions
  { type: "exclusion", text: "Licensed structural engineering and stamped drawings (by others)", sortOrder: 1 },
  { type: "exclusion", text: "Building permit fees and permit application (by others)", sortOrder: 2 },
  { type: "exclusion", text: "Concrete slab repair, levelling, or replacement", sortOrder: 3 },
  { type: "exclusion", text: "Electrical rough-in, wiring, and panel connections for LED lighting in beams", sortOrder: 4 },
  { type: "exclusion", text: "Waterproofing membrane or drainage system at wall ledger and beam connections", sortOrder: 5 },
  { type: "exclusion", text: "Glass escape door hardware, latch mechanisms, and access control prep", sortOrder: 6 },
  { type: "exclusion", text: "Any work inside the building or to the building envelope", sortOrder: 7 },

  // Assumptions
  { type: "assumption", text: "Existing concrete slab is structurally adequate to receive 6 post base anchors without reinforcement", sortOrder: 1 },
  { type: "assumption", text: "Building wall is structurally adequate to receive wall ledger without additional blocking", sortOrder: 2 },
  { type: "assumption", text: "All field dimensions will be verified prior to fabrication — drawing dimensions are preliminary", sortOrder: 3 },
  { type: "assumption", text: "Lumon glass sliding panels are supplied and installed under a separate contract — preliminary pricing shown is Lumon glass only, subject to supplier confirmation and field verification", sortOrder: 4 },
  { type: "assumption", text: "Existing railing (if present) will be coordinated with new glass enclosure entry zone — 32\" door clearance verified on site", sortOrder: 5 },
  { type: "assumption", text: "Landlord and building owner approval for wall penetrations and ledger bolts will be obtained prior to fabrication", sortOrder: 6 },
  { type: "assumption", text: "No underground utilities conflict with post base locations or beam routing", sortOrder: 7 },

  // By Others
  { type: "by_others", text: "Licensed structural engineer — review and stamp all connection details and beam sizing", sortOrder: 1 },
  { type: "by_others", text: "Permit authority — City of Abbotsford building permit approval for louvered roof structure", sortOrder: 2 },
  { type: "by_others", text: "Lumon glass supplier — supply and install operable sliding glass panels (left, center, right zones) and 32 inch door opening", sortOrder: 3 },
  { type: "by_others", text: "Electrical contractor — LED lighting power supply and wiring in structural beams", sortOrder: 4 },
  { type: "by_others", text: "Landlord / property manager — wall penetration approval, ledger bolt coordination, and roof access", sortOrder: 5 },
];

// Add Lumon glass pricing notes to scope items (using assumption type for preliminary pricing)
const lumonPricingNotes = [
  { type: "assumption", text: "PRELIMINARY LUMON GLASS PRICING — Subject to supplier confirmation and field verification", sortOrder: 8 },
  { type: "assumption", text: "Left Zone: 2.44m x 3.35m = 8.17 m2 x 2.5 factor = 20.425 m2 x $600/m2 = $12,255", sortOrder: 9 },
  { type: "assumption", text: "Right Zone: 2.44m x 4.57m = 11.16 m2 x 2 (quantity) x $600/m2 = $13,392", sortOrder: 10 },
  { type: "assumption", text: "Rough Total (before discount): $22,059", sortOrder: 11 },
  { type: "assumption", text: "Revised Total (with client discount): $17,157", sortOrder: 12 },
  { type: "assumption", text: "Field Verification Note: Confirm 32 inch door opening clearance with handle and latch hardware on site prior to glass fabrication", sortOrder: 13 },
  { type: "assumption", text: "Estimating Note: Handwritten pricing is for Lumon glass panels only. Does not include structural aluminum frame, LED lighting, installation labor, or site coordination.", sortOrder: 14 },
];

scopeItems.push(...lumonPricingNotes);

for (const item of scopeItems) {
  await conn.execute(
    "INSERT INTO scope_items (projectId, type, text, sortOrder) VALUES (?, ?, ?, ?)",
    [projectId, item.type, item.text, item.sortOrder]
  );
}
console.log(`Seeded ${scopeItems.length} scope items.`);

await conn.end();
console.log("\n✅ Milestones Grill + Bar project seeded successfully!");
console.log(`   Project ID: ${projectId}`);
console.log(`   Navigate to /project/${projectId} to view and export the PDF package.`);
