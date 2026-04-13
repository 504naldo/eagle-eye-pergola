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
      "Lean-to aluminum shading system with Lumin glass vertical enclosure. 5 front posts only — no rear posts. Roof system and Lumin glass both connect to building wall. Prepared by: Ranaldo Daniels."
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
    "58.00",   // 58'-0" total width
    "15.67",   // 15'-8" depth
    "10.00",   // 10'-0" clear height
    5,         // 5 front posts only
    "14.50",   // ~14'-6" post spacing C/C
    "fixed",   // fixed slat system
    "4.00",    // 4" slat spacing
    1,         // glassFront = true
    1,         // glassLeft = true
    1,         // glassRight = true
    "wall_mounted_lean_to",
    "Matte Black",
    1          // LED lighting = true
  ]
);
console.log("Project parameters seeded.");

// ── 4. Seed checklist items ───────────────────────────────────────────────────
await conn.execute("DELETE FROM checklist_items WHERE projectId = ?", [projectId]);

const checklistItems = [
  // Overall Dimensions
  { category: "Overall Dimensions", label: "Confirm total patio width: 58'-0\" (17,678 mm)", checked: 0, sortOrder: 1 },
  { category: "Overall Dimensions", label: "Confirm total patio depth: 15'-8\" (4,775 mm)", checked: 0, sortOrder: 2 },
  { category: "Overall Dimensions", label: "Confirm clear height under existing Lumin glass / awning", checked: 0, sortOrder: 3 },
  { category: "Overall Dimensions", label: "Measure distance from building face to front post line", checked: 0, sortOrder: 4 },
  { category: "Overall Dimensions", label: "Confirm finished floor level — any slope or drain locations", checked: 0, sortOrder: 5 },

  // Heights & Clearances
  { category: "Heights & Clearances", label: "Measure underside of existing building soffit / awning at rear", checked: 0, sortOrder: 6 },
  { category: "Heights & Clearances", label: "Confirm minimum clear height required for occupancy / code", checked: 0, sortOrder: 7 },
  { category: "Heights & Clearances", label: "Identify any overhead obstructions (signage, lighting, HVAC)", checked: 0, sortOrder: 8 },
  { category: "Heights & Clearances", label: "Confirm wall ledger connection height on building face", checked: 0, sortOrder: 9 },

  // Building Wall & Connection
  { category: "Building Wall & Connection", label: "Identify building wall construction (CMU, wood frame, steel stud)", checked: 0, sortOrder: 10 },
  { category: "Building Wall & Connection", label: "Confirm no windows or openings conflict with wall ledger zone", checked: 0, sortOrder: 11 },
  { category: "Building Wall & Connection", label: "Confirm landlord / building owner approval for wall penetrations", checked: 0, sortOrder: 12 },
  { category: "Building Wall & Connection", label: "Locate and mark any existing wall utilities (electrical, plumbing, gas)", checked: 0, sortOrder: 13 },

  // Post Locations
  { category: "Post Locations", label: "Mark 5 front post locations on slab — confirm no conflicts", checked: 0, sortOrder: 14 },
  { category: "Post Locations", label: "Confirm slab thickness and condition at each post base location", checked: 0, sortOrder: 15 },
  { category: "Post Locations", label: "Confirm no underground utilities below post base locations", checked: 0, sortOrder: 16 },

  // Utilities & Coordination
  { category: "Utilities & Coordination", label: "Locate existing patio electrical outlets and lighting circuits", checked: 0, sortOrder: 17 },
  { category: "Utilities & Coordination", label: "Confirm LED string light power source location", checked: 0, sortOrder: 18 },
  { category: "Utilities & Coordination", label: "Identify any gas lines, water lines, or drains in patio zone", checked: 0, sortOrder: 19 },
  { category: "Utilities & Coordination", label: "Confirm permit requirements with local authority (City of Abbotsford)", checked: 0, sortOrder: 20 },

  // Lumin Glass Enclosure
  { category: "Lumin Glass Enclosure", label: "Confirm Lumin glass panel layout — front, left, and right sides", checked: 0, sortOrder: 21 },
  { category: "Lumin Glass Enclosure", label: "Confirm glass top rail connection to fascia beam — coordinate with Lumin supplier", checked: 0, sortOrder: 22 },
  { category: "Lumin Glass Enclosure", label: "Confirm door/opening locations in Lumin glass system", checked: 0, sortOrder: 23 },
  { category: "Lumin Glass Enclosure", label: "Confirm glass corner condition detail at front/side intersections", checked: 0, sortOrder: 24 },
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
  { type: "inclusion", text: "Supply and install prefabricated aluminum lean-to pergola structure (front posts + wall-mounted rear ledger)", sortOrder: 1 },
  { type: "inclusion", text: "5 × front posts (100×100 aluminum SHS, matte black powder coat)", sortOrder: 2 },
  { type: "inclusion", text: "Front fascia beam (150×75 aluminum RHS, matte black powder coat)", sortOrder: 3 },
  { type: "inclusion", text: "Rear wall ledger beam bolted to building face (no rear posts)", sortOrder: 4 },
  { type: "inclusion", text: "Fixed aluminum slat roof system — full 58'-0\" × 15'-8\" coverage", sortOrder: 5 },
  { type: "inclusion", text: "Lumin glass vertical enclosure — front face, left side, and right side", sortOrder: 6 },
  { type: "inclusion", text: "Lumin glass top rail integrated connection to front fascia beam (weathertight)", sortOrder: 7 },
  { type: "inclusion", text: "Post base plates and anchor bolts into existing concrete slab", sortOrder: 8 },
  { type: "inclusion", text: "LED string lighting integrated into slat system", sortOrder: 9 },
  { type: "inclusion", text: "Matte black powder coat finish on all aluminum components", sortOrder: 10 },
  { type: "inclusion", text: "Shop drawings and fabrication package", sortOrder: 11 },

  // Exclusions
  { type: "exclusion", text: "Licensed structural engineering and stamped drawings (by others)", sortOrder: 1 },
  { type: "exclusion", text: "Building permit fees and permit application (by others)", sortOrder: 2 },
  { type: "exclusion", text: "Concrete slab repair, levelling, or replacement", sortOrder: 3 },
  { type: "exclusion", text: "Electrical rough-in, wiring, and panel connections for LED lighting", sortOrder: 4 },
  { type: "exclusion", text: "Waterproofing membrane or drainage system at wall ledger", sortOrder: 5 },
  { type: "exclusion", text: "Signage, heaters, or other tenant improvements", sortOrder: 6 },
  { type: "exclusion", text: "Any work inside the building or to the building envelope", sortOrder: 7 },

  // Assumptions
  { type: "assumption", text: "Existing concrete slab is structurally adequate to receive post base anchors without reinforcement", sortOrder: 1 },
  { type: "assumption", text: "Building wall is structurally adequate to receive wall ledger without additional blocking", sortOrder: 2 },
  { type: "assumption", text: "All field dimensions will be verified prior to fabrication — drawing dimensions are preliminary", sortOrder: 3 },
  { type: "assumption", text: "Lumin glass system is supplied by Lumin and installed under a separate contract — this scope covers the pergola frame only", sortOrder: 4 },
  { type: "assumption", text: "Landlord and building owner approval for wall penetrations will be obtained prior to fabrication", sortOrder: 5 },
  { type: "assumption", text: "No underground utilities conflict with post base locations", sortOrder: 6 },

  // By Others
  { type: "by_others", text: "Licensed structural engineer — review and stamp all connection details", sortOrder: 1 },
  { type: "by_others", text: "Permit authority — City of Abbotsford building permit approval", sortOrder: 2 },
  { type: "by_others", text: "Lumin glass supplier — supply and install vertical glass enclosure panels", sortOrder: 3 },
  { type: "by_others", text: "Electrical contractor — LED lighting power supply and wiring", sortOrder: 4 },
  { type: "by_others", text: "Landlord / property manager — wall penetration approval and coordination", sortOrder: 5 },
];

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
