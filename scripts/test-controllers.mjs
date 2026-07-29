import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const source = fs.readFileSync(path.resolve("public", "controllers.js"), "utf8");
const context = {};
vm.runInNewContext(source, context, { filename: "public/controllers.js" });

const registry = context.VGCControllerRegistry;
assert.ok(registry, "controller registry should be exported");
assert.deepEqual(
  Array.from(registry.implemented, (adapter) => adapter.id),
  ["vgc50x", "vgc031", "vgc083a", "vgc083b", "vgc083c", "vgc094"]
);
assert.deepEqual(
  Array.from(registry.skeletons, (adapter) => adapter.id),
  [],
  "all registered adapters are now implemented"
);

// --- VGC50x -----------------------------------------------------------------
const vgc50xIdentity = registry.identify(
  "VGC501,398-481,1784,1.08,1.0",
  { probeAdapterId: "vgc50x", command: "AYT" }
);
assert.equal(vgc50xIdentity.controller, "VGC501");
assert.equal(vgc50xIdentity.adapterId, "vgc50x");

// --- VGC031 -----------------------------------------------------------------
assert.equal(
  registry.identify("*01_05041-00", { probeAdapterId: "vgc50x", command: "AYT" }),
  null,
  "VGC031-like responses must not match outside its probe/profile"
);
const vgc031Identity = registry.identify(
  "*01_05041-00",
  { probeAdapterId: "vgc031", command: "#01VER" }
);
assert.equal(vgc031Identity.controller, "VGC031");
assert.equal(vgc031Identity.model, "399-570");
assert.equal(vgc031Identity.address, "01");
assert.equal(vgc031Identity.firmware, "05041-00");
assert.equal(
  registry.identify("*01_01961-113", { probeAdapterId: "vgc031", command: "#01VER" }),
  null,
  "a VGC083-style version response must not be mislabeled as VGC031"
);

const measurements = registry.parseMeasurements(
  "*01_7.60E+02",
  { activeAdapterId: "vgc031", command: "#01RD" }
);
assert.equal(measurements.length, 1);
assert.equal(measurements[0].value, 760);
assert.equal(measurements[0].unit, "Torr");
assert.equal(
  registry.parseMeasurements("*01_7.60E+02", { activeAdapterId: "vgc031", command: "#01VER" }).length,
  0
);

const vgc031 = registry.get("vgc031");
assert.equal(vgc031.manualDefaults.baudRate, 19200);
assert.ok(vgc031.commands.some((item) => item.mnemonic === "RD" && item.risk === "safe"));
assert.ok(vgc031.commands.some((item) => item.mnemonic === "FAC" && item.risk === "danger"));

// --- VGC083 A/B (hot cathode) ----------------------------------------------
const hotProbe = { probeAdapterId: "vgc083a", command: "#01RF" };
const vgc083ab = registry.identify("*01 FIL SEL1", hotProbe);
assert.ok(vgc083ab, "VGC083A/B identifies from the filament-selection read");
assert.equal(vgc083ab.adapterId, "vgc083a");
assert.equal(vgc083ab.controller, "VGC083A/B");
assert.equal(vgc083ab.model, "399-700 / 399-701");
assert.equal(
  registry.identify("*01 FIL SEL2", { probeAdapterId: "vgc031", command: "#01VER" }),
  null,
  "a filament read must not claim outside the VGC083 hot-cathode probe"
);
// The shared IG status read is a family signal, not a model signal: it must not
// be claimed as A/B during the hot-cathode filament probe.
assert.equal(
  registry.identify("*01 0 IG OFF", hotProbe),
  null,
  "VGC083A/B must claim only the filament read, never the shared IG status"
);
// VGC083B is a wire-identical alias and never self-claims.
assert.equal(registry.get("vgc083b").identify("*01 FIL SEL1", { probeAdapterId: "vgc083b", command: "#01RF" }), null);
assert.equal(registry.get("vgc083b").implementation, "complete");

