(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const controllerRegistry = window.VGCControllerRegistry;
  if (!controllerRegistry) throw new Error("Controller registry failed to load.");
  const STATUS = {
    0: ["Okay", "ok"],
    1: ["Underrange", "warn"],
    2: ["Overrange", "warn"],
    3: ["Sensor error", "bad"],
    4: ["Sensor off", "warn"],
    5: ["No sensor", "warn"],
    6: ["Identification error", "bad"],
    7: ["Gauge error", "bad"]
  };
  const UNITS = ["mbar", "Torr", "Pa", "micron", "hPa", "Volt", "Ampere"];
  const CATEGORIES = ["All", "Measurement", "Switching", "Gauge", "Gauge control", "General", "Logger", "Transfer & test", "Network"];
  const TOKEN_BYTES = { CR: 13, LF: 10, ENQ: 5, ACK: 6, NAK: 21, ETX: 3, TAB: 9, NUL: 0 };
  const CONTROL_NAMES = { 0: "NUL", 3: "ETX", 5: "ENQ", 6: "ACK", 9: "TAB", 10: "LF", 13: "CR", 21: "NAK" };
  const choice = (values) => values.map(([value, label]) => ({ value, label }));
  const ON_OFF = choice([["0", "Off"], ["1", "On"]]);
  const CHANNEL_STATE = { type: "select", options: ON_OFF, defaultValue: "0", help: "Choose the state for this channel." };
  const FILTER_MODE = {
    type: "select",
    options: choice([["0", "Off"], ["1", "Fast"], ["2", "Normal"], ["3", "Slow"]]),
    defaultValue: "2",
    help: "Normal filtering is a good default for most measurements."
  };
  const GAS_TYPE = {
    type: "select",
    options: choice([
      ["0", "Air / nitrogen (N₂)"],
      ["1", "Argon (Ar)"],
      ["2", "Hydrogen (H₂)"],
      ["3", "Helium (He)"],
      ["4", "Neon (Ne)"],
      ["5", "Krypton (Kr)"],
      ["6", "Xenon (Xe)"],
      ["7", "Other gas"]
    ]),
    defaultValue: "0",
    help: "Gas selection changes the pressure calculation."
  };
  const GUIDED_FIELDS = {
    COM: {
      interval: {
        type: "select",
        options: choice([["0", "Every 100 ms"], ["1", "Every second"], ["2", "Every minute"]]),
        defaultValue: "1",
        label: "Measurement interval",
        help: "Starts continuous measurement output at this interval."
      }
    },
    UNI: {
      unit: {
        type: "select",
        options: choice([
          ["0", "mbar / bar"],
          ["1", "Torr"],
          ["2", "Pascal (Pa)"],
          ["3", "micron"],
          ["4", "hectopascal (hPa)"],
          ["5", "Volt"]
        ]),
        defaultValue: "0",
        label: "Pressure unit"
      }
    },
    BAU: {
      code: {
        type: "select",
        options: choice([
          ["0", "9,600 baud"],
          ["1", "19,200 baud"],
          ["2", "38,400 baud"],
          ["3", "57,600 baud"],
          ["4", "115,200 baud"]
        ]),
        defaultValue: "4",
        label: "New baud rate",
        help: "Reconnect using the same baud rate after the controller acknowledges."
      }
    },
    LNG: {
      language: {
        type: "select",
        options: choice([["0", "English"], ["1", "German"], ["2", "French"]]),
        defaultValue: "0",
        label: "Display language"
      }
    },
    FMT: {
      mode: {
        type: "select",
        options: choice([["0", "Floating notation"], ["1", "Exponential notation"]]),
        defaultValue: "0",
        label: "Number format"
      }
    },
    CPT: {
      mode: {
        type: "select",
        options: choice([["0", "INFICON"], ["1", "Oerlikon Leybold Vacuum"]]),
        defaultValue: "0",
        label: "Protocol compatibility"
      }
    },
    SAV: {
      set: {
        type: "select",
        options: choice([["0", "Load default parameters"], ["1", "Store current parameters"]]),
        defaultValue: "1",
        label: "EEPROM action"
      }
    },
    RES: {
      "1": {
        type: "select",
        options: choice([["1", "Acknowledge cancelable errors"]]),
        defaultValue: "1",
        label: "Reset action"
      }
    },
    DCS: {
      mode: {
        type: "select",
        options: choice([
          ["0", "Off"],
          ["1", "After 10 minutes"],
          ["2", "After 30 minutes"],
          ["3", "After 1 hour"],
          ["4", "After 2 hours"],
          ["5", "After 8 hours"],
          ["6", "Dark after 1 minute"]
        ]),
        defaultValue: "0",
        label: "Screensaver timing"
      }
    },
    ETH: {
      dhcp: {
        type: "select",
        options: choice([["0", "Manual network settings"], ["1", "Automatic (DHCP)"]]),
        defaultValue: "1",
        label: "Address assignment"
      }
    }
  };

  const cmd = (mnemonic, name, category, syntax, example, description, risk = "safe", note = "", response = "") => ({
    mnemonic, name, category, syntax, example, description, risk, note, response
  });

  const vgc50xCommands = [
    cmd("AYT", "Controller identity", "General", "AYT", "AYT", "Returns controller type, model/part number, serial number, firmware, and hardware revision.", "safe", "Best first command after connecting.", "VGC50x,model,serial,firmware,hardware"),
    cmd("COM", "Continuous measurement output", "Measurement", "COM [,interval]", "COM,1", "Starts or stops automatic measurement frames. Interval 0 = 100 ms, 1 = 1 s, 2 = 1 min.", "safe", "Any host command stops continuous output. Send COM,1 to restore one-second streaming.", "status,value pairs for every channel"),
    cmd("CPR", "Combined pressure", "Measurement", "CPR [,ch1,ch2,ch3]", "CPR", "Reads or configures the channels used for combined pressure evaluation. Channel selectors are 0 through 3.", "safe", "", "channel selection followed by combined measurement"),
    cmd("ERR", "Communication error word", "Measurement", "ERR", "ERR", "Reads and clears the protocol error word: controller, missing hardware, inadmissible parameter, or syntax error.", "safe", "Reading ERR clears the stored error word.", "four binary digits"),
    cmd("GIM", "Gauge identification mode", "Measurement", "GIM [,mode1,mode2,mode3]", "GIM", "Reads or sets sensor identification. Modes cover automatic detection and INFICON PSG, PCG, PEG/MAG, MPG, CDG, BPG, HPG, BCG, BAG, and user-defined gauges.", "caution", "Keep automatic mode unless a known sensor requires a fixed identification."),
    cmd("PRX", "Pressure, all channels", "Measurement", "PRX", "PRX", "Returns measurement status and pressure for all installed channels.", "safe", "", "status,value pairs"),
    cmd("RES", "Error status / reset", "Measurement", "RES [,1]", "RES", "Reads the active controller and gauge errors. RES,1 acknowledges cancelable errors and returns to measurement mode.", "caution", "Query first. Reset only after the process is in a safe state."),
    cmd("TID", "Gauge identification", "Measurement", "TID", "TID", "Returns the detected gauge type for each measuring channel.", "safe"),
    cmd("SPS", "Switching function status", "Switching", "SPS", "SPS", "Reads the on/off state of all six switching functions.", "safe"),
    cmd("CAL", "Calibration factor (alias)", "Gauge", "CAL [,factor1,factor2,factor3]", "CAL", "Alias of COR for reading or setting calibration factors.", "caution"),
    cmd("COR", "Calibration factors", "Gauge", "COR [,factor1,factor2,factor3]", "COR", "Reads or sets the gauge calibration factors.", "caution", "Changing calibration alters reported pressure."),
    cmd("DCD", "Display resolution", "Gauge", "DCD [,mode1,mode2,mode3]", "DCD", "Sets automatic resolution or one through four displayed digits for each channel.", "safe"),
    cmd("DGS", "Degas", "Gauge", "DGS [,state1,state2,state3]", "DGS", "Reads or controls sensor degas. State 1 starts a three-minute degas cycle.", "danger", "Actuates connected gauges. Confirm the gauge and vacuum process permit degas."),
    cmd("EUM", "Emission mode", "Gauge", "EUM [,mode1,mode2,mode3]", "EUM", "Reads or selects manual (0) or automatic (1) emission mode.", "danger", "Emission changes can affect hot-cathode gauges."),
    cmd("FIL", "Measurement filter", "Gauge", "FIL [,filter1,filter2,filter3]", "FIL", "Reads or sets measurement filtering: 0 off, 1 fast, 2 normal, 3 slow.", "safe"),
    cmd("FUM", "Filament mode", "Gauge", "FUM [,mode1,mode2,mode3]", "FUM", "Selects automatic filament choice, filament 1, or filament 2.", "danger", "Applies to compatible gauges and can change the active filament."),
    cmd("FSR", "Full-scale range", "Gauge", "FSR [,range1,range2,range3]", "FSR", "Reads or sets analog gauge full-scale range using INFICON range codes 0 through 36.", "caution", "The range must match the connected analog gauge."),
    cmd("GAS", "Gas correction", "Gauge", "GAS [,gas1,gas2,gas3]", "GAS", "Selects gas correction: 0 air/N₂, 1 Ar, 2 H₂, 3 He, 4 Ne, 5 Kr, 6 Xe, 7 other.", "caution", "Gas choice changes the calculated pressure."),
    cmd("HVC", "High-voltage control", "Gauge", "HVC [,state1,state2,state3]", "HVC", "Reads or switches sensor high voltage off (0) or on (1).", "danger", "Actuates high voltage on compatible gauges."),
    cmd("ITR", "Raw gauge data", "Gauge", "ITR", "ITR", "Returns raw data bytes received from the connected gauges.", "safe"),
    cmd("OFC", "Offset correction mode", "Gauge", "OFC [,mode1,mode2,mode3]", "OFC", "Controls offset correction: off, on, determine and activate, or zero adjustment.", "danger", "Can recalculate sensor zero. Follow the gauge-specific procedure."),
    cmd("OFD", "Offset correction value", "Gauge", "OFD [,value1,value2,value3]", "OFD", "Reads or sets stored offset correction values.", "caution"),
    cmd("OFS", "VGC501 offset", "Gauge", "OFS [,mode,value]", "OFS", "VGC501 offset correction: off, on, automatic, or zero adjustment.", "danger", "Can change or determine the active sensor offset."),
    cmd("AOM", "Analog output mode", "General", "AOM [,channel,mode]", "AOM", "Reads or configures the analog output channel and transfer characteristic (modes 0 through 33).", "caution"),
    cmd("BAL", "Backlight brightness", "General", "BAL [,percent]", "BAL,70", "Reads or sets display backlight brightness from 0 to 100 percent.", "safe"),
    cmd("BAU", "USB serial baud rate", "General", "BAU [,code]", "BAU", "Reads or changes USB serial baud: 0=9600, 1=19200, 2=38400, 3=57600, 4=115200.", "danger", "The ACK is sent at the new rate; reconnect the browser with the matching baud."),
    cmd("DCB", "Display bar graph", "General", "DCB [,mode]", "DCB", "Reads or selects the display bar-graph representation.", "safe"),
    cmd("DCC", "Display contrast", "General", "DCC [,percent]", "DCC,60", "Reads or sets display contrast from 0 to 100 percent.", "safe"),
    cmd("DCS", "Display screensaver", "General", "DCS [,mode]", "DCS", "Sets screensaver timing: off, 10 min, 30 min, 1 h, 2 h, 8 h, or dark after 1 min.", "safe"),
    cmd("ERA", "Error relay allocation", "General", "ERA [,mode]", "ERA", "Allocates the error relay to all errors, controller errors, or a selected sensor plus controller.", "caution", "Changes external error relay behavior."),
    cmd("EVA", "End-value display", "General", "EVA [,mode]", "EVA", "Selects under/overrange indication or display of the range end value.", "safe"),
    cmd("FMT", "Number format", "General", "FMT [,mode]", "FMT", "Selects floating notation when possible (0) or exponential notation (1).", "safe"),
    cmd("LNG", "Display language", "General", "LNG [,language]", "LNG", "Selects English (0), German (1), or French (2).", "safe"),
    cmd("PRE", "Pirani range extension", "General", "PRE [,state]", "PRE", "Reads or enables Pirani range extension.", "caution"),
    cmd("SAV", "EEPROM parameters", "General", "SAV [,set]", "SAV,1", "Loads default parameters (0) or stores the current parameters as the user set (1).", "danger", "Writes nonvolatile settings; avoid unnecessary repeated writes."),
    cmd("UNI", "Pressure unit", "General", "UNI [,unit]", "UNI", "Reads or sets units: 0 mbar/bar, 1 Torr, 2 Pa, 3 micron, 4 hPa, 5 Volt.", "caution", "Changing units affects displayed values and thresholds."),
    cmd("DAT", "Logger date", "Logger", "DAT [,yyyy-mm-dd]", "DAT", "Reads or sets the controller date used by the USB data logger.", "safe"),
    cmd("LCM", "Logger control", "Logger", "LCM [,command,interval,separator,filename]", "LCM", "Controls USB logging: stop, start, or clear; selects interval, decimal separator, and a filename up to seven characters.", "danger", "Start, clear, and file operations alter USB logging data."),
    cmd("TIM", "Logger time", "Logger", "TIM [,hh:mm]", "TIM", "Reads or sets the controller time used by the USB data logger.", "safe"),
    cmd("SCM", "USB storage manager", "Transfer & test", "SCM [,mode,file]", "SCM", "Saves, loads, formats, or deletes controller setup files on USB storage.", "danger", "Format and delete operations can destroy USB data; loading changes controller setup."),
    cmd("ADC", "ADC values (alias)", "Transfer & test", "ADC", "ADC", "Alias of TAD. Reads analog-to-digital converter test values.", "safe"),
    cmd("CDA", "Recalibration date", "Transfer & test", "CDA [,date1,date2,date3]", "CDA", "Reads or stores gauge recalibration dates.", "caution"),
    cmd("CPT", "Protocol compatibility", "Transfer & test", "CPT [,mode]", "CPT", "Selects INFICON (0) or Oerlikon Leybold Vacuum compatibility (1).", "danger", "Changing compatibility can break existing host software."),
    cmd("DIS", "Display test (alias)", "Transfer & test", "DIS [,state]", "DIS,1", "Alias of TDI. Turns the display segment test on or off.", "caution"),
    cmd("EEP", "EEPROM test (alias)", "Transfer & test", "EEP", "EEP", "Alias of TEE. Runs the EEPROM test.", "danger", "Do not repeat unnecessarily; EEPROM has a finite write life."),
    cmd("EPR", "Program memory test (alias)", "Transfer & test", "EPR", "EPR", "Alias of TEP. Runs the flash program-memory test.", "caution"),
    cmd("HDW", "Hardware version", "Transfer & test", "HDW", "HDW", "Returns the controller hardware version.", "safe"),
    cmd("IOT", "I/O test (alias)", "Transfer & test", "IOT [,pattern]", "IOT", "Alias of TIO. Exercises controller outputs and relays.", "danger", "Actuates physical relays. Isolate the controlled process before testing."),
    cmd("LOC", "Key lock", "Transfer & test", "LOC [,state]", "LOC", "Reads or changes front-panel key lock.", "caution"),
    cmd("MAC", "Ethernet MAC address", "Network", "MAC", "MAC", "Returns the controller Ethernet MAC address.", "safe"),
    cmd("PNR", "Firmware version", "Transfer & test", "PNR", "PNR", "Returns the installed firmware version.", "safe"),
    cmd("RHR", "Run hours", "Transfer & test", "RHR", "RHR", "Returns controller operating hours.", "safe"),
    cmd("RST", "Serial interface test (alias)", "Transfer & test", "RST", "RST", "Alias of TRS. Starts serial interface loopback test behavior.", "danger", "Test mode changes normal communication; ETX stops it."),
    cmd("TAD", "ADC test values", "Transfer & test", "TAD", "TAD", "Reads internal analog-to-digital converter values.", "safe"),
    cmd("TAI", "Identification resistance test", "Transfer & test", "TAI", "TAI", "Reads gauge identification resistances. ENQ starts a brief test.", "caution"),
    cmd("TDI", "Display segment test", "Transfer & test", "TDI [,state]", "TDI,1", "Turns all display segments on (1) or stops the test (0).", "caution"),
    cmd("TEE", "EEPROM test", "Transfer & test", "TEE", "TEE", "Runs an EEPROM integrity test.", "danger", "Do not repeat unnecessarily; EEPROM has a finite write life."),
    cmd("TEP", "Flash memory test", "Transfer & test", "TEP", "TEP", "Runs a program flash-memory test.", "caution"),
    cmd("TIO", "Relay and I/O test", "Transfer & test", "TIO [,pattern]", "TIO", "Exercises controller I/O and relay outputs.", "danger", "Actuates physical relays. Isolate the process before sending."),
    cmd("TKB", "Key status", "Transfer & test", "TKB", "TKB", "Returns front-panel key status.", "safe"),
    cmd("TLC", "Torr lock", "Transfer & test", "TLC [,state]", "TLC", "Reads or changes the Torr-lock setting.", "caution"),
    cmd("TMP", "Internal temperature", "Transfer & test", "TMP", "TMP", "Returns controller internal temperature.", "safe"),
    cmd("TRS", "Serial interface test", "Transfer & test", "TRS", "TRS", "Starts the serial interface test; ENQ begins the test exchange and ETX stops it.", "danger", "Test mode interrupts normal controller communication."),
    cmd("WDT", "Watchdog acknowledgement", "Transfer & test", "WDT [,mode]", "WDT", "Selects manual (0) or automatic (1) watchdog acknowledgement.", "caution"),
    cmd("ETH", "Ethernet configuration", "Network", "ETH [,dhcp,ip,mask,gateway]", "ETH", "Reads or changes DHCP, IP address, subnet mask, and gateway.", "danger", "Changing network settings can disconnect the Ethernet virtual serial path.")
  ];

  let commands = vgc50xCommands;
  [1, 2, 3].forEach((n) => {
    commands.push(
      cmd(`PR${n}`, `Pressure channel ${n}`, "Measurement", `PR${n}`, `PR${n}`, `Returns measurement status and pressure for channel ${n}.`, "safe", "", "status,value"),
      cmd(`GF${n}`, `User gauge formula CH ${n}`, "Measurement", `GF${n} [,a,b,c]`, `GF${n}`, `Reads or sets the three user-defined voltage-to-pressure conversion factors for channel ${n}.`, "caution", "Only use with a documented custom analog gauge."),
      cmd(`CF${n}`, `Correction factor CH ${n}`, "Gauge", `CF${n} [,factor]`, `CF${n}`, `Reads or sets the channel ${n} gas correction factor from 0.1 to 10.`, "caution", "Changes reported pressure."),
      cmd(`SC${n}`, `Gauge control CH ${n}`, "Gauge control", `SC${n} [,onMode,offMode,onThreshold,offThreshold]`, `SC${n}`, `Configures activation, deactivation, and pressure thresholds for gauge channel ${n}.`, "danger", "Can automatically energize or turn off a connected gauge.")
    );
  });
  [1, 2, 3, 4, 5, 6].forEach((n) => {
    commands.push(cmd(`SP${n}`, `Switching function ${n}`, "Switching", `SP${n} [,assignment,lower,upper]`, `SP${n}`, `Reads or configures switching function ${n}: off, on, or assigned to a channel with lower and upper thresholds.`, "danger", "Changes relay behavior. Verify external equipment before writing."));
  });
  commands.sort((a, b) => a.mnemonic.localeCompare(b.mnemonic));

  const state = {
    ports: [],
    selectedPort: null,
    port: null,
    reader: null,
    readLoop: null,
    connected: false,
    demo: false,
    demoTimer: null,
    pendingCommand: "",
    lineBytes: [],
    selectedCommand: null,
    category: "All",
    identity: null,
    controllerAdapterId: null,
    activeProbe: null,
    identityWaiter: null,
    identifying: false,
    unit: "unit",
    lastChannels: {},
    terminalVisible: [],
    saveTimer: null,
    db: null,
    session: freshSession(),
    portIds: new WeakMap(),
    nextPortId: 1
  };

  function freshSession(name = "INFICON controller session") {
    const now = new Date().toISOString();
    return {
      schema: "vgc50x-session/v1",
      id: crypto.randomUUID(),
      name,
      startedAt: now,
      updatedAt: now,
      settings: {},
      device: null,
      logs: [],
      samples: []
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function asHex(bytes) {
    return [...bytes].map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
  }

  function readableBytes(bytes) {
    let out = "";
    for (const byte of bytes) {
      if (CONTROL_NAMES[byte]) out += `<${CONTROL_NAMES[byte]}>`;
      else if (byte >= 32 && byte <= 126) out += String.fromCharCode(byte);
      else out += `<${byte.toString(16).padStart(2, "0").toUpperCase()}>`;
    }
    return out || "<empty>";
  }

  function timeLabel(iso) {
    return new Date(iso).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 });
  }

  function applyTheme(theme, persist = true) {
    const nextTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    if (persist) localStorage.setItem("vgc50x-theme", nextTheme);
    const toggle = $("#themeToggle");
    if (toggle) {
      const targetTheme = nextTheme === "light" ? "dark" : "light";
      toggle.setAttribute("aria-label", `Switch to ${targetTheme} mode`);
      toggle.setAttribute("aria-pressed", nextTheme === "light" ? "true" : "false");
      $("#themeToggleText").textContent = targetTheme === "light" ? "Light" : "Dark";
    }
    const themeColor = $('meta[name="theme-color"]');
    if (themeColor) themeColor.content = nextTheme === "light" ? "#f3f6f7" : "#0b1118";
    drawTrend();
  }

  function initTheme() {
    const preferred = window.matchMedia("(prefers-color-scheme: light)");
    const saved = localStorage.getItem("vgc50x-theme");
    const initial = document.documentElement.dataset.theme ||
      (saved === "light" || saved === "dark" ? saved : preferred.matches ? "light" : "dark");
    applyTheme(initial, false);
    $("#themeToggle").addEventListener("click", () => {
      applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
    });
    preferred.addEventListener?.("change", (event) => {
      if (!localStorage.getItem("vgc50x-theme")) applyTheme(event.matches ? "light" : "dark", false);
    });
  }

  function toast(message, kind = "") {
    const node = document.createElement("div");
    node.className = `toast ${kind}`.trim();
    node.textContent = message;
    $("#toastRegion").append(node);
    setTimeout(() => node.remove(), 4200);
  }

  function updateCounts() {
    $("#sessionLogCount").textContent = state.session.logs.length.toLocaleString();
    $("#sessionSampleCount").textContent = state.session.samples.length.toLocaleString();
    $("#exportSummary").textContent = `${state.session.logs.length.toLocaleString()} traffic events · ${state.session.samples.length.toLocaleString()} measurements · started ${new Date(state.session.startedAt).toLocaleString()}`;
  }

  function collectSettings() {
    return {
      baudRate: Number($("#baudSelect").value),
      dataBits: Number($("#dataBitsSelect").value),
      stopBits: Number($("#stopBitsSelect").value),
      parity: $("#paritySelect").value,
      flowControl: $("#flowControlSelect").value,
      inputFormat: $("#inputFormatSelect").value,
      lineEnding: $("#lineEndingSelect").value,
      autoEnq: $("#autoEnqCheck").checked
    };
  }

  function addLog(direction, bytes, label = "") {
    const event = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      direction,
      label,
      bytes: [...bytes],
      text: readableBytes(bytes),
      ascii: decoder.decode(bytes)
    };
    state.session.logs.push(event);
    if (state.session.logs.length > 25000) state.session.logs.shift();
    appendTraffic(event);
    state.session.updatedAt = event.timestamp;
    updateCounts();
    scheduleSave();
    return event;
  }

  function addSystem(message) {
    addLog("system", encoder.encode(message), message);
  }

  function appendTraffic(event) {
    $("#terminalEmpty")?.remove();
    const row = document.createElement("div");
    row.className = `traffic-row ${event.direction}`;
    row.dataset.logId = event.id;
    const direction = event.direction === "tx" ? "TX" : event.direction === "rx" ? "RX" : "SYS";
    const view = $("#terminalViewSelect").value;
    const text = event.direction === "system" ? event.label || event.ascii : event.text;
    row.innerHTML = `
      <span class="traffic-time">${escapeHtml(timeLabel(event.timestamp))}</span>
      <span class="traffic-direction">${direction}</span>
      <span class="traffic-data">
        <span class="traffic-ascii">${escapeHtml(text)}</span>
        <span class="traffic-hex">${escapeHtml(asHex(event.bytes))}</span>
      </span>`;
    row.querySelector(".traffic-ascii").style.display = view === "hex" ? "none" : "";
    row.querySelector(".traffic-hex").style.display = view === "ascii" ? "none" : "";
    $("#terminalFeed").append(row);
    state.terminalVisible.push(row);
    if (state.terminalVisible.length > 1200) state.terminalVisible.shift().remove();
    if ($("#autoScrollCheck").checked) $("#terminalFeed").scrollTop = $("#terminalFeed").scrollHeight;
  }

  function rerenderTerminal() {
    const feed = $("#terminalFeed");
    feed.innerHTML = "";
    state.terminalVisible = [];
    const events = state.session.logs.slice(-1200);
    if (!events.length) {
      feed.innerHTML = `<div class="empty-state" id="terminalEmpty"><strong>No visible traffic</strong><span>Connect or send a command to begin.</span></div>`;
      return;
    }
    events.forEach(appendTraffic);
  }

  function clearTerminalView() {
    $("#terminalFeed").innerHTML = `<div class="empty-state" id="terminalEmpty"><strong>View cleared</strong><span>The session log is preserved for export.</span></div>`;
    state.terminalVisible = [];
    toast("Terminal view cleared; recorded session data was kept.");
  }

  function portLabel(port, index) {
    const info = port.getInfo?.() || {};
    const bits = [];
    if (info.usbVendorId) bits.push(`VID ${info.usbVendorId.toString(16).padStart(4, "0").toUpperCase()}`);
    if (info.usbProductId) bits.push(`PID ${info.usbProductId.toString(16).padStart(4, "0").toUpperCase()}`);
    return `Granted serial port ${index + 1}${bits.length ? ` · ${bits.join(" / ")}` : ""}`;
  }

  function portKey(port) {
    if (!state.portIds.has(port)) state.portIds.set(port, String(state.nextPortId++));
    return state.portIds.get(port);
  }

  async function refreshPorts(preferred = null) {
    if (!("serial" in navigator)) return;
    try {
      state.ports = await navigator.serial.getPorts();
      if (preferred && !state.ports.includes(preferred)) state.ports.push(preferred);
      const select = $("#portSelect");
      select.innerHTML = "";
      if (!state.ports.length) {
        select.add(new Option("No granted ports", ""));
        state.selectedPort = null;
      } else {
        state.ports.forEach((port, index) => select.add(new Option(portLabel(port, index), portKey(port))));
        const chosen = preferred || state.selectedPort || state.ports[0];
        state.selectedPort = chosen;
        select.value = portKey(chosen);
      }
    } catch (error) {
      toast(`Could not list serial ports: ${error.message}`, "error");
    }
  }

  async function requestPort() {
    try {
      const port = await navigator.serial.requestPort();
      state.selectedPort = port;
      await refreshPorts(port);
      toast("Serial port permission granted. Click Connect when ready.");
    } catch (error) {
      if (error.name !== "NotFoundError") toast(`Port selection failed: ${error.message}`, "error");
    }
  }

  function setConnection(mode) {
    state.connected = mode === "serial" || mode === "demo";
    state.demo = mode === "demo";
    const pill = $("#connectionPill");
    pill.className = `connection-pill ${mode === "serial" ? "online" : mode === "demo" ? "demo" : "offline"}`;
    $("#connectionPillText").textContent = mode === "serial" ? "Serial connected" : mode === "demo" ? "Demo connected" : "Not connected";
    $("#connectBtn").textContent = state.connected ? "Disconnect" : "Connect";
    $("#demoBtn").disabled = state.connected;
    $("#requestPortBtn").disabled = state.connected || !("serial" in navigator);
    $("#refreshPortsBtn").disabled = state.connected || !("serial" in navigator);
    $("#portSelect").disabled = state.connected;
    ["baudSelect", "dataBitsSelect", "paritySelect", "stopBitsSelect", "flowControlSelect"].forEach((id) => {
      $(`#${id}`).disabled = state.connected;
    });
    $("#sendBtn").disabled = !state.connected;
    $("#identifyBtn").disabled = !state.connected;
    $$("#quickCommands button[data-command]").forEach((button) => (button.disabled = !state.connected));
    $("#guidedSendBtn").disabled = !state.connected;
    if ($("#detailQuery")) $("#detailQuery").disabled = !state.connected;
    $("#trafficStatus").textContent = state.connected ? (state.demo ? "Demo device ready" : "Listening for serial data") : "Idle";
  }

  function identityMeta(identity) {
    if (identity.adapterId === "vgc031") {
      return `P/N ${identity.model} · FW ${identity.firmware} · address ${identity.address}`;
    }
    const details = [];
    if (identity.serial) details.push(`S/N ${identity.serial}`);
    if (identity.firmware) details.push(`FW ${identity.firmware}`);
    if (identity.hardware) details.push(`HW ${identity.hardware}`);
    return details.join(" · ") || identity.detail || "Identity response verified";
  }

  function applyControllerProfile(adapterId) {
    const adapter = controllerRegistry.get(adapterId);
    commands = adapter?.commands?.length ? adapter.commands : vgc50xCommands;
    state.category = "All";
    state.selectedCommand = null;
    if ($("#commandSearch")) $("#commandSearch").value = "";
    renderCategories();
    renderCommands();
    rebuildGuidedCommandOptions();
    $("#commandDetail").innerHTML = `
      <div class="command-detail-empty">
        <strong>${escapeHtml(adapter?.label || "Controller")} commands loaded</strong>
        <span>Select a command to see its wire syntax and safety notes.</span>
      </div>`;

    const buttons = $$("#quickCommands button[data-command]");
    if (adapter?.quickCommands?.length) {
      // Adapter-driven quick buttons (VGC083 addressed reads, VGC094 mnemonics).
      buttons.forEach((button, index) => {
        const spec = adapter.quickCommands[index];
        button.hidden = !spec;
        if (!spec) return;
        button.dataset.command = spec.value;
        if (spec.guided) button.dataset.guided = "true";
        else delete button.dataset.guided;
        button.textContent = `${spec.value}${spec.guided ? "…" : ""}`;
        button.title = spec.title || (spec.guided ? `Enter ${spec.value} parameters` : `Send ${spec.value}`);
      });
      $("#guidedCommandBtn").hidden = !adapter.showGuidedBuilder;
    } else if (adapterId === "vgc031") {
      const vgc031Quick = [
        ["#01RD", "Read pressure"],
        ["#01VER", "Read firmware"],
        ["#01RL+", "Relay 1 on point"],
        ["#01RL-", "Relay 1 off point"],
        ["#01RH+", "Relay 2 on point"],
        ["#01RH-", "Relay 2 off point"]
      ];
      buttons.forEach((button, index) => {
        const spec = vgc031Quick[index];
        button.hidden = !spec;
        if (!spec) return;
        button.dataset.command = spec[0];
        delete button.dataset.guided;
        button.textContent = spec[0];
        button.title = spec[1];
      });
      $("#guidedCommandBtn").hidden = true;
    } else {
      const defaults = [
        ["AYT"], ["PR1"], ["PRX"], ["TID"], ["ERR"], ["MAC"], ["PNR"], ["RHR"], ["TMP"],
        ["COM", true], ["UNI", true], ["BAL", true], ["FIL", true], ["GAS", true]
      ];
      buttons.forEach((button, index) => {
        const [value, guided] = defaults[index];
        button.hidden = false;
        button.dataset.command = value;
        if (guided) button.dataset.guided = "true";
        else delete button.dataset.guided;
        button.textContent = `${value}${guided ? "…" : ""}`;
        button.title = guided ? `Enter ${value} parameters` : `Send ${value}`;
      });
      $("#guidedCommandBtn").hidden = false;
    }
  }

  function acceptIdentity(identity) {
    const changed = state.identity?.adapterId !== identity.adapterId;
    state.identity = identity;
    state.controllerAdapterId = identity.adapterId;
    state.session.device = identity;
    if (identity.adapterId === "vgc031") state.unit = "Torr";
    else if (controllerRegistry.get(identity.adapterId)?.defaultUnit) {
      state.unit = controllerRegistry.get(identity.adapterId).defaultUnit;
    }
    $("#deviceName").textContent = `${identity.controller}${identity.model ? ` · ${identity.model}` : ""}`;
    $("#deviceMeta").textContent = identityMeta(identity);
    applyControllerProfile(identity.adapterId);
    $("#trafficStatus").textContent = `${identity.controller} verified`;
    if (changed) toast(`${identity.controller} identified and verified.`);
    scheduleSave();
    if (state.identityWaiter) state.identityWaiter(identity);
  }

  function waitForIdentity(timeoutMs) {
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (state.identityWaiter === complete) state.identityWaiter = null;
        resolve(null);
      }, timeoutMs);
      function complete(identity) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (state.identityWaiter === complete) state.identityWaiter = null;
        resolve(identity);
      }
      state.identityWaiter = complete;
    });
  }

  async function identifyController() {
    if (!state.connected || state.demo || state.identifying) return state.identity;
    state.identifying = true;
    state.identity = null;
    state.controllerAdapterId = null;
    $("#deviceName").textContent = "Identifying controller…";
    const settings = collectSettings();
    $("#deviceMeta").textContent = `Safe read-only probes at ${settings.baudRate} baud`;
    $("#trafficStatus").textContent = "Running identity probes";
    addSystem("Automatic identification started. Only documented read-only commands will be sent.");

    let identity = null;
    try {
      for (const adapter of controllerRegistry.implemented) {
        if (!state.connected) break;
        for (const step of adapter.probeSteps) {
          if (!state.connected) break;
          state.activeProbe = { adapterId: adapter.id, command: step.command };
          await transmit(encoder.encode(step.text), { command: step.command, label: step.label });
          identity = await waitForIdentity(step.timeoutMs);
          if (identity) break;
          state.pendingCommand = "";
        }
        if (identity) {
          if (adapter.verifyStep) {
            const step = adapter.verifyStep;
            state.activeProbe = { adapterId: adapter.id, command: step.command };
            await transmit(encoder.encode(step.text), { command: step.command, label: step.label });
          }
          break;
        }
      }
    } finally {
      state.activeProbe = null;
      state.identityWaiter = null;
      state.identifying = false;
    }

    if (!state.connected) return null;
    if (!identity) {
      $("#deviceName").textContent = "Unknown serial controller";
      const parity = settings.parity === "none" ? "N" : settings.parity[0].toUpperCase();
      $("#deviceMeta").textContent = `No known response at ${settings.baudRate}, ${settings.dataBits}-${parity}-${settings.stopBits}`;
      $("#trafficStatus").textContent = "Connected · identity not verified";
      addSystem("No supported identity signature was received. Check baud/framing and controller address, then re-identify.");
      toast("Connected, but the controller identity could not be verified.", "warning");
    }
    return identity;
  }

  async function connectSerial() {
    if (!("serial" in navigator)) {
      toast("Web Serial is unavailable here. Use current Chrome or Edge over HTTPS.", "warning");
      return;
    }
    const selectedKey = $("#portSelect").value;
    state.selectedPort = state.ports.find((port) => portKey(port) === selectedKey) || state.selectedPort;
    if (!state.selectedPort) {
      await requestPort();
      if (!state.selectedPort) return;
    }
    try {
      const settings = collectSettings();
      await state.selectedPort.open({
        baudRate: settings.baudRate,
        dataBits: settings.dataBits,
        stopBits: settings.stopBits,
        parity: settings.parity,
        flowControl: settings.flowControl,
        bufferSize: 4096
      });
      state.port = state.selectedPort;
      setConnection("serial");
      state.session.settings = settings;
      addSystem(`Connected at ${settings.baudRate} baud, ${settings.dataBits}-${settings.parity === "none" ? "N" : settings.parity[0].toUpperCase()}-${settings.stopBits}, flow ${settings.flowControl}.`);
      state.readLoop = readSerial();
      toast("Serial connection opened.");
      await identifyController();
    } catch (error) {
      toast(`Could not open the port: ${error.message}. Close any other serial program and try again.`, "error");
    }
  }

  async function readSerial() {
    try {
      while (state.port?.readable && state.connected && !state.demo) {
        const reader = state.port.readable.getReader();
        state.reader = reader;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value?.length) receiveBytes(value);
          }
        } finally {
          reader.releaseLock();
          if (state.reader === reader) state.reader = null;
        }
      }
    } catch (error) {
      if (state.connected) {
        addSystem(`Serial read stopped: ${error.message}`);
        toast(`Serial read stopped: ${error.message}`, "error");
        await disconnect();
      }
    }
  }

  async function disconnect() {
    const wasDemo = state.demo;
    state.connected = false;
    if (state.demoTimer) clearInterval(state.demoTimer);
    state.demoTimer = null;
    try {
      if (state.reader) await state.reader.cancel();
    } catch {}
    try {
      if (state.port) await state.port.close();
    } catch (error) {
      addSystem(`Port close notice: ${error.message}`);
    }
    state.port = null;
    state.reader = null;
    state.pendingCommand = "";
    state.activeProbe = null;
    if (state.identityWaiter) state.identityWaiter(null);
    state.identityWaiter = null;
    state.identifying = false;
    setConnection("offline");
    addSystem(wasDemo ? "Demo disconnected." : "Serial port disconnected.");
    await persistSession();
  }

  async function transmit(bytes, { label = "", command = "", raw = false } = {}) {
    if (!state.connected) {
      toast("Connect to a serial port or start the demo first.", "warning");
      return false;
    }
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (command) state.pendingCommand = command.trim().toUpperCase().split(",")[0];
    addLog("tx", data, label);
    try {
      if (state.demo) {
        setTimeout(() => demoReceive(data, raw), 90);
      } else {
        const writer = state.port.writable.getWriter();
        try {
          await writer.write(data);
        } finally {
          writer.releaseLock();
        }
      }
      return true;
    } catch (error) {
      addSystem(`Write failed: ${error.message}`);
      toast(`Write failed: ${error.message}`, "error");
      return false;
    }
  }

  function receiveBytes(bytes) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    addLog("rx", data);
    let sawAck = false;
    for (const byte of data) {
      if (byte === 6) sawAck = true;
      if (byte === 21) toast("Controller returned NAK. Send ERR to read the protocol error word.", "warning");
      if (byte === 13 || byte === 10) {
        if (state.lineBytes.length) {
          parseLine(decoder.decode(new Uint8Array(state.lineBytes)).trim());
          state.lineBytes = [];
        }
      } else if (!CONTROL_NAMES[byte] || byte >= 32) {
        state.lineBytes.push(byte);
      }
    }
    if (sawAck && ($("#autoEnqCheck").checked || state.identifying) && state.pendingCommand) {
      setTimeout(() => transmit(new Uint8Array([5]), { label: "Automatic ENQ", raw: true }), 30);
    }
  }

  function parseLine(line) {
    if (!line) return;
    const pending = state.pendingCommand;
    const context = {
      probeAdapterId: state.activeProbe?.adapterId || null,
      activeAdapterId: state.controllerAdapterId,
      command: pending
    };
    const identity = controllerRegistry.identify(line, context);
    if (identity) acceptIdentity(identity);
    const adapterMeasurements = controllerRegistry.parseMeasurements(line, {
      ...context,
      activeAdapterId: identity?.adapterId || state.controllerAdapterId
    });
    adapterMeasurements.forEach((measurement) => {
      state.unit = measurement.unit || state.unit;
      recordMeasurement(
        measurement.channel,
        measurement.status,
        measurement.value,
        measurement.rawValue
      );
    });
    if (pending === "UNI" && /^\d(?:,|$)/.test(line)) {
      const code = Number(line.split(",")[0]);
      if (UNITS[code]) {
        state.unit = UNITS[code];
        [1, 2, 3, 4].forEach((channel) => $(`#channelUnit${channel}`).textContent = state.unit);
      }
    }
    // Generic status,value pair matching is a VGC50x behavior (and a fallback
    // while the controller is still unidentified). Adapters with their own
    // parseMeasurement (VGC031, VGC083, VGC094) own their measurement lines.
    const genericPairs =
      (!state.controllerAdapterId || state.controllerAdapterId === "vgc50x") &&
      !adapterMeasurements.length;
    const pairs = genericPairs
      ? [...line.matchAll(/(?:^|,)([0-7]),([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?)/gi)]
      : [];
    if (pairs.length) {
      let baseChannel = 1;
      const match = pending.match(/^PR([123])$/);
      if (match) baseChannel = Number(match[1]);
      pairs.forEach((pair, index) => recordMeasurement(match ? baseChannel : index + 1, Number(pair[1]), Number(pair[2]), pair[2]));
    }
    if (pending && !["COM"].includes(pending)) state.pendingCommand = "";
  }

  function recordMeasurement(channel, status, value, rawValue) {
    if (channel < 1 || channel > 4 || !Number.isFinite(value)) return;
    const sample = {
      timestamp: new Date().toISOString(),
      channel,
      status,
      statusText: STATUS[status]?.[0] || `Status ${status}`,
      value,
      rawValue,
      unit: state.unit
    };
    state.session.samples.push(sample);
    if (state.session.samples.length > 50000) state.session.samples.shift();
    state.lastChannels[channel] = sample;
    updateChannel(channel, sample);
    updateCounts();
    drawTrend();
    scheduleSave();
  }

  function updateChannel(channel, sample) {
    const [label, style] = STATUS[sample.status] || [`Status ${sample.status}`, "warn"];
    const card = $(`#channelCard${channel}`);
    card.className = `channel-card ${style === "ok" ? "active" : style === "bad" ? "error" : ""}`;
    const badge = $(`#channelStatus${channel}`);
    badge.className = `channel-status ${style}`;
    badge.textContent = label;
    $(`#channelValue${channel}`).textContent = Number(sample.value).toExponential(4);
    $(`#channelUnit${channel}`).textContent = sample.unit;
    $(`#channelDetail${channel}`).textContent = `raw ${sample.rawValue}`;
    $(`#channelAge${channel}`).textContent = "now";
    $("#trendCaption").textContent = `Last sample ${new Date(sample.timestamp).toLocaleTimeString()}`;
  }

  function drawTrend() {
    const canvas = $("#trendCanvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(280, rect.width);
    const height = 130;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    const themeStyles = getComputedStyle(document.documentElement);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = themeStyles.getPropertyValue("--chart-grid").trim() || "#20343e";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    const samples = state.session.samples.slice(-360).filter((sample) => Number.isFinite(sample.value) && sample.value > 0);
    if (!samples.length) return;
    const times = samples.map((sample) => new Date(sample.timestamp).getTime());
    const t0 = Math.min(...times);
    const t1 = Math.max(...times);
    const scale = $("#chartScale").value;
    const converted = samples.map((sample) => scale === "log" ? Math.log10(Math.max(sample.value, 1e-30)) : sample.value);
    let min = Math.min(...converted);
    let max = Math.max(...converted);
    if (min === max) { min -= 1; max += 1; }
    const colors = {
      1: themeStyles.getPropertyValue("--teal").trim() || "#24d3bd",
      2: themeStyles.getPropertyValue("--blue").trim() || "#69aefb",
      3: themeStyles.getPropertyValue("--amber").trim() || "#f1b557",
      4: themeStyles.getPropertyValue("--violet").trim() || "#b98cf6"
    };
    [1, 2, 3, 4].forEach((channel) => {
      const list = samples.filter((sample) => sample.channel === channel);
      if (!list.length) return;
      ctx.beginPath();
      ctx.strokeStyle = colors[channel];
      ctx.lineWidth = 1.6;
      list.forEach((sample, index) => {
        const time = new Date(sample.timestamp).getTime();
        const x = t1 === t0 ? width / 2 : ((time - t0) / (t1 - t0)) * width;
        const transformed = scale === "log" ? Math.log10(Math.max(sample.value, 1e-30)) : sample.value;
        const y = height - 7 - ((transformed - min) / (max - min)) * (height - 14);
        if (!index) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }

  function parseEscaped(text) {
    const bytes = [];
    for (let i = 0; i < text.length;) {
      const token = text.slice(i).match(/^<([A-Za-z]+)>/);
      if (token && TOKEN_BYTES[token[1].toUpperCase()] !== undefined) {
        bytes.push(TOKEN_BYTES[token[1].toUpperCase()]);
        i += token[0].length;
        continue;
      }
      if (text[i] === "\\" && i + 1 < text.length) {
        const next = text[i + 1];
        if (next === "r") { bytes.push(13); i += 2; continue; }
        if (next === "n") { bytes.push(10); i += 2; continue; }
        if (next === "t") { bytes.push(9); i += 2; continue; }
        if (next === "\\") { bytes.push(92); i += 2; continue; }
        if (next === "x" && /^[0-9a-f]{2}$/i.test(text.slice(i + 2, i + 4))) {
          bytes.push(parseInt(text.slice(i + 2, i + 4), 16));
          i += 4;
          continue;
        }
      }
      const encoded = encoder.encode(text[i]);
      bytes.push(...encoded);
      i += 1;
    }
    return new Uint8Array(bytes);
  }

  function inputBytes(includeEnding = true) {
    const text = $("#commandInput").value;
    const format = $("#inputFormatSelect").value;
    let bytes;
    if (format === "ascii") bytes = encoder.encode(text);
    else if (format === "escaped") bytes = parseEscaped(text);
    else if (format === "hex") {
      const parts = text.trim() ? text.trim().split(/[\s,;:-]+/) : [];
      if (parts.some((part) => !/^(?:0x)?[0-9a-f]{1,2}$/i.test(part))) throw new Error("Hex input must contain byte values from 00 to FF.");
      bytes = new Uint8Array(parts.map((part) => parseInt(part.replace(/^0x/i, ""), 16)));
    } else if (format === "decimal") {
      const parts = text.trim() ? text.trim().split(/[\s,;]+/) : [];
      const values = parts.map(Number);
      if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) throw new Error("Decimal bytes must be whole numbers from 0 to 255.");
      bytes = new Uint8Array(values);
    } else {
      try {
        const raw = atob(text.replace(/\s/g, ""));
        bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
      } catch {
        throw new Error("The Base64 input is not valid.");
      }
    }
    if (!includeEnding) return bytes;
    const ending = $("#lineEndingSelect").value;
    const suffix = ending === "cr" ? [13] : ending === "crlf" ? [13, 10] : ending === "lf" ? [10] : [];
    return new Uint8Array([...bytes, ...suffix]);
  }

  function previewInput() {
    try {
      const bytes = inputBytes(true);
      $("#bytePreview").textContent = asHex(bytes) || "No bytes";
      $("#composerHint").textContent = `${$("#inputFormatSelect").selectedOptions[0].text} with ${$("#lineEndingSelect").selectedOptions[0].text} · ${bytes.length} byte${bytes.length === 1 ? "" : "s"}`;
      $("#composerHint").style.color = "";
    } catch (error) {
      $("#bytePreview").textContent = "Invalid input";
      $("#composerHint").textContent = error.message;
      $("#composerHint").style.color = "var(--red)";
    }
  }

  function commandFromComposer() {
    if (!["ascii", "escaped"].includes($("#inputFormatSelect").value)) return "";
    return $("#commandInput").value.replace(/<[^>]+>|\\[rnt]/gi, "").trim();
  }

  function addressedDefinition(normalized) {
    // Addressed #aa… protocols (VGC031, VGC083): strip the two-hex address and
    // match a dictionary mnemonic at the head of the command, so a command sent
    // to a non-default address still resolves for risk confirmation. A trailing
    // lowercase "n" in a mnemonic (RLn, TZCGn, TSCGn) is a one-digit channel
    // placeholder; every other character is literal, and the mnemonic must end
    // on a non-letter boundary. That keeps RDIG from swallowing RDIGE and SE
    // from swallowing SES, resolves IG0/IG1 (and DG0/DG1) to distinct entries,
    // and still matches value commands like SB/SA/TS/TZ regardless of the value
    // typed. The longest matching mnemonic wins (RLn over RL).
    const body = normalized.replace(/^#[0-9A-F]{2}/, "");
    if (!body) return null;
    let best = null;
    for (const item of commands) {
      const channelPlaceholder = /n$/.test(item.mnemonic);
      const core = (channelPlaceholder ? item.mnemonic.slice(0, -1) : item.mnemonic).toUpperCase();
      const pattern =
        "^" +
        core.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        (channelPlaceholder ? "[0-9]" : "") +
        "(?![A-Z])";
      if (new RegExp(pattern).test(body) && (!best || item.mnemonic.length > best.mnemonic.length)) {
        best = item;
      }
    }
    return best;
  }

  function commandDefinition(value) {
    const normalized = value.trim().toUpperCase();
    const direct = commands.find((item) =>
      item.mnemonic.toUpperCase() === normalized ||
      item.query?.toUpperCase() === normalized ||
      item.example?.toUpperCase() === normalized
    );
    if (direct) return direct;
    const adapter = controllerRegistry.get(state.controllerAdapterId);
    if (adapter?.addressed) return addressedDefinition(normalized);
    // Mnemonic protocols (VGC50x, VGC094): match the mnemonic before any
    // comma-separated parameters so danger commands with values still confirm.
    const head = normalized.split(",")[0];
    return commands.find((item) => item.mnemonic.toUpperCase() === head) || null;
  }

  async function sendComposer() {
    let bytes;
    try {
      bytes = inputBytes(true);
    } catch (error) {
      toast(error.message, "error");
      return;
    }
    if (!bytes.length) {
      toast("Enter at least one byte to send.", "warning");
      return;
    }
    const full = commandFromComposer();
    const definition = commandDefinition(full);
    if (definition?.risk === "danger") {
      const okay = window.confirm(`${definition.mnemonic}: ${definition.name}\n\n${definition.note || "This command can change controller or process state."}\n\nSend it to the connected device?`);
      if (!okay) return;
    }
    await transmit(bytes, { command: full, label: full || $("#inputFormatSelect").value });
  }

  function demoResponse(command) {
    const key = command.toUpperCase().split(",")[0];
    const responses = {
      AYT: "VGC501,398-481,1784,1.08,1.0",
      TID: "NO SENSOR,NO SENSOR,NO SENSOR",
      UNI: "1",
      ERR: "0000",
      MAC: "00:19:33:50:01:84",
      PNR: "1.08",
      HDW: "1.0",
      RHR: "004218",
      TMP: "31.6",
      SPS: "0,0,0,0,0,0",
      PR1: "0,+1.1270E-06",
      PR2: "5,+7.5006E+02",
      PR3: "5,+7.5006E+02",
      PRX: "0,+1.1270E-06,5,+7.5006E+02,5,+7.5006E+02",
      COM: "0,+1.1270E-06,5,+7.5006E+02,5,+7.5006E+02"
    };
    return responses[key] || "0";
  }

  function demoReceive(bytes) {
    if (bytes.length === 1 && bytes[0] === 5) {
      const response = demoResponse(state.pendingCommand);
      receiveBytes(encoder.encode(`${response}\r\n`));
      if (state.pendingCommand === "COM") startDemoStream();
      return;
    }
    const command = decoder.decode(bytes).replace(/[\r\n]+$/g, "").trim();
    if (!command) return;
    state.pendingCommand = command.toUpperCase().split(",")[0];
    receiveBytes(new Uint8Array([6, 13, 10]));
  }

  function startDemoStream() {
    if (state.demoTimer) clearInterval(state.demoTimer);
    let phase = 0;
    state.demoTimer = setInterval(() => {
      if (!state.demo || !state.connected) return;
      phase += 0.35;
      const value = 1.1e-6 * (1 + Math.sin(phase) * 0.16);
      receiveBytes(encoder.encode(`0,+${value.toExponential(4).toUpperCase()},5,+7.5006E+02,5,+7.5006E+02\r\n`));
    }, 1000);
  }

  function startDemo() {
    setConnection("demo");
    acceptIdentity({
      adapterId: "vgc50x",
      controller: "VGC501",
      model: "398-481",
      serial: "1784",
      firmware: "1.08",
      hardware: "1.0"
    });
    state.unit = "Torr";
    $("#deviceMeta").textContent = `${identityMeta(state.identity)} · demo`;
    addSystem("Demo controller connected at 115200 baud. No physical port is being used.");
    toast("Interactive VGC501 demo started.");
  }

  function renderCategories() {
    const strip = $("#categoryStrip");
    strip.innerHTML = "";
    CATEGORIES.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = category;
      button.className = category === state.category ? "active" : "";
      button.addEventListener("click", () => {
        state.category = category;
        renderCategories();
        renderCommands();
      });
      strip.append(button);
    });
  }

  function filteredCommands() {
    const query = $("#commandSearch").value.trim().toLowerCase();
    return commands.filter((item) => {
      const inCategory = state.category === "All" || item.category === state.category;
      const haystack = `${item.mnemonic} ${item.name} ${item.description} ${item.syntax}`.toLowerCase();
      return inCategory && (!query || haystack.includes(query));
    });
  }

  function renderCommands() {
    const list = $("#commandList");
    const filtered = filteredCommands();
    $("#commandCount").textContent = `${filtered.length}/${commands.length}`;
    list.innerHTML = "";
    if (!filtered.length) {
      list.innerHTML = `<div class="empty-sessions">No matching commands.</div>`;
      return;
    }
    filtered.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `command-row ${state.selectedCommand?.mnemonic === item.mnemonic ? "active" : ""}`;
      button.innerHTML = `<code>${escapeHtml(item.mnemonic)}</code><span>${escapeHtml(item.name)}</span><i class="risk-dot ${item.risk}" title="${escapeHtml(item.risk)}"></i>`;
      button.addEventListener("click", () => selectCommand(item));
      list.append(button);
    });
  }

  function selectCommand(item) {
    state.selectedCommand = item;
    renderCommands();
    const riskText = item.risk === "danger" ? "Actuates / changes state" : item.risk === "caution" ? "Writes settings" : "Read / low risk";
    $("#commandDetail").innerHTML = `
      <div class="detail-top">
        <div>
          <div class="detail-mnemonic"><code>${escapeHtml(item.mnemonic)}</code><span class="detail-category">${escapeHtml(item.category)}</span></div>
          <div class="detail-description">${escapeHtml(item.name)} — ${escapeHtml(item.description)}</div>
        </div>
        <span class="risk-label ${item.risk}">${escapeHtml(riskText)}</span>
      </div>
      <div class="detail-block"><span>Syntax</span><code>${escapeHtml(item.syntax)}</code></div>
      ${item.response ? `<div class="detail-block"><span>Response</span><code>${escapeHtml(item.response)}</code></div>` : ""}
      ${item.note ? `<div class="detail-note">${escapeHtml(item.note)}</div>` : ""}
      <div class="detail-actions">
        <button class="button secondary" id="detailInsert" type="button">${isParameterized(item) ? "Configure inputs" : "Insert example"}</button>
        <button class="button primary" id="detailQuery" type="button" ${state.connected ? "" : "disabled"}>Query now</button>
      </div>`;
    $("#detailInsert").addEventListener("click", () => {
      if (isParameterized(item)) openGuidedCommand(item);
      else putCommand(item.example);
    });
    $("#detailQuery").addEventListener("click", () => {
      putCommand(item.query || item.mnemonic);
      sendComposer();
    });
  }

  function putCommand(value) {
    $("#inputFormatSelect").value = "ascii";
    $("#commandInput").value = value;
    $("#lineEndingSelect").value = "cr";
    previewInput();
    $("#commandInput").focus();
  }

  function commandParameters(item) {
    const match = item.syntax.match(/\[\s*,\s*([^\]]+)\]/);
    return match ? match[1].split(",").map((parameter) => parameter.trim()).filter(Boolean) : [];
  }

  function isParameterized(item) {
    return commandParameters(item).length > 0;
  }

  function parameterLabel(parameter) {
    const labels = {
      a: "Formula factor A",
      b: "Formula factor B",
      c: "Formula factor C",
      ch1: "Channel 1 selector",
      ch2: "Channel 2 selector",
      ch3: "Channel 3 selector",
      command: "Logger action",
      dhcp: "Address assignment",
      file: "File name",
      filename: "Log file name",
      gateway: "Gateway address",
      ip: "IP address",
      lower: "Lower pressure threshold",
      mask: "Subnet mask",
      offMode: "Turn-off mode",
      offThreshold: "Turn-off pressure threshold",
      onMode: "Turn-on mode",
      onThreshold: "Turn-on pressure threshold",
      separator: "Decimal separator",
      set: "Action",
      upper: "Upper pressure threshold"
    };
    if (labels[parameter]) return labels[parameter];
    const numbered = parameter.match(/^(.+?)([1-6])$/);
    const plain = (numbered?.[1] ?? parameter)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replaceAll("_", " ")
      .replace(/^\w/, (letter) => letter.toUpperCase());
    return numbered ? `Channel ${numbered[2]} ${plain.toLowerCase()}` : plain;
  }

  function parameterSpec(item, parameter, index) {
    // VGC094-specific option sets are resolved before the shared GUIDED_FIELDS
    // table so its four-channel gas/filter orders and the extra Ampere unit win.
    if (state.controllerAdapterId === "vgc094") {
      if (/^gas[1-4]$/.test(parameter)) {
        return {
          type: "select",
          options: choice([
            ["0", "Nitrogen / air (N₂)"],
            ["1", "Helium (He)"],
            ["2", "Neon (Ne)"],
            ["3", "Argon (Ar)"],
            ["4", "Krypton (Kr)"],
            ["5", "Xenon (Xe)"],
            ["6", "Hydrogen (H₂)"],
            ["7", "Other gas"]
          ]),
          defaultValue: "0",
          label: parameterLabel(parameter),
          help: "VGC094 gas order differs from the VGC50x."
        };
      }
      if (/^filter[1-4]$/.test(parameter)) {
        return {
          type: "select",
          options: choice([["0", "Off"], ["1", "100 Hz"], ["2", "10 Hz"], ["3", "1 Hz"], ["4", "0.1 Hz"]]),
          defaultValue: "2",
          label: parameterLabel(parameter),
          help: "Filter cut-off frequency."
        };
      }
      if (parameter === "unit") {
        return {
          type: "select",
          options: choice([
            ["0", "mbar / bar"],
            ["1", "Torr"],
            ["2", "Pascal (Pa)"],
            ["3", "micron"],
            ["4", "hectopascal (hPa)"],
            ["5", "Volt"],
            ["6", "Ampere (A)"]
          ]),
          defaultValue: "0",
          label: parameterLabel(parameter),
          help: "The VGC094 adds Ampere (analog output current) as unit 6."
        };
      }
    }

    const direct = GUIDED_FIELDS[item.mnemonic]?.[parameter];
    if (direct) return { ...direct };

    const exampleValue = item.example.split(",").slice(1)[index] ?? "";
    if (/^filter[1-3]$/.test(parameter)) return { ...FILTER_MODE, label: parameterLabel(parameter) };
    if (/^gas[1-3]$/.test(parameter)) return { ...GAS_TYPE, label: parameterLabel(parameter) };
    if (/^state[1-3]?$/.test(parameter)) return { ...CHANNEL_STATE, label: parameterLabel(parameter) };
    if (item.mnemonic === "EUM" && /^mode[1-3]$/.test(parameter)) {
      return {
        type: "select",
        options: choice([["0", "Manual emission"], ["1", "Automatic emission"]]),
        defaultValue: "1",
        label: parameterLabel(parameter)
      };
    }
    if (item.mnemonic === "FUM" && /^mode[1-3]$/.test(parameter)) {
      return {
        type: "select",
        options: choice([["0", "Automatic filament"], ["1", "Filament 1"], ["2", "Filament 2"]]),
        defaultValue: "0",
        label: parameterLabel(parameter)
      };
    }
    if (item.mnemonic === "DCD" && /^mode[1-3]$/.test(parameter)) {
      return {
        type: "select",
        options: choice([["0", "Automatic"], ["1", "1 digit"], ["2", "2 digits"], ["3", "3 digits"], ["4", "4 digits"]]),
        defaultValue: "0",
        label: parameterLabel(parameter)
      };
    }
    if (parameter === "percent") {
      return {
        type: "number",
        min: "0",
        max: "100",
        step: "1",
        defaultValue: exampleValue || "50",
        label: "Percentage",
        help: "Enter a whole percentage from 0 to 100."
      };
    }
    if (/^(?:factor|factor[1-3])$/.test(parameter)) {
      return {
        type: "number",
        min: "0.1",
        max: "10",
        step: "any",
        defaultValue: exampleValue || "1",
        label: parameterLabel(parameter),
        help: "Use a decimal value from 0.1 to 10."
      };
    }
    if (/threshold|lower|upper|value/i.test(parameter)) {
      return {
        type: "number",
        step: "any",
        defaultValue: exampleValue,
        placeholder: "e.g. 1e-6",
        label: parameterLabel(parameter),
        help: "Scientific notation such as 1e-6 is accepted."
      };
    }
    if (/^(?:ch[1-3]|channel)$/.test(parameter)) {
      return {
        type: "number",
        min: "0",
        max: "3",
        step: "1",
        defaultValue: exampleValue || String(index + 1),
        label: parameterLabel(parameter),
        help: "Channel selectors are 0 through 3."
      };
    }
    if (/^date[1-3]?$/.test(parameter) || parameter === "yyyy-mm-dd") {
      return {
        type: "date",
        defaultValue: exampleValue || new Date().toLocaleDateString("en-CA"),
        label: parameterLabel(parameter)
      };
    }
    if (parameter === "hh:mm") {
      return {
        type: "time",
        defaultValue: new Date().toTimeString().slice(0, 5),
        label: "Controller time"
      };
    }
    if (["ip", "mask", "gateway"].includes(parameter)) {
      return {
        type: "text",
        inputMode: "decimal",
        defaultValue: exampleValue,
        placeholder: parameter === "mask" ? "255.255.255.0" : "192.168.1.100",
        label: parameterLabel(parameter)
      };
    }
    if (parameter === "filename" || parameter === "file") {
      return {
        type: "text",
        maxLength: parameter === "filename" ? "7" : undefined,
        defaultValue: exampleValue,
        placeholder: parameter === "filename" ? "LOG0001" : "SETUP01",
        label: parameterLabel(parameter)
      };
    }
    return {
      type: /mode|code|interval|assignment|pattern/i.test(parameter) ? "number" : "text",
      step: /mode|code|interval|assignment|pattern/i.test(parameter) ? "1" : undefined,
      defaultValue: exampleValue,
      placeholder: `Enter ${parameterLabel(parameter).toLowerCase()}`,
      label: parameterLabel(parameter)
    };
  }

  function selectedGuidedCommand() {
    return commands.find((item) => item.mnemonic === $("#guidedCommandSelect").value);
  }

  function setGuidedMode() {
    const settingValues = $('input[name="guidedMode"]:checked').value === "set";
    const fields = $("#guidedFields");
    fields.hidden = !settingValues;
    $$("[data-parameter]", fields).forEach((input) => {
      input.disabled = !settingValues;
    });
    updateGuidedPreview();
  }

  function guidedCommandValue(validate = false) {
    const item = selectedGuidedCommand();
    if (!item) return null;
    if ($('input[name="guidedMode"]:checked').value === "query") return item.mnemonic;
    const form = $("#guidedCommandForm");
    if (validate && !form.reportValidity()) return null;
    const values = $$("[data-parameter]", $("#guidedFields")).map((input) => input.value.trim());
    if (!validate && values.some((value) => !value)) {
      const specs = commandParameters(item).map((parameter) => `‹${parameterLabel(parameter)}›`);
      return `${item.mnemonic},${values.map((value, index) => value || specs[index]).join(",")}`;
    }
    return `${item.mnemonic},${values.join(",")}`;
  }

  function updateGuidedPreview() {
    $("#guidedCommandPreview").textContent = guidedCommandValue(false) || "—";
  }

  function renderGuidedCommand() {
    const item = selectedGuidedCommand();
    if (!item) return;
    $("#guidedCommandName").textContent = `${item.mnemonic} · ${item.name}`;
    $("#guidedCommandDescription").textContent = item.description;
    const risk = $("#guidedCommandRisk");
    risk.className = `risk-label ${item.risk}`;
    risk.textContent = item.risk === "danger" ? "Actuates / changes state" :
      item.risk === "caution" ? "Writes settings" : "Read / low risk";
    const note = $("#guidedCommandNote");
    note.hidden = !item.note;
    note.textContent = item.note;

    const fields = $("#guidedFields");
    fields.innerHTML = "";
    commandParameters(item).forEach((parameter, index) => {
      const spec = parameterSpec(item, parameter, index);
      const label = document.createElement("label");
      label.className = "field";
      const labelText = document.createElement("span");
      labelText.className = "field-label";
      labelText.textContent = spec.label || parameterLabel(parameter);
      label.append(labelText);

      let input;
      if (spec.type === "select") {
        input = document.createElement("select");
        spec.options.forEach((option) => input.add(new Option(option.label, option.value)));
      } else {
        input = document.createElement("input");
        input.type = spec.type || "text";
        ["min", "max", "step", "maxLength", "inputMode"].forEach((attribute) => {
          if (spec[attribute] !== undefined) input.setAttribute(attribute, spec[attribute]);
        });
        if (spec.placeholder) input.placeholder = spec.placeholder;
      }
      input.dataset.parameter = parameter;
      input.required = true;
      input.value = spec.defaultValue ?? "";
      input.addEventListener("input", updateGuidedPreview);
      input.addEventListener("change", updateGuidedPreview);
      label.append(input);

      const help = document.createElement("small");
      help.className = "guided-field-help";
      help.textContent = spec.help || `Protocol parameter: ${parameter}`;
      label.append(help);
      fields.append(label);
    });
    setGuidedMode();
  }

  function openGuidedCommand(item = null) {
    const select = $("#guidedCommandSelect");
    if (item && isParameterized(item)) select.value = item.mnemonic;
    if (!select.value) select.value = "COM";
    $('input[name="guidedMode"][value="set"]').checked = true;
    renderGuidedCommand();
    $("#guidedSendBtn").disabled = !state.connected;
    if (!$("#guidedCommandDialog").open) $("#guidedCommandDialog").showModal();
  }

  function rebuildGuidedCommandOptions() {
    const select = $("#guidedCommandSelect");
    if (!select) return;
    select.innerHTML = "";
    CATEGORIES.filter((category) => category !== "All").forEach((category) => {
      const inCategory = commands.filter((item) => item.category === category && isParameterized(item));
      if (!inCategory.length) return;
      const group = document.createElement("optgroup");
      group.label = category;
      inCategory.forEach((item) => group.append(new Option(`${item.mnemonic} — ${item.name}`, item.mnemonic)));
      select.append(group);
    });
    const options = [...select.options];
    select.value = options.some((option) => option.value === "COM")
      ? "COM"
      : (options[0]?.value ?? "");
    renderGuidedCommand();
  }

  function initGuidedCommands() {
    const select = $("#guidedCommandSelect");
    rebuildGuidedCommandOptions();
    select.addEventListener("change", renderGuidedCommand);
    $$('input[name="guidedMode"]').forEach((input) => input.addEventListener("change", setGuidedMode));
    $("#guidedCommandBtn").addEventListener("click", () => openGuidedCommand());
    $("#guidedInsertBtn").addEventListener("click", () => {
      const command = guidedCommandValue(true);
      if (!command) return;
      $("#guidedCommandDialog").close();
      putCommand(command);
      toast(`${command} inserted. Review it, then send when ready.`);
    });
    $("#guidedCommandForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const command = guidedCommandValue(true);
      if (!command) return;
      if (!state.connected) {
        toast("Connect to a serial port or start the demo before sending.", "warning");
        return;
      }
      $("#guidedCommandDialog").close();
      putCommand(command);
      sendComposer();
    });
    renderGuidedCommand();
  }

  function initDictionary() {
    renderCategories();
    renderCommands();
    $("#commandSearch").addEventListener("input", renderCommands);
  }

  function dbRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function openDb() {
    if (!("indexedDB" in window)) return null;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("vgc50x-console", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("sessions", { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function scheduleSave() {
    if (!$("#autosaveCheck")?.checked || !state.db) return;
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(persistSession, 450);
  }

  async function persistSession() {
    if (!$("#autosaveCheck")?.checked || !state.db) return;
    state.session.name = $("#sessionName").value.trim() || "INFICON controller session";
    state.session.updatedAt = new Date().toISOString();
    state.session.settings = collectSettings();
    try {
      const transaction = state.db.transaction("sessions", "readwrite");
      transaction.objectStore("sessions").put(structuredClone(state.session));
      await new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      toast(`Local autosave failed: ${error.message}`, "error");
    }
  }

  async function allSessions() {
    if (!state.db) return [];
    const transaction = state.db.transaction("sessions", "readonly");
    const result = await dbRequest(transaction.objectStore("sessions").getAll());
    return result.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  async function showSessions() {
    const sessions = await allSessions();
    const host = $("#savedSessions");
    host.innerHTML = "";
    if (!sessions.length) {
      host.innerHTML = `<div class="empty-sessions">No locally saved sessions.</div>`;
    } else {
      sessions.forEach((session) => {
        const row = document.createElement("div");
        row.className = "saved-session";
        row.innerHTML = `
          <div><strong>${escapeHtml(session.name)}</strong><span>${new Date(session.updatedAt).toLocaleString()} · ${(session.logs || []).length} events · ${(session.samples || []).length} samples</span></div>
          <div class="session-actions"><button data-action="load" type="button">Load</button><button data-action="delete" class="delete" type="button">Delete</button></div>`;
        $('[data-action="load"]', row).addEventListener("click", () => loadSession(session));
        $('[data-action="delete"]', row).addEventListener("click", () => deleteSession(session.id));
        host.append(row);
      });
    }
    if (!$("#sessionsDialog").open) $("#sessionsDialog").showModal();
  }

  async function loadSession(session) {
    if (state.connected) {
      toast("Disconnect before loading a different session.", "warning");
      return;
    }
    state.session = structuredClone(session);
    state.session.logs ||= [];
    state.session.samples ||= [];
    state.identity = session.device || null;
    $("#sessionName").value = session.name || "INFICON controller session";
    if (state.identity) {
      state.identity.adapterId ||= state.identity.controller === "VGC031" ? "vgc031" : "vgc50x";
      state.controllerAdapterId = state.identity.adapterId;
      applyControllerProfile(state.controllerAdapterId);
      $("#deviceName").textContent = `${state.identity.controller} · ${state.identity.model}`;
      $("#deviceMeta").textContent = identityMeta(state.identity);
    }
    state.lastChannels = {};
    state.session.samples.slice(-1000).forEach((sample) => state.lastChannels[sample.channel] = sample);
    Object.entries(state.lastChannels).forEach(([channel, sample]) => updateChannel(Number(channel), sample));
    rerenderTerminal();
    updateCounts();
    drawTrend();
    $("#sessionsDialog").close();
    toast("Saved session loaded.");
  }

  async function deleteSession(id) {
    if (!window.confirm("Delete this locally saved session? Export it first if you need a copy.")) return;
    const transaction = state.db.transaction("sessions", "readwrite");
    transaction.objectStore("sessions").delete(id);
    await new Promise((resolve) => (transaction.oncomplete = resolve));
    await showSessions();
    toast("Local session deleted.");
  }

  async function newSession() {
    if (state.connected) {
      toast("Disconnect before starting a new session.", "warning");
      return;
    }
    await persistSession();
    state.session = freshSession($("#sessionName").value.trim() || "INFICON controller session");
    state.identity = null;
    state.controllerAdapterId = null;
    applyControllerProfile("vgc50x");
    state.unit = "unit";
    state.lastChannels = {};
    $("#deviceName").textContent = "No controller identified";
    $("#deviceMeta").textContent = "Identified automatically after connecting";
    [1, 2, 3, 4].forEach((channel) => {
      $(`#channelCard${channel}`).className = "channel-card";
      $(`#channelStatus${channel}`).className = "channel-status idle";
      $(`#channelStatus${channel}`).textContent = "Waiting";
      $(`#channelValue${channel}`).textContent = "—";
      $(`#channelUnit${channel}`).textContent = "unit";
      $(`#channelDetail${channel}`).textContent = "No measurement received";
      $(`#channelAge${channel}`).textContent = "—";
    });
    rerenderTerminal();
    updateCounts();
    drawTrend();
    toast("New local session started.");
  }

  function filename(ext, suffix = "") {
    const safe = (state.session.name || "vgc50x-session").replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${safe || "vgc50x-session"}${suffix ? `-${suffix}` : ""}-${stamp}.${ext}`;
  }

  function download(content, name, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(value) {
    let text = String(value ?? "");
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }

  function exportSession(type) {
    state.session.name = $("#sessionName").value.trim() || "INFICON controller session";
    state.session.settings = collectSettings();
    if (type === "json") {
      download(JSON.stringify(state.session, null, 2), filename("json"), "application/json");
    } else if (type === "transcript") {
      const header = `VGC Serial Communicator\nSession: ${state.session.name}\nStarted: ${state.session.startedAt}\nDevice: ${state.identity ? JSON.stringify(state.identity) : "not identified"}\n\n`;
      const rows = state.session.logs.map((event) => `${event.timestamp}  ${event.direction.toUpperCase().padEnd(6)}  ${event.text}${event.bytes.length ? `  [${asHex(event.bytes)}]` : ""}`);
      download(header + rows.join("\n"), filename("txt", "transcript"), "text/plain");
    } else if (type === "logs") {
      const header = ["timestamp", "direction", "label", "text", "hex"].map(csvCell).join(",");
      const rows = state.session.logs.map((event) => [event.timestamp, event.direction, event.label, event.text, asHex(event.bytes)].map(csvCell).join(","));
      download([header, ...rows].join("\r\n"), filename("csv", "traffic"), "text/csv");
    } else {
      const header = ["timestamp", "channel", "status_code", "status", "value", "unit", "raw_value"].map(csvCell).join(",");
      const rows = state.session.samples.map((sample) => [sample.timestamp, sample.channel, sample.status, sample.statusText, sample.value, sample.unit, sample.rawValue].map(csvCell).join(","));
      download([header, ...rows].join("\r\n"), filename("csv", "measurements"), "text/csv");
    }
    toast("Export created.");
  }

  async function importSession(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.logs) || !Array.isArray(parsed.samples)) throw new Error("This is not a VGC Serial Communicator session export.");
      parsed.schema ||= "vgc50x-session/v1";
      parsed.id = crypto.randomUUID();
      parsed.name = `${parsed.name || "Imported session"} (imported)`;
      parsed.updatedAt = new Date().toISOString();
      const transaction = state.db.transaction("sessions", "readwrite");
      transaction.objectStore("sessions").put(parsed);
      await new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
      await showSessions();
      toast("Session imported into local history.");
    } catch (error) {
      toast(`Import failed: ${error.message}`, "error");
    } finally {
      $("#importSessionInput").value = "";
    }
  }

  function openHelp(section = "help-connect") {
    $$(".help-nav button").forEach((button) => button.classList.toggle("active", button.dataset.helpTarget === section));
    $$(".help-section").forEach((article) => article.classList.toggle("active", article.id === section));
    if (!$("#helpDialog").open) $("#helpDialog").showModal();
  }

  function initDialogs() {
    $("#helpBtn").addEventListener("click", () => openHelp());
    $("#exportBtn").addEventListener("click", () => {
      updateCounts();
      $("#exportDialog").showModal();
    });
    $$(".modal-close").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
    $$(".modal").forEach((dialog) => dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    }));
    $$(".help-nav button").forEach((button) => button.addEventListener("click", () => openHelp(button.dataset.helpTarget)));
    $$(".export-option").forEach((button) => button.addEventListener("click", () => exportSession(button.dataset.export)));
    $("#sessionsBtn").addEventListener("click", showSessions);
    $("#importSessionInput").addEventListener("change", (event) => event.target.files[0] && importSession(event.target.files[0]));
  }

  function initEvents() {
    $("#requestPortBtn").addEventListener("click", requestPort);
    $("#refreshPortsBtn").addEventListener("click", () => refreshPorts());
    $("#portSelect").addEventListener("change", () => {
      state.selectedPort = state.ports.find((port) => portKey(port) === $("#portSelect").value) || null;
    });
    $("#connectBtn").addEventListener("click", () => state.connected ? disconnect() : connectSerial());
    $("#demoBtn").addEventListener("click", startDemo);
    $("#sendBtn").addEventListener("click", sendComposer);
    $("#identifyBtn").addEventListener("click", identifyController);
    $$("#quickCommands button[data-command]").forEach((button) => button.addEventListener("click", () => {
      const item = commands.find((command) => command.mnemonic === button.dataset.command);
      if (button.dataset.guided === "true" && item) {
        openGuidedCommand(item);
        return;
      }
      putCommand(button.dataset.command);
      sendComposer();
    }));
    $("#clearTerminalBtn").addEventListener("click", clearTerminalView);
    $("#terminalViewSelect").addEventListener("change", rerenderTerminal);
    ["commandInput", "inputFormatSelect", "lineEndingSelect"].forEach((id) => $(`#${id}`).addEventListener("input", previewInput));
    $("#commandInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        sendComposer();
      }
    });
    $("#newSessionBtn").addEventListener("click", newSession);
    $("#sessionName").addEventListener("input", scheduleSave);
    $("#autosaveCheck").addEventListener("change", () => {
      localStorage.setItem("vgc50x-autosave", $("#autosaveCheck").checked ? "1" : "0");
      scheduleSave();
    });
    $("#chartScale").addEventListener("change", drawTrend);
    window.addEventListener("resize", drawTrend);
    window.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        $("#commandSearch").focus();
      }
    });
    window.addEventListener("beforeunload", () => {
      if (state.reader) state.reader.cancel().catch(() => {});
      persistSession();
    });
    if ("serial" in navigator) {
      navigator.serial.addEventListener("connect", () => refreshPorts());
      navigator.serial.addEventListener("disconnect", (event) => {
        if (event.target === state.port) disconnect();
        refreshPorts();
      });
    }
  }

  async function init() {
    initTheme();
    initDictionary();
    initGuidedCommands();
    initDialogs();
    initEvents();
    setConnection("offline");
    const supported = "serial" in navigator && window.isSecureContext;
    const support = $("#browserSupport");
    support.classList.add(supported ? "supported" : "unsupported");
    support.querySelector("span").textContent = supported
      ? "Web Serial ready · permission required"
      : "Web Serial needs Chrome/Edge over HTTPS";
    $("#requestPortBtn").disabled = !supported;
    $("#refreshPortsBtn").disabled = !supported;
    if (!supported) $("#portSelect").innerHTML = `<option>Web Serial unavailable</option>`;
    else await refreshPorts();
    $("#autosaveCheck").checked = localStorage.getItem("vgc50x-autosave") !== "0";
    try {
      state.db = await openDb();
    } catch (error) {
      $("#autosaveCheck").checked = false;
      $("#autosaveCheck").disabled = true;
      toast(`Local session database unavailable: ${error.message}`, "warning");
    }
    updateCounts();
    previewInput();
    drawTrend();
  }

  init();
})();
