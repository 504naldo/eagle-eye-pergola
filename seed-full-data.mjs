import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);
console.log("Connected. Running full data seed...\n");

// ── 1. Find or create owner user ─────────────────────────────────────────────
const [userRows] = await conn.execute("SELECT id FROM users LIMIT 1");
let userId;
if (userRows.length > 0) {
  userId = userRows[0].id;
  console.log(`✓ Using existing user id=${userId}`);
} else {
  const [r] = await conn.execute(
    "INSERT INTO users (openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())",
    ["seed-owner", "Ranaldo Daniels", "ranaldo@eagleeyemgmt.com", "seed", "admin"]
  );
  userId = r.insertId;
  console.log(`✓ Created seed user id=${userId}`);
}

// ── 2. Upsert Milestones project ─────────────────────────────────────────────
const PROJECT_SUMMARY = `Eagle Eye Management Services has been engaged to develop a pre-fabrication concept package for a commercial aluminum shading and enclosure system at the Milestones Grill + Bar patio, located within a strip mall in Abbotsford, British Columbia.

The proposed system is a lean-to aluminum pergola canopy spanning 58'-0" in width and 15'-8" in depth. The structure is wall-mounted at the rear — connecting directly to the building face via a concealed ledger bracket — eliminating all rear posts to preserve sightlines to the restaurant windows. Five front posts support the front fascia beam along the parking lot face.

The overhead shade system consists of a fixed aluminum slat roof, powder coated in Matte Black, with integrated LED string lighting. The patio is fully enclosed on three sides by a Lumin glass vertical glazing system — front face, left side, and right side — with the glass top rail integrated directly to the front fascia beam for a weathertight, seamless connection.

This package is prepared for estimating and concept review purposes only. All dimensions are preliminary and subject to field verification. All structural connections are subject to review and stamping by a licensed structural engineer prior to fabrication and permit submission.

Prepared by: Ranaldo Daniels | Eagle Eye Management Services`;

const [existingProjects] = await conn.execute(
  "SELECT id FROM projects WHERE projectName = ? AND userId = ? LIMIT 1",
  ["Milestones Grill + Bar — Abbotsford, BC", userId]
);

