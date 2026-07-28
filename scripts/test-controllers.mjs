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
  ["vgc50x", "vgc031"]
);
assert.deepEqual(
  Array.from(registry.skeletons, (adapter) => adapter.id),
  ["vgc083a", "vgc083b", "vgc083c", "vgc094"]
);

const vgc50xIdentity = registry.identify(
  "VGC501,398-481,1784,1.08,1.0",
  { probeAdapterId: "vgc50x", command: "AYT" }
);
assert.equal(vgc50xIdentity.controller, "VGC501");
assert.equal(vgc50xIdentity.adapterId, "vgc50x");

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
assert.equal(registry.get("vgc083c").probeSteps.length, 0);

console.log("Controller adapter tests passed.");
