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
  samples.
- `commands`: optional controller-specific command reference entries.

Identity matchers must be conservative. A generic version-number response is
not enough when multiple controller families can produce the same shape. Use
the active probe command plus a model-specific signature, or leave the adapter
as a skeleton.

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

## Skeletons

`vgc083a`, `vgc083b`, `vgc083c`, and `vgc094` are registered but disabled.
Their `probeSteps`, commands, and parsers are intentionally empty, so they
cannot claim a device accidentally.

For VGC083 work, first choose which configured protocol is supported (INFICON
RS232/RS485 or one of the GP compatibility modes). Then add a model-specific
identity signature that distinguishes A, B, and C before changing
`implementation` to `"complete"`.

For VGC094, select the installed plug-in interface/board and its applicable
communication manual before implementing the transport. The plug-in-board
operating manual alone does not define one universal serial identity exchange.

## Safety rule

Automatic probing must contain read-only commands only. Configuration,
calibration, relay, reset, emission, and degas commands belong in the command
dictionary with `risk: "danger"` so the UI requires explicit confirmation.