let projectId;
if (existingProjects.length > 0) {
  projectId = existingProjects[0].id;
  await conn.execute(
    "UPDATE projects SET clientName=?, location=?, status=?, notes=?, updatedAt=NOW() WHERE id=?",
    ["Milestones Restaurants Inc.", "Abbotsford, BC — Strip Mall Patio", "in_review", PROJECT_SUMMARY, projectId]
  );
  console.log(`✓ Updated Milestones project id=${projectId}`);
} else {
  const [r] = await conn.execute(
    `INSERT INTO projects (userId, projectName, clientName, location, status, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [userId, "Milestones Grill + Bar — Abbotsford, BC", "Milestones Restaurants Inc.",
     "Abbotsford, BC — Strip Mall Patio", "in_review", PROJECT_SUMMARY]
  );
  projectId = r.insertId;
  console.log(`✓ Created Milestones project id=${projectId}`);
}

// ── 3. Upsert project parameters ─────────────────────────────────────────────
await conn.execute("DELETE FROM project_params WHERE projectId = ?", [projectId]);
await conn.execute(
  `INSERT INTO project_params
     (projectId, widthFt, depthFt, heightFt, postCount, postSpacingFt,
      slatType, slatSpacingIn, glassFront, glassLeft, glassRight,
      connectionType, finishColor, ledLighting, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
  [projectId, "58.00", "15.67", "10.00", 5, "14.50",
   "fixed", "4.00", 1, 1, 1, "wall_mounted_lean_to", "Matte Black", 1]
);
console.log("✓ Project parameters seeded (58' × 15'-8\", 5 front posts, fixed slats, Lumin glass 3 sides)");

// ── 4. Seed checklist items ───────────────────────────────────────────────────
await conn.execute("DELETE FROM checklist_items WHERE projectId = ?", [projectId]);
const checklistItems = [
  // Overall Dimensions
  { cat: "Overall Dimensions", label: "Confirm total patio width: 58'-0\" (17,678 mm)", order: 1 },
  { cat: "Overall Dimensions", label: "Confirm total patio depth: 15'-8\" (4,775 mm)", order: 2 },
  { cat: "Overall Dimensions", label: "Confirm clear height under existing building soffit at rear wall", order: 3 },
  { cat: "Overall Dimensions", label: "Measure distance from building face to proposed front post line", order: 4 },
  { cat: "Overall Dimensions", label: "Confirm finished floor level — note any slope or drain locations", order: 5 },

  // Heights & Clearances
  { cat: "Heights & Clearances", label: "Measure underside of existing building soffit / awning at rear", order: 6 },
  { cat: "Heights & Clearances", label: "Confirm minimum clear height required for occupancy / code compliance", order: 7 },
  { cat: "Heights & Clearances", label: "Identify any overhead obstructions (signage, lighting, HVAC units)", order: 8 },
  { cat: "Heights & Clearances", label: "Confirm wall ledger connection height on building face", order: 9 },

  // Building Wall & Connection
  { cat: "Building Wall & Connection", label: "Identify building wall construction type (CMU, wood frame, steel stud)", order: 10 },
  { cat: "Building Wall & Connection", label: "Confirm no windows or openings conflict with wall ledger zone", order: 11 },
  { cat: "Building Wall & Connection", label: "Confirm landlord / building owner approval for wall penetrations", order: 12 },
  { cat: "Building Wall & Connection", label: "Locate and mark any existing wall utilities (electrical, plumbing, gas)", order: 13 },

  // Post Locations
  { cat: "Post Locations", label: "Mark 5 front post locations on slab — confirm no conflicts with paving joints or utilities", order: 14 },
  { cat: "Post Locations", label: "Confirm slab thickness and condition at each post base location", order: 15 },
  { cat: "Post Locations", label: "Confirm no underground utilities below post base locations", order: 16 },

  // Utilities & Coordination
  { cat: "Utilities & Coordination", label: "Locate existing patio electrical outlets and lighting circuits", order: 17 },
  { cat: "Utilities & Coordination", label: "Confirm LED string light power source location and capacity", order: 18 },
  { cat: "Utilities & Coordination", label: "Identify any gas lines, water lines, or drains in patio zone", order: 19 },
  { cat: "Utilities & Coordination", label: "Confirm permit requirements with local authority (City of Abbotsford)", order: 20 },

  // Lumin Glass Enclosure
  { cat: "Lumin Glass Enclosure", label: "Confirm Lumin glass panel layout — front, left side, and right side", order: 21 },
  { cat: "Lumin Glass Enclosure", label: "Confirm glass top rail connection to fascia beam — coordinate with Lumin supplier", order: 22 },
  { cat: "Lumin Glass Enclosure", label: "Confirm door / opening locations in Lumin glass front panel", order: 23 },
  { cat: "Lumin Glass Enclosure", label: "Confirm glass corner condition detail at front/side intersections", order: 24 },
];

for (const item of checklistItems) {
  await conn.execute(
    "INSERT INTO checklist_items (projectId, category, label, checked, fieldNote, sortOrder) VALUES (?, ?, ?, 0, NULL, ?)",
    [projectId, item.cat, item.label, item.order]
  );
}
console.log(`✓ Seeded ${checklistItems.length} checklist items across 5 categories`);

// ── 5. Seed scope items ───────────────────────────────────────────────────────
await conn.execute("DELETE FROM scope_items WHERE projectId = ?", [projectId]);
const scopeItems = [
  // Inclusions
  { type: "inclusion", text: "Supply and install prefabricated aluminum lean-to pergola structure (front posts + wall-mounted rear ledger)", order: 1 },
  { type: "inclusion", text: "5 × front posts — 100×100 aluminum SHS, matte black powder coat, base plate and anchor bolts", order: 2 },
  { type: "inclusion", text: "Front fascia beam — 150×75 aluminum RHS, matte black powder coat, full 58'-0\" span", order: 3 },
  { type: "inclusion", text: "Rear wall ledger beam — bolted to building face via concealed bracket, no rear posts", order: 4 },
  { type: "inclusion", text: "Fixed aluminum slat roof system — full 58'-0\" × 15'-8\" coverage, 4\" slat spacing", order: 5 },
  { type: "inclusion", text: "Lumin glass vertical enclosure — front face, left side, and right side (3 sides total)", order: 6 },
  { type: "inclusion", text: "Lumin glass top rail integrated connection to front fascia beam — weathertight sealant joint", order: 7 },
  { type: "inclusion", text: "Post base plates — 200×200×12mm aluminum, chemical anchor bolts into existing concrete slab", order: 8 },
  { type: "inclusion", text: "LED string lighting integrated into slat roof system — power connection by others", order: 9 },
  { type: "inclusion", text: "Matte black powder coat finish on all aluminum structural components", order: 10 },
  { type: "inclusion", text: "Shop drawings, fabrication package, and field coordination", order: 11 },

  // Exclusions
  { type: "exclusion", text: "Licensed structural engineering and stamped connection drawings — by others", order: 1 },
  { type: "exclusion", text: "Building permit fees and permit application — by others", order: 2 },
  { type: "exclusion", text: "Concrete slab repair, levelling, coring, or replacement", order: 3 },
  { type: "exclusion", text: "Electrical rough-in, conduit, wiring, and panel connections for LED lighting", order: 4 },
  { type: "exclusion", text: "Waterproofing membrane or drainage system at wall ledger connection", order: 5 },
  { type: "exclusion", text: "Patio heaters, signage, furniture, or other tenant improvements", order: 6 },
  { type: "exclusion", text: "Any work inside the building or modifications to the building envelope", order: 7 },
  { type: "exclusion", text: "Lumin glass supply and installation — separate contract with Lumin supplier", order: 8 },

  // Assumptions
  { type: "assumption", text: "Existing concrete slab is structurally adequate to receive post base anchors without additional reinforcement", order: 1 },
  { type: "assumption", text: "Building wall is structurally adequate to receive wall ledger without additional blocking or reinforcement", order: 2 },
  { type: "assumption", text: "All field dimensions will be verified prior to fabrication — drawing dimensions are preliminary and parametric", order: 3 },
  { type: "assumption", text: "Lumin glass system is supplied and installed by Lumin under a separate contract — this scope covers the aluminum pergola frame only", order: 4 },
  { type: "assumption", text: "Landlord and building owner approval for wall penetrations will be obtained prior to fabrication commencement", order: 5 },
  { type: "assumption", text: "No underground utilities conflict with proposed post base locations", order: 6 },

  // By Others
  { type: "by_others", text: "Licensed structural engineer — review, design, and stamp all connection details and anchor calculations", order: 1 },
  { type: "by_others", text: "City of Abbotsford — building permit review and approval", order: 2 },
  { type: "by_others", text: "Lumin glass supplier — supply and install vertical glass enclosure panels on all three sides", order: 3 },
  { type: "by_others", text: "Electrical contractor — LED lighting power supply, wiring, and panel connection", order: 4 },
  { type: "by_others", text: "Landlord / property manager — written approval for all wall penetrations and structural connections to building", order: 5 },
  { type: "by_others", text: "General contractor or owner — field verification of all dimensions prior to fabrication", order: 6 },
];

for (const item of scopeItems) {
  await conn.execute(
    "INSERT INTO scope_items (projectId, type, text, sortOrder) VALUES (?, ?, ?, ?)",
    [projectId, item.type, item.text, item.order]
  );
}
console.log(`✓ Seeded ${scopeItems.length} scope items (inclusions, exclusions, assumptions, by-others)`);

await conn.end();

console.log("\n✅ Full data seed complete!");
console.log(`   Project ID: ${projectId}`);
console.log(`   Checklist: ${checklistItems.length} items across 5 categories`);
console.log(`   Scope items: ${scopeItems.length} items`);
console.log(`   Project summary: Full narrative seeded`);
console.log(`\n   → Open /project/${projectId} to review all tabs and export the PDF package.`);