// --- VGC083C (cold cathode) -------------------------------------------------
const coldProbe = { probeAdapterId: "vgc083c", command: "#01IGS" };
const vgc083c = registry.identify("*01 0 IG OFF", coldProbe);
assert.ok(vgc083c, "VGC083C identifies from the gated IG status read");
assert.equal(vgc083c.adapterId, "vgc083c");
assert.equal(vgc083c.controller, "VGC083C");
assert.equal(vgc083c.model, "399-702");
assert.equal(registry.identify("*01 1 IG ON ", coldProbe).controller, "VGC083C");
// Gating: a hot-cathode unit answering the same IGS read during a DIFFERENT
// probe must never be mislabeled as a cold-cathode VGC083C.
assert.equal(
  registry.identify("*01 0 IG OFF", { probeAdapterId: "vgc083a", command: "#01RF" }),
  null,
  "VGC083C must only claim IG status during its own probe"
);
assert.equal(
  registry.identify("*01 0 IG OFF", { probeAdapterId: "vgc50x", command: "AYT" }),
  null,
  "VGC083C must not claim IG status seen under an unrelated probe"
);

// --- VGC094 -----------------------------------------------------------------
const vgc094Identity = registry.identify(
  "VGC094,398-401,100,1.40,1.00",
  { probeAdapterId: "vgc50x", command: "AYT" }
);
assert.ok(vgc094Identity, "VGC094 identifies from AYT even under the shared handshake probe");
assert.equal(vgc094Identity.adapterId, "vgc094");
assert.equal(vgc094Identity.controller, "VGC094");
assert.equal(vgc094Identity.model, "398-401");
assert.equal(vgc094Identity.serial, "100");
assert.equal(vgc094Identity.firmware, "1.40");
assert.equal(
  registry.get("vgc094").identify("VGC501,398-481,1784,1.08,1.0", {}),
  null,
  "VGC094 must never claim a VGC50x identity response"
);
assert.equal(
  registry.get("vgc50x").identify("VGC094,398-401,100,1.40,1.00"),
  null,
  "VGC50x must never claim a VGC094 identity response"
);
assert.equal(
  registry.get("vgc094").identify("VGC094,000-000,1,1,1", {}),
  null,
  "VGC094 requires the documented 398-401 part number"
);

// --- Measurement parsing ----------------------------------------------------
const hot1 = registry.parseMeasurements("*01 1.53E-06", { activeAdapterId: "vgc083a", command: "#01RDIG" });
assert.equal(hot1.length, 1);
assert.equal(hot1[0].channel, 1);
assert.equal(hot1[0].status, 0);
assert.equal(hot1[0].value, 1.53e-6);
const hotOff = registry.parseMeasurements("*01 1.10E+03", { activeAdapterId: "vgc083a", command: "#01RDIG" });
assert.equal(hotOff[0].status, 2, "the 1.10E+03 sentinel maps to over-range");
// Only the exact 1.10E+03 sentinel is over-range. A reading far above 1100 is a
// genuine pressure when the controller's front-panel unit is micron or Pa, so it
// must not be mis-flagged (regression guard for a former value >= 1100 test).
assert.equal(
  registry.parseMeasurements("*01 7.60E+05", { activeAdapterId: "vgc083c", command: "#01RDCG1" })[0].status,
  0,
  "a large non-Torr reading is not the over-range sentinel"
);
assert.equal(
  registry.parseMeasurements("*01 2.30E+00", { activeAdapterId: "vgc083a", command: "#01RDIGV" }).length,
  0,
  "diagnostic reads (filament voltage) are not channel pressures"
);
assert.equal(
  registry.parseMeasurements("*01 7.60E+02", { activeAdapterId: "vgc083c", command: "#01RDCG2" })[0].channel,
  3
);

