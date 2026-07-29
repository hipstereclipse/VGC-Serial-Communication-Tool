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
    addressed: true,
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
      // The VGC031 manual shows 05041-xx, while installed VGC031 units also
      // report the 002733-x software part number. Keep the accepted part
      // numbers explicit so another addressed controller with a generic VER
      // response cannot be mislabeled as a VGC031.
      const match = line.match(/^\*([0-9A-F]{2})[ _]?((?:05041|002733)-\d{1,2})\s*$/i);
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

  // -------------------------------------------------------------------------
  // VGC083 A / B / C — INFICON RS232 / RS485 command protocol (factory default
  // COMM TYPE). Frames are addressed: host commands begin with "#aa" (aa = the
  // two-digit hex address, factory default 01), normal responses begin with
  // "*aa", and error responses begin with "?aa". A single space (shown as "_"
  // in the manual) separates fields; frames end in CR. There is no ACK/ENQ
  // handshake. Pressure follows the controller's front-panel unit (Torr by
  // default) — the INFICON protocol has no command to read it back — and an
  // ion gauge that is off, a convection gauge that is over range, or an
  // unpowered analog input all report the 1.10E+03 over-range sentinel.
  //
  // A and B share identical firmware and are indistinguishable on the wire
  // (they differ only in the attached gauge head and degas method), so both
  // auto-identify as the combined "VGC083A/B" via the hot-cathode filament
  // read (#aaRF). C is a cold-cathode controller with no filament, degas, or
  // emission commands and is identified via #aaIGS, gated to its own probe so
  // it can never claim a hot-cathode unit that answers the same status read.
  // -------------------------------------------------------------------------

  // Numeric response body used by every VGC083 pressure/diagnostic read.
  const VGC083_NUMBER = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)E[+-]\\d{2}";
  const VGC083_VALUE = new RegExp(`^\\*[0-9A-F]{2}[ _](${VGC083_NUMBER})\\s*$`, "i");
  // #aaRDIG / #aaRDCG1 / #aaRDCG2 / #aaRDAI are the four pressure reads. RDAI
  // shares the CG2/alternate-gauge display channel (3) with RDCG2.
  const VGC083_PRESSURE_COMMAND = /^#[0-9A-F]{2}(RDIG|RDCG1|RDCG2|RDAI)$/i;
  const VGC083_PRESSURE_CHANNEL = { RDIG: 1, RDCG1: 2, RDCG2: 3, RDAI: 3 };

  function parseVgc083Pressure(line, context, adapterId) {
    if (context.activeAdapterId !== adapterId) return [];
    const which = (context.command || "").match(VGC083_PRESSURE_COMMAND);
    if (!which) return [];
    const match = line.match(VGC083_VALUE);
    if (!match) return [];
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return [];
    // 1.10E+03 (exactly 1100) is the documented "IG off / over range /
    // unpowered" sentinel. Match it exactly rather than a >= range: the
    // controller reports readings in its selected front-panel unit, so with a
    // micron or Pa unit a genuine reading well above 1100 must not be
    // mis-flagged as over range.
    const status = value === 1100 ? 2 : 0;
    return [{
      channel: VGC083_PRESSURE_CHANNEL[which[1].toUpperCase()],
      status,
      value,
      rawValue: match[1]
    }];
  }

  const vgc083HotCommands = [
    // Pressure reads
    command("RDIG", "Read ion gauge pressure", "Measurement", "#aaRDIG", "#01RDIG", "Reads the hot-cathode ion gauge (channel 1) pressure in the controller's selected unit.", "safe", "When the ion gauge is off or faulted the controller returns the 1.10E+03 over-range sentinel.", "*aa_y.yyEzpp"),
    command("RDCG1", "Read convection gauge 1", "Measurement", "#aaRDCG1", "#01RDCG1", "Reads convection gauge CG1 (channel 2) pressure.", "safe", "An unplugged or over-ranged gauge returns the 1.10E+03 sentinel.", "*aa_y.yyEzpp"),
    command("RDCG2", "Read convection gauge 2", "Measurement", "#aaRDCG2", "#01RDCG2", "Reads convection gauge CG2 (channel 3) pressure.", "safe", "An unplugged or over-ranged gauge returns the 1.10E+03 sentinel.", "*aa_y.yyEzpp"),
    command("RDAI", "Read analog input / alternate gauge", "Measurement", "#aaRDAI", "#01RDAI", "Reads the analog input (alternate gauge on the CG2 channel) pressure.", "safe", "Over range or an unpowered alternate gauge returns the 1.10E+03 sentinel.", "*aa_y.yyEzpp"),
    // Ion gauge status / diagnostics
    command("IGS", "Ion gauge on/off status", "Gauge", "#aaIGS", "#01IGS", "Reports whether the ion gauge is on and reading pressure.", "safe", "", "*aa_0_IG_OFF / *aa_1_IG_ON_"),
    command("RSIG", "Read ion gauge status", "Gauge", "#aaRSIG", "#01RSIG", "Reads the ion gauge status word: OK, over pressure, emission fail, low filament voltage, open filament, degas, low collector current, high filament current, or over temperature.", "safe", "Returns ?aa_INVALID_ when no ion gauge is connected.", "*aa_00_ST_OK … *aa_80_OVTMP"),
    command("SES", "Read emission current", "Gauge", "#aaSES", "#01SES", "Reads the active emission-current setting.", "safe", "", "*aa_0.1MA_EM / *aa_4.0MA_EM / *aa_10_MA_EM"),
    command("RDIGE", "Read emission current value", "Gauge", "#aaRDIGE", "#01RDIGE", "Reads the measured ion gauge emission current in amperes.", "safe", "Returns 0.00E+00 while the ion gauge is off.", "*aa_y.yyEzpp"),
    command("RDIGV", "Read filament voltage", "Gauge", "#aaRDIGV", "#01RDIGV", "Reads the ion gauge filament voltage in volts.", "safe", "Returns 0.00E+00 while the ion gauge is off.", "*aa_y.yyEzpp"),
    command("RDIGA", "Read filament current", "Gauge", "#aaRDIGA", "#01RDIGA", "Reads the ion gauge filament current in amperes.", "safe", "Returns 0.00E+00 while the ion gauge is off.", "*aa_y.yyEzpp"),
    command("RDIGC", "Read ion (collector) current", "Gauge", "#aaRDIGC", "#01RDIGC", "Reads the ion gauge collector current in amperes.", "safe", "While off the electrometer offset voltage is reported instead.", "*aa_y.yyEzpp"),
    command("RF", "Get filament selection", "Gauge", "#aaRF", "#01RF", "Reads which filament (1 or 2) is selected.", "safe", "This hot-cathode read is used by automatic controller identification.", "*aa_FIL SEL1 / *aa_FIL SEL2"),
    command("VER", "Read software version", "General", "#aaVER", "#01VER", "Reads the controller firmware part number and revision.", "safe", "Example response part number is 01306-11.", "*aa_mmmmm-vv"),
    // Relays
    command("RL", "Read all relay states", "Switching", "#aaRL", "#01RL", "Reads the state of all six setpoint relays as a hex bitmask.", "safe", "Example 003F means all six relays are energized.", "*aa_003F_RL_"),
    command("RLn", "Read one relay state", "Switching", "#aaRLn", "#01RL1", "Reads the on/off state of a single setpoint relay (n = 1…6).", "safe", "", "*aa_0_RL_OFF / *aa_1_RL_ON_"),
    command("DGS", "Read degas status", "Gauge", "#aaDGS", "#01DGS", "Reports whether ion gauge degas is on or off.", "safe", "", "*aa_0_DG_OFF / *aa_1_DG_ON_"),
    // Actions (danger)
    command("IG1", "Turn ion gauge on", "Gauge", "#aaIG1", "#01IG1", "Turns the hot-cathode ion gauge (filament emission) on.", "danger", "Energizes the ion gauge filament. Ensure the pressure is below the turn-on threshold and never turn on a tungsten filament near atmosphere.", "*aa_PROGM_OK"),
    command("IG0", "Turn ion gauge off", "Gauge", "#aaIG0", "#01IG0", "Turns the ion gauge off and clears IG error conditions.", "danger", "Deactivates the ion gauge emission.", "*aa_PROGM_OK"),
    command("DG1", "Turn degas on", "Gauge", "#aaDG1", "#01DG1", "Starts the ion gauge degas cycle.", "danger", "Degas dissipates significant power at the gauge. Requires the filament on and pressure below 5E-05 Torr.", "*aa_PROGM_OK"),
    command("DG0", "Turn degas off", "Gauge", "#aaDG0", "#01DG0", "Stops the ion gauge degas cycle.", "danger", "Changes ion gauge operating state.", "*aa_PROGM_OK"),
    command("SE", "Set emission current", "Gauge", "#aaSEy", "#01SE1", "Sets the emission current: y = 0 (100 µA), 1 (4 mA), or 2 (10 mA).", "danger", "Changes ion gauge operating point. Not accepted while in automatic emission mode.", "*aa_PROGM_OK"),
    command("SF", "Set filament", "Gauge", "#aaSFy", "#01SF1", "Selects the active filament: y = 1 (filament 1) or 2 (filament 2).", "danger", "Switches the active filament on a dual-filament gauge.", "*aa_PROGM_OK"),
    command("TZCGn", "Set convection gauge zero", "Gauge", "#aaTZCGn value", "#01TZCG1 0", "Sets the vacuum/zero calibration point for CG1 or CG2 (n = 1 or 2).", "danger", "Calibration changes the reported pressure. Evacuate below 0.1 mTorr and follow the manual procedure.", "*aa_PROGM_OK"),
    command("TSCGn", "Set convection gauge span", "Gauge", "#aaTSCGn y.yyEzpp", "#01TSCG1 7.60E+02", "Sets the atmosphere/span calibration point for CG1 or CG2 (n = 1 or 2).", "danger", "Calibration changes the reported pressure. Follow the manual procedure.", "*aa_PROGM_OK")
  ].sort((a, b) => a.mnemonic.localeCompare(b.mnemonic));

  const vgc083ColdCommands = [
    command("RDIG", "Read cold cathode pressure", "Measurement", "#aaRDIG", "#01RDIG", "Reads the cold-cathode ion gauge (channel 1) pressure in the controller's selected unit.", "safe", "When the cold cathode is off or faulted the controller returns the 1.10E+03 over-range sentinel.", "*aa_y.yyEzpp"),
    command("RDCG1", "Read convection gauge 1", "Measurement", "#aaRDCG1", "#01RDCG1", "Reads convection gauge CG1 (channel 2) pressure.", "safe", "An unplugged or over-ranged gauge returns the 1.10E+03 sentinel.", "*aa_y.yyEzpp"),
    command("RDCG2", "Read convection gauge 2", "Measurement", "#aaRDCG2", "#01RDCG2", "Reads convection gauge CG2 (channel 3) pressure.", "safe", "An unplugged or over-ranged gauge returns the 1.10E+03 sentinel.", "*aa_y.yyEzpp"),
    command("RDAI", "Read analog input / alternate gauge", "Measurement", "#aaRDAI", "#01RDAI", "Reads the analog input (alternate gauge on the CG2 channel) pressure.", "safe", "Over range or an unpowered alternate gauge returns the 1.10E+03 sentinel.", "*aa_y.yyEzpp"),
    command("IGS", "Cold cathode on/off status", "Gauge", "#aaIGS", "#01IGS", "Reports whether the cold-cathode ion gauge is on and reading pressure.", "safe", "This read is used by automatic controller identification.", "*aa_0_IG_OFF / *aa_1_IG_ON_"),
    command("RL", "Read all relay states", "Switching", "#aaRL", "#01RL", "Reads the state of all six setpoint relays as a hex bitmask.", "safe", "Example 003F means all six relays are energized.", "*aa_003F_RL_"),
    command("RLn", "Read one relay state", "Switching", "#aaRLn", "#01RL1", "Reads the on/off state of a single setpoint relay (n = 1…6).", "safe", "", "*aa_0_RL_OFF / *aa_1_RL_ON_"),
    command("IG1", "Turn cold cathode on", "Gauge", "#aaIG1", "#01IG1", "Applies high voltage to strike the cold-cathode discharge.", "danger", "Energizes the cold-cathode gauge. Only start below 5E-03 Torr to avoid contamination.", "*aa_PROGM_OK"),
    command("IG0", "Turn cold cathode off", "Gauge", "#aaIG0", "#01IG0", "Turns the cold-cathode high voltage off and clears errors.", "danger", "Deactivates the cold-cathode gauge.", "*aa_PROGM_OK"),
    command("TZCGn", "Set convection gauge zero", "Gauge", "#aaTZCGn value", "#01TZCG1 0", "Sets the vacuum/zero calibration point for CG1 or CG2 (n = 1 or 2).", "danger", "Calibration changes the reported pressure. Evacuate below 0.1 mTorr and follow the manual procedure.", "*aa_PROGM_OK"),
    command("TSCGn", "Set convection gauge span", "Gauge", "#aaTSCGn y.yyEzpp", "#01TSCG1 7.60E+02", "Sets the atmosphere/span calibration point for CG1 or CG2 (n = 1 or 2).", "danger", "Calibration changes the reported pressure. Follow the manual procedure.", "*aa_PROGM_OK")
  ].sort((a, b) => a.mnemonic.localeCompare(b.mnemonic));

  const vgc083HotQuick = [
    { value: "#01RDIG", title: "Read ion gauge pressure" },
    { value: "#01RDCG1", title: "Read convection gauge 1" },
    { value: "#01RDCG2", title: "Read convection gauge 2" },
    { value: "#01IGS", title: "Ion gauge on/off status" },
    { value: "#01SES", title: "Read emission current" },
    { value: "#01RSIG", title: "Read ion gauge status" },
    { value: "#01RDIGE", title: "Read emission current value" },
    { value: "#01RF", title: "Get filament selection" },
    { value: "#01RL", title: "Read all relay states" },
    { value: "#01VER", title: "Read software version" }
  ];

  const vgc083ColdQuick = [
    { value: "#01RDIG", title: "Read cold cathode pressure" },
    { value: "#01RDCG1", title: "Read convection gauge 1" },
    { value: "#01RDCG2", title: "Read convection gauge 2" },
    { value: "#01RDAI", title: "Read analog input" },
    { value: "#01IGS", title: "Cold cathode on/off status" },
    { value: "#01RL", title: "Read all relay states" }
  ];

  const vgc083Defaults = { baudRate: 19200, dataBits: 8, parity: "none", stopBits: 1 };

  const vgc083a = {
    id: "vgc083a",
    family: "VGC083",
    label: "VGC083A / VGC083B",
    implementation: "complete",
    manualDefaults: { ...vgc083Defaults },
    defaultUnit: "Torr",
    addressed: true,
    showGuidedBuilder: false,
    commands: vgc083HotCommands,
    quickCommands: vgc083HotQuick,
    probeSteps: [
      {
        text: "#01RF\r",
        command: "#01RF",
        label: "Identity probe · VGC083 hot-cathode filament read (address 01)",
        timeoutMs: 700
      }
    ],
    verifyStep: {
      text: "#01RDCG1\r",
      command: "#01RDCG1",
      label: "Verification · VGC083 convection gauge read"
    },
    identify(line, context) {
      const mine =
        (context.probeAdapterId === "vgc083a" || context.activeAdapterId === "vgc083a") &&
        /^#[0-9A-F]{2}RF$/i.test(context.command || "");
      if (!mine) return null;
      // Only hot-cathode VGC083A/B answer the "get filament selection" read.
      if (!/^\*[0-9A-F]{2}[ _]FIL[ _]SEL[12]\s*$/i.test(line)) return null;
      return {
        adapterId: "vgc083a",
        controller: "VGC083A/B",
        model: "399-700 / 399-701",
        serial: "",
        firmware: "",
        hardware: "",
        detail: "Hot-cathode VGC083 · A and B share firmware; choose commands by degas type"
      };
    },
    parseMeasurement(line, context) {
      return parseVgc083Pressure(line, context, "vgc083a");
    }
  };

  // VGC083B is wire-identical to VGC083A. It is fully supported through the
  // shared hot-cathode profile above, so it never claims a device on its own
  // (a connected B auto-identifies as the combined "VGC083A/B").
  const vgc083b = {
    id: "vgc083b",
    family: "VGC083",
    label: "VGC083B",
    implementation: "complete",
    manualDefaults: { ...vgc083Defaults },
    defaultUnit: "Torr",
    addressed: true,
    showGuidedBuilder: false,
    commands: vgc083HotCommands,
    quickCommands: vgc083HotQuick,
    probeSteps: [],
    verifyStep: null,
    identify() {
      // Indistinguishable from VGC083A on the serial interface — defer to it.
      return null;
    },
    parseMeasurement(line, context) {
      return parseVgc083Pressure(line, context, "vgc083b");
    }
  };

  const vgc083c = {
    id: "vgc083c",
    family: "VGC083",
    label: "VGC083C",
    implementation: "complete",
    manualDefaults: { ...vgc083Defaults },
    defaultUnit: "Torr",
    addressed: true,
    showGuidedBuilder: false,
    commands: vgc083ColdCommands,
    quickCommands: vgc083ColdQuick,
    probeSteps: [
      {
        text: "#01IGS\r",
        command: "#01IGS",
        label: "Identity probe · VGC083C cold-cathode status (address 01)",
        timeoutMs: 700
      }
    ],
    verifyStep: {
      text: "#01RDCG1\r",
      command: "#01RDCG1",
      label: "Verification · VGC083C convection gauge read"
    },
    identify(line, context) {
      // Gate to this adapter's own probe so a hot-cathode VGC083A/B (which
      // answers IGS identically) is never mislabeled as a VGC083C. The probe
      // order runs the hot-cathode RF read first, so a hot-cathode unit is
      // already claimed before this cold-cathode probe would run.
      const mine =
        (context.probeAdapterId === "vgc083c" || context.activeAdapterId === "vgc083c") &&
        /^#[0-9A-F]{2}IGS$/i.test(context.command || "");
      if (!mine) return null;
      if (!/^\*[0-9A-F]{2}[ _][01][ _]IG[ _](OFF|ON)/i.test(line)) return null;
      return {
        adapterId: "vgc083c",
        controller: "VGC083C",
        model: "399-702",
        serial: "",
        firmware: "",
        hardware: "",
        detail: "Cold-cathode VGC083 (MAG050 / MAG060)"
      };
    },
    parseMeasurement(line, context) {
      return parseVgc083Pressure(line, context, "vgc083c");
    }
  };

  // -------------------------------------------------------------------------
  // VGC094 — INFICON mnemonics protocol. Three-character mnemonics with
  // optional comma-separated parameters, framed with CR (and an optional LF).
  // Communication uses the same ACK / ENQ handshake as the VGC50x: the host
  // sends the mnemonic, the controller answers <ACK>, the host sends <ENQ>,
  // and the controller returns the data line. Enable "Auto ENQ after ACK".
  // AYT returns "VGC094,398-401,serial,firmware,hardware". Measurements report
  // status,value pairs for the four channels A1, A2, B1, B2 (mapped to the
  // console's channels 1–4). RS485 additionally prefixes an <ESC>+address node
  // selector, which the console does not send by default.
  // -------------------------------------------------------------------------

  const VGC094_PAIR = /(?:^|,)\s*([0-5])\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?)/gi;

  function parseVgc094(line, context) {
    if (context.activeAdapterId !== "vgc094") return [];
    const cmd = context.command || "";
    const single = { PA1: 1, PA2: 2, PB1: 3, PB2: 4 };
    if (Object.prototype.hasOwnProperty.call(single, cmd)) {
      const match = line.match(/^\s*([0-5])\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?)\s*$/i);
      if (!match) return [];
      const value = Number(match[2]);
      if (!Number.isFinite(value)) return [];
      return [{ channel: single[cmd], status: Number(match[1]), value, rawValue: match[2] }];
    }
    if (cmd !== "PRX" && cmd !== "COM") return [];
    const samples = [];
    let channel = 1;
    let match;
    VGC094_PAIR.lastIndex = 0;
    while ((match = VGC094_PAIR.exec(line)) && channel <= 4) {
      const value = Number(match[2]);
      if (Number.isFinite(value)) {
        samples.push({ channel, status: Number(match[1]), value, rawValue: match[2] });
      }
      channel += 1;
    }
    // Only trust a whole-line PRX/COM frame (all four channels present) so a
    // stray fragment never overwrites the live readings.
    return samples.length === 4 ? samples : [];
  }

  const vgc094Commands = [
    // Measurement
    command("AYT", "Controller identity", "General", "AYT", "AYT", "Returns controller type, model number, serial number, firmware, and hardware version.", "safe", "Best first command after connecting. Uses the ACK/ENQ handshake — enable Auto ENQ.", "VGC094,398-401,serial,firmware,hardware"),
    command("COM", "Continuous measurement output", "Measurement", "COM [,interval]", "COM,1", "Starts continuous measurement frames. Interval 0 = 100 ms, 1 = 1 s, 2 = 1 min.", "safe", "Any other command stops continuous output. Send COM,1 to restore one-second streaming.", "status,value for A1,A2,B1,B2"),
    command("ERR", "Communication error word", "Measurement", "ERR", "ERR", "Reads and clears the protocol error word: controller, missing hardware, inadmissible parameter, or syntax error.", "safe", "Reading ERR clears the stored error word.", "four binary digits"),
    command("PA1", "Pressure channel A1", "Measurement", "PA1", "PA1", "Returns measurement status and pressure for slot A, channel 1.", "safe", "", "status,value"),
    command("PA2", "Pressure channel A2", "Measurement", "PA2", "PA2", "Returns measurement status and pressure for slot A, channel 2.", "safe", "", "status,value"),
    command("PB1", "Pressure channel B1", "Measurement", "PB1", "PB1", "Returns measurement status and pressure for slot B, channel 1.", "safe", "", "status,value"),
    command("PB2", "Pressure channel B2", "Measurement", "PB2", "PB2", "Returns measurement status and pressure for slot B, channel 2.", "safe", "", "status,value"),
    command("PRX", "Pressure, all channels", "Measurement", "PRX", "PRX", "Returns measurement status and pressure for all four channels A1, A2, B1, B2.", "safe", "", "status,value ×4"),
    command("RES", "Error status / reset", "Measurement", "RES [,1]", "RES", "Reads the list of active controller errors. RES,1 restarts the controller and reads pending errors.", "caution", "RES,1 restarts the controller. Query first."),
    command("SEN", "Switch measurement circuits", "Measurement", "SEN [,a,b,c,d]", "SEN", "Reads or switches each measurement circuit (A1,A2,B1,B2): 0 no change, 1 off, 2 automatic, 3 on.", "danger", "Turns connected gauges on or off. Cold cathodes should only be started at low pressure."),
    command("TID", "Plug-in board identification", "Measurement", "TID", "TID", "Returns the installed boards for slots A, B, and C.", "safe", "", "boardA,boardB,interfaceC"),
    // Switching
    command("SPS", "Switching function status", "Switching", "SPS", "SPS", "Reads the on/off state of the four switching functions plus the slot A/B functions.", "safe"),
    command("SP1", "Switching function 1", "Switching", "SP1 [,lower,upper,assignment,onTimer]", "SP1", "Reads or configures switching function 1: lower/upper thresholds, channel assignment, and on-timer.", "danger", "Changes relay behavior connected to external equipment."),
    command("SP2", "Switching function 2", "Switching", "SP2 [,lower,upper,assignment,onTimer]", "SP2", "Reads or configures switching function 2: lower/upper thresholds, channel assignment, and on-timer.", "danger", "Changes relay behavior connected to external equipment."),
    command("SP3", "Switching function 3", "Switching", "SP3 [,lower,upper,assignment,onTimer]", "SP3", "Reads or configures switching function 3: lower/upper thresholds, channel assignment, and on-timer.", "danger", "Changes relay behavior connected to external equipment."),
    command("SP4", "Switching function 4", "Switching", "SP4 [,lower,upper,assignment,onTimer]", "SP4", "Reads or configures switching function 4: lower/upper thresholds, channel assignment, and on-timer.", "danger", "Changes relay behavior connected to external equipment."),
    // Gauge
    command("CID", "Measuring point names", "Gauge", "CID [,a1,a2,b1,b2]", "CID", "Reads or sets the measuring-point names (max 8 characters; A–Z, 0–9, and underscore).", "safe"),
    command("COR", "Gas correction factors", "Gauge", "COR [,a1,a2,b1,b2]", "COR", "Reads or sets per-channel correction factors from 0.20 to 8.00.", "caution", "Changes the reported pressure."),
    command("FIL", "Measurement filter", "Gauge", "FIL [,filter1,filter2,filter3,filter4]", "FIL", "Reads or sets the per-channel filter: 0 off, 1 = 100 Hz, 2 = 10 Hz, 3 = 1 Hz, 4 = 0.1 Hz.", "safe"),
    command("GAS", "Gas type correction", "Gauge", "GAS [,gas1,gas2,gas3,gas4]", "GAS", "Selects the gas per channel: 0 nitrogen/air, 1 helium, 2 neon, 3 argon, 4 krypton, 5 xenon, 6 hydrogen, 7 other.", "caution", "Gas choice changes the calculated pressure. Note the VGC094 gas order differs from the VGC50x."),
    command("GTA", "Sensor type, slot A", "Gauge", "GTA [,channel1,channel2]", "GTA", "Reads or sets the sensor type on slot A for measurement channels 1 and 2.", "caution", "Must match the physically connected gauge."),
    command("GTB", "Sensor type, slot B", "Gauge", "GTB [,channel1,channel2]", "GTB", "Reads or sets the sensor type on slot B for measurement channels 1 and 2.", "caution", "Must match the physically connected gauge."),
    command("CA1", "Leakage compensation A1", "Gauge", "CA1 [,mode,value]", "CA1", "Reads or sets cold-cathode leakage-current compensation for channel A1. Mode 0 off, 1 on, 2 measure and activate.", "caution"),
    command("CA2", "Leakage compensation A2", "Gauge", "CA2 [,mode,value]", "CA2", "Reads or sets cold-cathode leakage-current compensation for channel A2. Mode 0 off, 1 on, 2 measure and activate.", "caution"),
    command("CB1", "Leakage compensation B1", "Gauge", "CB1 [,mode,value]", "CB1", "Reads or sets cold-cathode leakage-current compensation for channel B1. Mode 0 off, 1 on, 2 measure and activate.", "caution"),
    command("CB2", "Leakage compensation B2", "Gauge", "CB2 [,mode,value]", "CB2", "Reads or sets cold-cathode leakage-current compensation for channel B2. Mode 0 off, 1 on, 2 measure and activate.", "caution"),
    // Gauge control
    command("SA1", "Gauge control, slot A ch1", "Gauge control", "SA1 [,onMode,offMode,onThreshold,offThreshold]", "SA1", "Configures activation, deactivation, and pressure thresholds for slot A channel 1.", "danger", "Can automatically energize or turn off a connected gauge."),
    command("SA2", "Gauge control, slot A ch2", "Gauge control", "SA2 [,onMode,offMode,onThreshold,offThreshold]", "SA2", "Configures activation, deactivation, and pressure thresholds for slot A channel 2.", "danger", "Can automatically energize or turn off a connected gauge."),
    command("SB1", "Gauge control, slot B ch1", "Gauge control", "SB1 [,onMode,offMode,onThreshold,offThreshold]", "SB1", "Configures activation, deactivation, and pressure thresholds for slot B channel 1.", "danger", "Can automatically energize or turn off a connected gauge."),
    command("SB2", "Gauge control, slot B ch2", "Gauge control", "SB2 [,onMode,offMode,onThreshold,offThreshold]", "SB2", "Configures activation, deactivation, and pressure thresholds for slot B channel 2.", "danger", "Can automatically energize or turn off a connected gauge."),
    command("SPA", "Gauge control, slot A", "Gauge control", "SPA [,onThreshold,offThreshold,assignment]", "SPA", "Configures both slot A channels' turn-on/turn-off thresholds and controlling channel simultaneously.", "danger", "Can automatically energize or turn off connected gauges."),
    command("SPB", "Gauge control, slot B", "Gauge control", "SPB [,onThreshold,offThreshold,assignment]", "SPB", "Configures both slot B channels' turn-on/turn-off thresholds and controlling channel simultaneously.", "danger", "Can automatically energize or turn off connected gauges."),
    // General
    command("AOM", "Analog output mode", "General", "AOM [,mode]", "AOM", "Reads or sets the analog output mode: 0 off, 1 = 0–5 V, 2 = 0–10 V, 3 = 4–20 mA.", "caution"),
    command("BAL", "Backlight brightness", "General", "BAL [,percent]", "BAL,40", "Reads or sets display backlight brightness from 0 to 100 percent.", "safe"),
    command("DCB", "Display bar graph", "General", "DCB [,channel,mode]", "DCB", "Reads or selects the display bar-graph / trend representation for a channel.", "safe"),
    command("DCC", "Display contrast", "General", "DCC [,percent]", "DCC,40", "Reads or sets display contrast from 0 to 100 percent.", "safe"),
    command("DCS", "Display screensaver", "General", "DCS [,mode]", "DCS", "Sets screensaver timing: off, 10 min, 30 min, 1 h, 2 h, 8 h, or dark after 1 min.", "safe"),
    command("ERA", "Error relay allocation", "General", "ERA [,mode]", "ERA", "Allocates the error relay to all errors, controller errors only, or a selected sensor plus controller.", "caution", "Changes external error relay behavior."),
    command("EVA", "End-value display", "General", "EVA [,mode]", "EVA", "Selects under/over-range indication (0) or display of the range end value (1).", "safe"),
    command("LNG", "Display language", "General", "LNG [,language]", "LNG", "Selects English (0), German (1), or French (2).", "safe"),
    command("PUC", "Penning underrange control", "General", "PUC [,state]", "PUC", "Reads or sets cold-cathode underrange handling of the switching functions.", "caution", "Affects how switching functions behave when the discharge has not ignited."),
    command("SAV", "Save parameters (EEPROM)", "General", "SAV [,set]", "SAV,1", "Loads default parameters (0), stores the user set (1), or stores with hot-start (2).", "danger", "Writes nonvolatile settings. Loading defaults also resets communication settings."),
    command("UNI", "Pressure unit", "General", "UNI [,unit]", "UNI", "Reads or sets units: 0 mbar, 1 Torr, 2 Pa, 3 micron, 4 hPa, 5 Volt, 6 Ampere.", "caution", "Changing units affects displayed values and thresholds."),
    // Logger
    command("DAT", "Logger date", "Logger", "DAT [,yyyy-mm-dd]", "DAT", "Reads or sets the controller date used by the USB data logger.", "safe"),
    command("LCM", "Logger control", "Logger", "LCM [,command,interval,separator,filename,mode]", "LCM", "Controls USB logging: stop/start/clear, logging interval, decimal separator, filename, and manual/automatic mode.", "danger", "Start, clear, and file operations alter USB logging data."),
    command("TIM", "Logger time", "Logger", "TIM [,hh:mm]", "TIM", "Reads or sets the controller time used by the USB data logger.", "safe"),
    // Communication / network
    command("BAI", "USB baud rate", "Network", "BAI [,code]", "BAI", "Reads or sets the USB serial baud rate: 0=9600, 1=19200, 2=38400, 3=57600, 4=115200.", "danger", "The response is sent at the new rate; reconnect with the matching baud."),
    command("BAR", "RS485 baud rate", "Network", "BAR [,code]", "BAR", "Reads or sets the RS485 baud rate: 0=9600, 1=19200, 2=38400, 3=57600, 4=115200.", "danger", "The response is sent at the new rate; reconnect with the matching baud."),
    command("BAU", "Plug-in board baud rate", "Network", "BAU [,code]", "BAU", "Reads or sets the IF30xx / IF500PN plug-in board baud rate.", "danger", "Must match the fieldbus board configuration."),
    command("ETH", "Ethernet configuration", "Network", "ETH [,dhcp,ip,subnet,gateway]", "ETH", "Reads or changes DHCP mode, IP address, subnet mask, and gateway.", "danger", "Changing network settings can disconnect the Ethernet virtual serial path."),
    command("NAD", "RS485 node address", "Network", "NAD [,address]", "NAD", "Reads or sets the RS485 node (device) address, 1 to 24.", "danger", "Changing the address changes how the controller is selected on the bus."),
    command("MAC", "Ethernet MAC address", "Network", "MAC", "MAC", "Returns the controller Ethernet MAC address.", "safe"),
    // Setup / test
    command("SCM", "USB setup transfer", "Transfer & test", "SCM [,mode,number]", "SCM", "Saves, loads, formats, or deletes controller setup files on a USB memory stick.", "danger", "Format and delete operations can destroy USB data; loading changes controller setup."),
    command("ADC", "A/D converter test", "Transfer & test", "ADC", "ADC", "Reads the internal analog-to-digital converter test voltages for all channels.", "safe"),
    command("CDA", "Recalibration date", "Transfer & test", "CDA [,yyyy-mm-dd]", "CDA", "Reads or stores the next recalibration date.", "caution"),
    command("DIS", "Display test", "Transfer & test", "DIS [,state]", "DIS,1", "Turns all display elements on (1) or stops the test (0).", "caution"),
    command("EEP", "EEPROM test", "Transfer & test", "EEP", "EEP", "Runs the EEPROM (parameter memory) integrity test.", "danger", "Do not repeat unnecessarily; EEPROM has a finite write life."),
    command("EPR", "FLASH test", "Transfer & test", "EPR", "EPR", "Runs the program flash-memory test.", "caution"),
    command("HDW", "Hardware version", "Transfer & test", "HDW", "HDW", "Returns the controller hardware version.", "safe"),
    command("IOT", "I/O (relay) test", "Transfer & test", "IOT [,state,relays]", "IOT", "Exercises the controller relays and I/O for testing.", "danger", "Actuates physical relays. Isolate the controlled process before testing."),
    command("LOC", "Keylock", "Transfer & test", "LOC [,state]", "LOC", "Reads or changes the front-panel key lock (0 off, 1 on, 2 on via interface only).", "caution"),
    command("PNR", "Firmware version", "Transfer & test", "PNR", "PNR", "Returns the installed firmware version.", "safe"),
    command("RHR", "Operating hours", "Transfer & test", "RHR", "RHR", "Returns the controller operating hours.", "safe"),
    command("SME", "Show me (locate)", "Transfer & test", "SME", "SME", "Flashes the addressed controller's backlight for five seconds to locate it.", "safe"),
    command("TKB", "Operator keys test", "Transfer & test", "TKB", "TKB", "Returns the state of the four front-panel operator keys.", "safe"),
    command("TLC", "Torr lock", "Transfer & test", "TLC [,state]", "TLC", "Reads or changes the Torr-lock setting that hides the Torr and micron units.", "caution"),
    command("TMP", "Internal temperature", "Transfer & test", "TMP", "TMP", "Returns the controller internal temperature in degrees Celsius.", "safe"),
    command("VBT", "Battery voltage", "Transfer & test", "VBT", "VBT", "Returns the real-time-clock battery voltage in millivolts (nominal 3 V).", "safe"),
    command("WDT", "Watchdog control", "Transfer & test", "WDT [,mode]", "WDT", "Selects manual (0) or automatic (1) watchdog error acknowledgement.", "caution")
  ].sort((a, b) => a.mnemonic.localeCompare(b.mnemonic));

  const vgc094Quick = [
    { value: "AYT", title: "Controller identity" },
    { value: "PRX", title: "Pressure, all channels" },
    { value: "PA1", title: "Pressure channel A1" },
    { value: "PB1", title: "Pressure channel B1" },
    { value: "TID", title: "Plug-in board identification" },
    { value: "ERR", title: "Communication error word" },
    { value: "SPS", title: "Switching function status" },
    { value: "MAC", title: "Ethernet MAC address" },
    { value: "PNR", title: "Firmware version" },
    { value: "RHR", title: "Operating hours" },
    { value: "TMP", title: "Internal temperature" },
    { value: "COM", title: "Continuous output", guided: true },
    { value: "UNI", title: "Pressure unit", guided: true },
    { value: "FIL", title: "Measurement filter", guided: true }
  ];

  const vgc094 = {
    id: "vgc094",
    family: "VGC094",
    label: "VGC094",
    implementation: "complete",
    manualDefaults: { baudRate: 115200, dataBits: 8, parity: "none", stopBits: 1 },
    handshake: "ack-enq",
    showGuidedBuilder: true,
    defaultUnit: "mbar",
    commands: vgc094Commands,
    quickCommands: vgc094Quick,
    probeSteps: [
      {
        text: "AYT\r",
        command: "AYT",
        label: "Identity probe · VGC094 AYT",
        timeoutMs: 1000
      }
    ],
    verifyStep: {
      text: "PRX\r",
      command: "PRX",
      label: "Verification · VGC094 all-channel pressure read"
    },
    identify(line) {
      const parts = line.split(",");
      // Conservative signature: the controller self-reports "VGC094" and the
      // product part number 398-401. AYT is shared with the VGC50x handshake,
      // so requiring the model name avoids any cross-family confusion.
      if ((parts[0] || "").trim().toUpperCase() !== "VGC094") return null;
      if (!/^\s*398-401/.test(parts[1] || "")) return null;
      return {
        adapterId: "vgc094",
        controller: "VGC094",
        model: (parts[1] || "398-401").trim(),
        serial: (parts[2] || "").trim(),
        firmware: (parts[3] || "").trim(),
        hardware: (parts[4] || "").trim()
      };
    },
    parseMeasurement(line, context) {
      return parseVgc094(line, context);
    }
  };

  const adapters = [vgc50x, vgc031, vgc083a, vgc083b, vgc083c, vgc094];

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
