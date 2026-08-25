/**
 * Shrinks public/models. Run after adding or replacing a model:
 *
 *   node scripts/optimize-models.mjs [--dry]
 *
 * The two big wins here are dropping animation clips nothing plays and
 * resampling the keyframes of the ones that survive. What it deliberately does
 * NOT do matters more, because every one of these was tried and reverted:
 *
 *  - No quantize. KHR_mesh_quantization writes the dequantization into the
 *    node's transform, and Instanced.tsx reads `source.geometry` straight out
 *    of the loaded scene to build one InstancedMesh per model. That path never
 *    sees the node, so the vertices stay in integer space and every building
 *    in the vale renders as a melted blob. It looks like a catastrophe and it
 *    is a one-line cause.
 *  - No Draco or meshopt, for the same reason plus a second: both need a
 *    decoder wired into GLTFLoader, and drei pulls Draco's from a Google CDN.
 *  - No join, flatten, palette or instance. The renderer hides individual
 *    meshes BY NAME (the patrons' unused weapons, the wizard's second
 *    spellbook and staff), and all four of those transforms rename or merge.
 *  - No simplify. These are low-poly models where a dropped vertex is a dent.
 */
import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, resample } from "@gltf-transform/functions";
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const MODELS = path.join(process.cwd(), "public", "models");

/**
 * The clips the code asks for by name, in Wizard.tsx and Interior.tsx. The
 * KayKit characters ship 76 each, a full adventurer's worth of attacks, blocks,
 * deaths and dodges, and that is most of their three and a half megabytes.
 */
const KEEP_CLIPS = {
  "Mage.glb": ["Idle", "Walking_A", "Sit_Chair_Down", "Sit_Chair_Idle", "Sit_Chair_StandUp"],
  "Knight.glb": ["Idle"],
  "Rogue.glb": ["Idle"],
  "Barbarian.glb": ["Idle"],
};

/** Names the renderer looks up, which no transform may cost us. */
const NAMES_THE_CODE_NEEDS = {
  "Mage.glb": ["Spellbook", "Spellbook_open", "2H_Staff"],
  "Knight.glb": [
    "1H_Sword_Offhand",
    "Badge_Shield",
    "Rectangle_Shield",
    "Spike_Shield",
    "2H_Sword",
  ],
  "Barbarian.glb": ["1H_Axe_Offhand", "Barbarian_Round_Shield", "1H_Axe", "2H_Axe"],
  "Rogue.glb": ["Knife_Offhand", "1H_Crossbow", "2H_Crossbow", "Knife", "Throwable"],
};

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const meshNodes = (doc) => doc.getRoot().listNodes().filter((n) => n.getMesh());
const nodeNames = (doc) => new Set(doc.getRoot().listNodes().map((n) => n.getName()));

const files = fs
  .readdirSync(MODELS)
  .filter((f) => f.endsWith(".glb") || f.endsWith(".gltf"))
  .sort();

let before = 0;
let after = 0;

for (const file of files) {
  const full = path.join(MODELS, file);
  const startBytes = fs.statSync(full).size;
  before += startBytes;

  let doc;
  try {
    doc = await io.read(full);
  } catch (err) {
    console.log(`skip ${file}: ${err.message.slice(0, 60)}`);
    after += startBytes;
    continue;
  }

  const meshesBefore = meshNodes(doc).length;

  const keep = KEEP_CLIPS[file];
  if (keep) {
    const all = doc.getRoot().listAnimations();
    const missing = keep.filter((n) => !all.some((a) => a.getName() === n));
    if (missing.length) {
      throw new Error(`${file}: no clip named ${missing.join(", ")}, refusing to trim`);
    }
    for (const anim of all) {
      if (!keep.includes(anim.getName())) anim.dispose();
    }
  }

  await doc.transform(dedup(), resample(), prune({ keepAttributes: false, keepLeaves: true }));

  if (meshNodes(doc).length !== meshesBefore) {
    throw new Error(`${file}: mesh count changed, refusing to write`);
  }
  const needed = NAMES_THE_CODE_NEEDS[file];
  if (needed) {
    const present = nodeNames(doc);
    const lost = needed.filter((n) => !present.has(n));
    if (lost.length) {
      throw new Error(`${file}: lost ${lost.join(", ")}, refusing to write`);
    }
  }

  if (!DRY) await io.write(full, doc);
  const endBytes = DRY ? startBytes : fs.statSync(full).size;
  after += endBytes;
  if (startBytes - endBytes > 100 * 1024) {
    console.log(
      `  ${file.padEnd(30)} ${Math.round(startBytes / 1024)}K -> ${Math.round(endBytes / 1024)}K`,
    );
  }
}

const mb = (b) => (b / 1048576).toFixed(1);
console.log(`\n${files.length} files: ${mb(before)}MB -> ${mb(after)}MB${DRY ? "  (dry run)" : ""}`);
