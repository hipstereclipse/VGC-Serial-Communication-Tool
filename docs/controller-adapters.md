# Controller adapter framework

Controller-specific serial behavior lives in `public/controllers.js`. The UI asks
the registry for implemented adapters, runs only their read-only `probeSteps`,
and routes complete response lines back through `identify()` and
`parseMeasurement()`.

## Adapter contract

Each adapter has:

- `id`, `family`, and `label` for stable identity and UI text.
- `implementation`: `"complete"` enables probing; `"skeleton"` keeps the
  adapter inert.
- `manualDefaults` for documented factory framing.
- `probeSteps`: ordered, read-only byte strings used after Connect.
- `verifyStep`: an optional second read sent only after identity is verified.
- `identify(line, context)`: returns a normalized identity or `null`.
- `parseMeasurement(line, context)`: returns zero or more normalized pressure
  samples (channel 1–4, `status`, `value`, `rawValue`, and optional `unit`).
- `commands`: optional controller-specific command reference entries.

The UI also reads these optional adapter fields when present, so a new
controller can be added without editing `public/app.js`:

- `quickCommands`: `[{ value, title, guided? }]` — the terminal quick-command
  buttons for this controller.
- `showGuidedBuilder`: `true` to keep the guided-command builder (comma
  parameter protocols); omit for positional/addressed protocols.
- `addressed`: `true` for `#aa…` framed protocols — used to resolve the
  leading mnemonic for risk confirmation regardless of the device address.
- `defaultUnit`: the pressure unit assumed after identification when the
  protocol has no unit read-back.
- `detail`: a short identity line shown when the AYT-style serial/firmware
  fields are not available.

Identity matchers must be conservative. A generic version-number response is
not enough when multiple controller families can produce the same shape. Use
the active probe command plus a model-specific signature. When two models are
indistinguishable on the wire, identify them together and document it.

## Implemented adapters

### VGC50x

Uses `AYT<CR>`, followed by the controller's ACK and the host's ENQ. The
identity response identifies VGC501, VGC502, or VGC503 directly.

### VGC031

Uses the documented factory defaults of 19200 baud, 8-N-1, and address `01`.
All commands begin with `#`, responses begin with `*`, and frames end in CR.

- Probe: `#01VER<CR>`
- Identity signature: software part number `05041` from the documented `VER`
  response
- Verification/pressure read: `#01RD<CR>`
- Pressure unit: Torr
- Product part number: 399-570

If the front-panel baud, framing, or address was changed, select the matching
serial settings and edit the address in commands before use.

### VGC083 A / B / C

Uses the factory INFICON RS232/RS485 command protocol: host frames begin with
`#aa` (address, default `01`), responses begin with `*aa`, errors with `?aa`,
and frames end in CR. There is no ACK/ENQ handshake. Pressure follows the
front-panel unit (Torr by default); an ion gauge that is off, an over-ranged
convection gauge, or an unpowered analog input all report the `1.10E+03`
over-range sentinel.

- **VGC083A / VGC083B (hot cathode).** A and B share identical firmware and are
  indistinguishable on the serial interface (they differ only in the attached
  gauge head and degas method), so both auto-identify as the combined
  **VGC083A/B** (adapter `vgc083a`; `vgc083b` is a wire-identical alias that
  never self-claims). Probe: `#01RF` (get filament selection — only hot-cathode
  units answer it). Verification: `#01RDCG1`.
- **VGC083C (cold cathode).** No filament, degas, or emission commands. Probe:
  `#01IGS`, gated to its own probe so it can never claim a hot-cathode unit that
  answers the same status read; the hot-cathode `#01RF` probe runs first, so a
  hot-cathode unit is already claimed before the cold-cathode probe would run.

These adapters assume the factory INFICON protocol. If the controller is set to
a Granville-Phillips (GP 307/358/350) compatibility mode instead, the `#aa`
probes will not match — restore the INFICON COM type or use the terminal.

### VGC094

Uses the INFICON mnemonics protocol with the same ACK/ENQ handshake as the
VGC50x: enable **Auto ENQ after ACK**. Probe: `AYT`, which returns
`VGC094,398-401,serial,firmware,hardware`; identification requires both the
`VGC094` model name and the `398-401` product part number. Four measurement
channels (A1, A2, B1, B2) map to console channels 1–4. `PA1`/`PA2`/`PB1`/`PB2`
read one channel; `PRX` and `COM` frames carry all four. RS485 additionally
prefixes an `<ESC>`+address node selector, which the console does not send by
default.

## Safety rule

Automatic probing must contain read-only commands only. Configuration,
calibration, relay, reset, emission, and degas commands belong in the command
dictionary with `risk: "danger"` so the UI requires explicit confirmation.
