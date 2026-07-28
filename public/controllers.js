(() => {
  "use strict";

  const command = (
    mnemonic,
    name,
    category,
    syntax,
    example,
    description,
    risk = "safe",
    note = "",
    response = ""
  ) => ({
    mnemonic,
    name,
    category,
    syntax,
    example,
    query: example,
    description,
    risk,
    note,
    response,
    guided: false
  });

  const vgc50x = {
    id: "vgc50x",
    family: "VGC50x",
    label: "VGC501 / VGC502 / VGC503",
    implementation: "complete",
    manualDefaults: { baudRate: 115200, dataBits: 8, parity: "none", stopBits: 1 },
    probeSteps: [
      {
        text: "AYT\r",
        command: "AYT",
        label: "Identity probe · VGC50x AYT",
        timeoutMs: 900
      }
    ],
    verifyStep: null,
    identify(line) {
      const parts = line.split(",");
      if (!/^VGC50[123]$/i.test(parts[0] || "")) return null;
      return {
        adapterId: "vgc50x",
        controller: parts[0].toUpperCase(),
        model: parts[1] || "",
        serial: parts[2] || "",
        firmware: parts[3] || "",
        hardware: parts[4] || ""
      };
    },
    parseMeasurement() {
      return [];
    }
  };

  const vgc031Commands = [
    command("RD", "Read pressure", "Measurement", "#aaRD", "#01RD", "Reads the current pressure in Torr.", "safe", "The factory address is 01. Replace 01 if the controller address was changed.", "*aa_y.yyEzpp"),
    command("VER", "Software version", "General", "#aaVER", "#01VER", "Reads the controller firmware part number and revision.", "safe", "This safe read is used by automatic controller identification.", "*aa_mmnnv-vv"),
    command("RL+", "Relay 1 on-below point", "Switching", "#aaRL+", "#01RL+", "Reads the pressure where relay 1 turns on below the setpoint.", "safe", "", "*aa_y.yyEzpp"),
    command("RL-", "Relay 1 off-above point", "Switching", "#aaRL-", "#01RL-", "Reads the pressure where relay 1 turns off above the setpoint.", "safe", "", "*aa_y.yyEzpp"),
    command("RH+", "Relay 2 on-below point", "Switching", "#aaRH+", "#01RH+", "Reads the pressure where relay 2 turns on below the setpoint.", "safe", "", "*aa_y.yyEzpp"),
    command("RH-", "Relay 2 off-above point", "Switching", "#aaRH-", "#01RH-", "Reads the pressure where relay 2 turns off above the setpoint.", "safe", "", "*aa_y.yyEzpp"),
    command("SA", "Set address", "General", "#aaSAbb", "#01SA20", "Sets the RS485 address offset and device address.", "danger", "Takes effect after reset or a power cycle. Confirm the intended bus address before sending.", "*aa_PROGM_OK"),
    command("TS", "Set span", "Gauge", "#aaTSy.yyEzpp", "#01TS7.60E+02", "Sets the atmosphere/span calibration point.", "danger", "Calibration changes the reported pressure. Follow the manual procedure.", "*aa_PROGM_OK"),
    command("TZ", "Set zero", "Gauge", "#aaTZy.yyEzpp", "#01TZ0.00E-04", "Sets the vacuum/zero calibration point.", "danger", "Calibration changes the reported pressure. Follow the manual procedure.", "*aa_PROGM_OK"),
    command("SL+", "Set relay 1 on-below", "Switching", "#aaSL+y.yyEzpp", "#01SL+4.00E+02", "Sets relay 1's on-below pressure point.", "danger", "Changes relay behavior connected to external equipment.", "*aa_PROGM_OK"),
    command("SL-", "Set relay 1 off-above", "Switching", "#aaSL-y.yyEzpp", "#01SL-5.00E+02", "Sets relay 1's off-above pressure point.", "danger", "Changes relay behavior connected to external equipment.", "*aa_PROGM_OK"),
    command("SH+", "Set relay 2 on-below", "Switching", "#aaSH+y.yyEzpp", "#01SH+4.00E+02", "Sets relay 2's on-below pressure point.", "danger", "Changes relay behavior connected to external equipment.", "*aa_PROGM_OK"),
    command("SH-", "Set relay 2 off-above", "Switching", "#aaSH-y.yyEzpp", "#01SH-5.00E+02", "Sets relay 2's off-above pressure point.", "danger", "Changes relay behavior connected to external equipment.", "*aa_PROGM_OK"),
    command("FAC", "Restore factory defaults", "General", "#aaFAC", "#01FAC", "Restores all factory-programmed settings.", "danger", "This resets controller configuration after reset or power cycle.", "*aa_PROGM_OK"),
    command("SB", "Set baud rate", "General", "#aaSByyyyy", "#01SB19200", "Sets the RS232/RS485 baud rate.", "danger", "Takes effect after reset or a power cycle; reconnect at the new rate.", "*aa_PROGM_OK"),
    command("SPN", "Set 8-N-1 framing", "General", "#aaSPN", "#01SPN", "Sets no parity and 8 data bits.", "danger", "Takes effect after reset or a power cycle.", "*aa_PROGM_OK"),
    command("SPO", "Set 7-O-1 framing", "General", "#aaSPO", "#01SPO", "Sets odd parity and 7 data bits.", "danger", "Takes effect after reset or a power cycle.", "*aa_PROGM_OK"),
    command("SPE", "Set 7-E-1 framing", "General", "#aaSPE", "#01SPE", "Sets even parity and 7 data bits.", "danger", "Takes effect after reset or a power cycle.", "*aa_PROGM_OK"),
    command("RST", "Reset controller", "General", "#aaRST", "#01RST", "Resets the controller so pending communications changes take effect.", "danger", "Interrupts normal operation and may activate pending configuration changes.", "No response")
  ].sort((a, b) => a.mnemonic.localeCompare(b.mnemonic));

  const vgc031 = {
    id: "vgc031",
    family: "VGC031",
    label: "VGC031",
    implementation: "complete",
    manualDefaults: { baudRate: 19200, dataBits: 8, parity: "none", stopBits: 1 },
    commands: vgc031Commands,
    probeSteps: [
      {
        text: "#01VER\r",
        command: "#01VER",
        label: "Identity probe · VGC031 VER (address 01)",
        timeoutMs: 700
      }
    ],
    verifyStep: {
      text: "#01RD\r",
      command: "#01RD",
      label: "Verification · VGC031 pressure read"
    },
    identify(line, context) {
      const probingThisAdapter =
        context.probeAdapterId === "vgc031" && context.command === "#01VER";
      const activeThisAdapter =
        context.activeAdapterId === "vgc031" && context.command === "#01VER";
      if (!probingThisAdapter && !activeThisAdapter) return null;
      // 05041 is the VGC031 software part number shown by the manual's VER
      // response. Requiring it avoids claiming another Mini-Convectron-
      // compatible controller that happens to implement the same protocol.
      const match = line.match(/^\*([0-9A-F]{2})[ _]?(05041-\d{2})\s*$/i);
      if (!match) return null;
      return {
        adapterId: "vgc031",
        controller: "VGC031",
        model: "399-570",
        serial: "",
        firmware: match[2],
        hardware: "",
        address: match[1].toUpperCase()
      };
    },
    parseMeasurement(line, context) {
      if (context.activeAdapterId !== "vgc031" || context.command !== "#01RD") return [];
      const match = line.match(/^\*([0-9A-F]{2})[ _]([+-]?(?:\d+(?:\.\d*)?|\.\d+)E[+-]\d{2})\s*$/i);
      if (!match) return [];
      return [{
        channel: 1,
        status: 0,
        value: Number(match[2]),
        rawValue: match[2],
        unit: "Torr"
      }];
    }
  };

  function skeleton(id, family, label, notes, defaults = {}) {
    return Object.freeze({
      id,
      family,
      label,
      implementation: "skeleton",
      manualDefaults: {
        baudRate: 19200,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        ...defaults
      },
      notes,
      commands: [],
      probeSteps: [],
      verifyStep: null,
      identify() {
        return null;
      },
      parseMeasurement() {
        return [];
      }
    });
  }

  // These adapters intentionally do not probe yet. Their empty command and parser
  // hooks keep future work isolated from the implemented VGC50x/VGC031 protocols.
  const adapters = [
    vgc50x,
    vgc031,
    skeleton("vgc083a", "VGC083", "VGC083A", "Add the selected INFICON/GP serial mode, a non-ambiguous model signature, and channel parsers."),
    skeleton("vgc083b", "VGC083", "VGC083B", "Share VGC083 framing helpers, then add a response signature that distinguishes model B."),
    skeleton("vgc083c", "VGC083", "VGC083C", "Confirm VGC083C framing and version response against its manual before enabling probes."),
    skeleton("vgc094", "VGC094", "VGC094", "Implement the controller/installed-board transport after selecting the applicable plug-in interface.")
  ];

  const byId = Object.fromEntries(adapters.map((adapter) => [adapter.id, adapter]));

  const api = {
    adapters: Object.freeze(adapters),
    implemented: Object.freeze(adapters.filter((adapter) => adapter.implementation === "complete")),
    skeletons: Object.freeze(adapters.filter((adapter) => adapter.implementation === "skeleton")),
    get(id) {
      return byId[id] || null;
    },
    identify(line, context = {}) {
      for (const adapter of adapters) {
        const identity = adapter.identify(line, context);
        if (identity) return identity;
      }
      return null;
    },
    parseMeasurements(line, context = {}) {
      const adapter = byId[context.activeAdapterId];
      return adapter ? adapter.parseMeasurement(line, context) : [];
    }
  };

  Object.freeze(api);
  (typeof window === "undefined" ? globalThis : window).VGCControllerRegistry = api;
})();