const prx = registry.parseMeasurements(
  "0,1.5E-06,0,7.5E+02,4,0.0E+00,5,0.0E+00",
  { activeAdapterId: "vgc094", command: "PRX" }
);
assert.equal(prx.length, 4, "VGC094 PRX yields four channels");
assert.deepEqual(Array.from(prx, (s) => s.channel), [1, 2, 3, 4]);
assert.equal(prx[3].status, 5);
assert.equal(
  registry.parseMeasurements("0,1.5E-06", { activeAdapterId: "vgc094", command: "PA2" })[0].channel,
  2
);
assert.equal(
  registry.parseMeasurements("0,1.5E-06,0,7.5E+02", { activeAdapterId: "vgc094", command: "PRX" }).length,
  0,
  "a partial VGC094 frame is ignored"
);

// --- Command dictionaries ---------------------------------------------------
const hotCommands = registry.get("vgc083a").commands;
assert.ok(hotCommands.some((c) => c.mnemonic === "RDIG" && c.risk === "safe"));
assert.ok(hotCommands.some((c) => c.mnemonic === "IG1" && c.risk === "danger"));
assert.ok(hotCommands.some((c) => c.mnemonic === "TZCGn" && c.risk === "danger"));
assert.ok(hotCommands.some((c) => c.mnemonic === "RF"), "hot-cathode dictionary includes the filament read");
assert.equal(registry.get("vgc083a").commands, registry.get("vgc083b").commands, "A and B share one dictionary");

const coldCommands = registry.get("vgc083c").commands;
assert.ok(coldCommands.some((c) => c.mnemonic === "RDIG" && c.risk === "safe"));
assert.ok(!coldCommands.some((c) => c.mnemonic === "RF"), "cold-cathode VGC083C has no filament commands");
assert.ok(!coldCommands.some((c) => c.mnemonic === "DG1"), "cold-cathode VGC083C has no degas commands");

// Calibration examples must separate fields with a real space (the manual's
// "_"), never a literal underscore, or the ASCII frame the UI transmits is
// malformed and the controller rejects it.
for (const adapterId of ["vgc083a", "vgc083c"]) {
  for (const mnemonic of ["TZCGn", "TSCGn"]) {
    const entry = registry.get(adapterId).commands.find((c) => c.mnemonic === mnemonic);
    assert.ok(entry, `${adapterId} has ${mnemonic}`);
    assert.ok(
      !entry.example.includes("_") && entry.example.includes(" "),
      `${adapterId} ${mnemonic} example uses a space, not an underscore`
    );
    assert.ok(!entry.syntax.includes("_"), `${adapterId} ${mnemonic} syntax uses a space, not an underscore`);
  }
}

const vgc094Commands = registry.get("vgc094").commands;
assert.equal(registry.get("vgc094").manualDefaults.baudRate, 115200);
assert.ok(vgc094Commands.some((c) => c.mnemonic === "AYT" && c.risk === "safe"));
assert.ok(vgc094Commands.some((c) => c.mnemonic === "PRX" && c.risk === "safe"));
assert.ok(vgc094Commands.some((c) => c.mnemonic === "SEN" && c.risk === "danger"));
assert.ok(vgc094Commands.some((c) => c.mnemonic === "SP1" && c.risk === "danger"));
assert.ok(vgc094Commands.some((c) => c.mnemonic === "GAS" && c.risk === "caution"));

// --- Safety: every automatic probe / verify read is read-only ---------------
for (const adapter of registry.implemented) {
  const dangerTokens = new Set(
    (adapter.commands || []).filter((c) => c.risk === "danger").flatMap((c) => [
      c.mnemonic.toUpperCase(),
      (c.example || "").toUpperCase()
    ])
  );
  const steps = [...(adapter.probeSteps || []), ...(adapter.verifyStep ? [adapter.verifyStep] : [])];
  for (const step of steps) {
    const cmd = (step.command || "").toUpperCase();
    assert.ok(
      !dangerTokens.has(cmd),
      `${adapter.id} automatic step "${cmd}" must not be a danger command`
    );
  }
}

console.log("Controller adapter tests passed.");
