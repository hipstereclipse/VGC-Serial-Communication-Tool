import Script from "next/script";

function Icon({ name, size = 18 }) {
  const paths = {
    plug: (
      <>
        <path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-5 5v5M8 21h8" />
      </>
    ),
    terminal: (
      <>
        <path d="m5 7 4 4-4 4M11 15h6" />
        <rect x="3" y="4" width="18" height="16" rx="2" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.7 9a2.4 2.4 0 1 1 3.2 2.27c-.64.26-.9.73-.9 1.48V13M12 17h.01" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
        <path d="M5 19h14" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 6v5h-5M4 18v-5h5" />
        <path d="M18.5 9A7 7 0 0 0 6 6.5L4 11M5.5 15A7 7 0 0 0 18 17.5l2-4.5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    send: (
      <>
        <path d="m21 3-7.6 18-4.2-7.9L3 9.5z" />
        <path d="M9.2 13.1 21 3" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V5M4 20h16" />
        <path d="m7 16 4-5 3 3 5-8" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.8 2.9 8.1 7 10 4.1-1.9 7-5.2 7-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />
  };

  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function ChannelCard({ channel }) {
  return (
    <article className="channel-card" id={`channelCard${channel}`}>
      <div className="channel-heading">
        <span className="channel-label">CH {channel}</span>
        <span className="channel-status idle" id={`channelStatus${channel}`}>
          Waiting
        </span>
      </div>
      <div className="channel-reading">
        <span className="channel-value" id={`channelValue${channel}`}>
          —
        </span>
        <span className="channel-unit" id={`channelUnit${channel}`}>
          unit
        </span>
      </div>
      <div className="channel-meta">
        <span id={`channelDetail${channel}`}>No measurement received</span>
        <span id={`channelAge${channel}`}>—</span>
      </div>
    </article>
  );
}

export default function Page() {
  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <Icon name="pulse" size={24} />
            </div>
            <div>
              <div className="brand-title">VGC50x Serial Console</div>
              <div className="brand-subtitle">VGC501 · VGC502 · VGC503</div>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="connection-pill offline" id="connectionPill">
              <span className="status-dot" />
              <span id="connectionPillText">Not connected</span>
            </div>
            <button className="icon-button labeled" id="helpBtn" type="button">
              <Icon name="help" />
              <span>Help</span>
            </button>
            <button className="button secondary" id="exportBtn" type="button">
              <Icon name="download" />
              Export
            </button>
          </div>
        </header>

        <div className="workspace">
          <aside className="left-rail">
            <section className="panel connection-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Connection</p>
                  <h2>Serial device</h2>
                </div>
                <button
                  className="icon-button"
                  id="refreshPortsBtn"
                  type="button"
                  title="Refresh granted ports"
                  aria-label="Refresh granted ports"
                >
                  <Icon name="refresh" />
                </button>
              </div>

              <div className="browser-support" id="browserSupport">
                <Icon name="shield" size={16} />
                <span>Checking Web Serial support…</span>
              </div>

              <label className="field">
                <span className="field-label">Available ports</span>
                <select id="portSelect" aria-label="Available serial ports">
                  <option value="">No granted ports</option>
                </select>
              </label>

              <button className="button secondary full" id="requestPortBtn" type="button">
                <Icon name="plug" />
                Select a serial port
              </button>

              <div className="settings-grid">
                <label className="field">
                  <span className="field-label">Baud</span>
                  <select id="baudSelect">
                    <option>9600</option>
                    <option>19200</option>
                    <option>38400</option>
                    <option>57600</option>
                    <option selected>115200</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Data bits</span>
                  <select id="dataBitsSelect">
                    <option selected>8</option>
                    <option>7</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Parity</span>
                  <select id="paritySelect">
                    <option selected value="none">
                      None
                    </option>
                    <option value="even">Even</option>
                    <option value="odd">Odd</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Stop bits</span>
                  <select id="stopBitsSelect">
                    <option selected>1</option>
                    <option>2</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span className="field-label">Flow control</span>
                <select id="flowControlSelect">
                  <option selected value="none">
                    None
                  </option>
                  <option value="hardware">Hardware</option>
                </select>
              </label>

              <div className="connection-actions">
                <button className="button primary full" id="connectBtn" type="button">
                  Connect
                </button>
                <button className="button ghost full" id="demoBtn" type="button">
                  Try demo
                </button>
              </div>

              <div className="device-summary" id="deviceSummary">
                <div className="device-summary-icon">
                  <Icon name="terminal" />
                </div>
                <div>
                  <strong id="deviceName">No controller identified</strong>
                  <span id="deviceMeta">Use AYT after connecting</span>
                </div>
              </div>
            </section>

            <section className="panel session-panel">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Local record</p>
                  <h2>Session</h2>
                </div>
                <Icon name="database" />
              </div>
              <label className="field">
                <span className="field-label">Session name</span>
                <input id="sessionName" defaultValue="VGC50x session" />
              </label>
              <label className="check-row">
                <input id="autosaveCheck" type="checkbox" defaultChecked />
                <span>
                  <strong>Autosave locally</strong>
                  <small>IndexedDB on this browser only</small>
                </span>
              </label>
              <div className="session-stats">
                <div>
                  <span id="sessionLogCount">0</span>
                  <small>traffic events</small>
                </div>
                <div>
                  <span id="sessionSampleCount">0</span>
                  <small>data samples</small>
                </div>
              </div>
              <div className="button-row">
                <button className="button ghost" id="newSessionBtn" type="button">
                  New
                </button>
                <button className="button ghost" id="sessionsBtn" type="button">
                  History
                </button>
              </div>
            </section>
          </aside>

          <main className="main-stage">
            <section className="overview">
              <div className="overview-heading">
                <div>
                  <p className="eyebrow">Live measurements</p>
                  <h1>Controller overview</h1>
                </div>
                <div className="overview-tools">
                  <label className="compact-select">
                    <span>Scale</span>
                    <select id="chartScale">
                      <option value="log" selected>
                        Log
                      </option>
                      <option value="linear">Linear</option>
                    </select>
                  </label>
                  <button className="button secondary" id="identifyBtn" type="button" disabled>
                    Identify controller
                  </button>
                </div>
              </div>

              <div className="channel-grid">
                <ChannelCard channel={1} />
                <ChannelCard channel={2} />
                <ChannelCard channel={3} />
              </div>

              <div className="trend-card">
                <div className="trend-heading">
                  <span>
                    <Icon name="chart" size={16} /> Pressure trend
                  </span>
                  <small id="trendCaption">Waiting for measurement data</small>
                </div>
                <canvas id="trendCanvas" height="130" />
              </div>
            </section>

            <section className="terminal-panel">
              <div className="terminal-toolbar">
                <div className="terminal-title">
                  <Icon name="terminal" />
                  <div>
                    <strong>Terminal traffic</strong>
                    <span id="trafficStatus">Idle</span>
                  </div>
                </div>
                <div className="terminal-tools">
                  <label className="compact-select">
                    <span>View</span>
                    <select id="terminalViewSelect">
                      <option value="ascii" selected>
                        ASCII
                      </option>
                      <option value="both">ASCII + HEX</option>
                      <option value="hex">HEX</option>
                    </select>
                  </label>
                  <label className="switch-label" title="Keep the newest traffic visible">
                    <input id="autoScrollCheck" type="checkbox" defaultChecked />
                    <span>Follow</span>
                  </label>
                  <button className="text-button" id="clearTerminalBtn" type="button">
                    Clear view
                  </button>
                </div>
              </div>

              <div className="terminal-feed" id="terminalFeed" aria-live="polite">
                <div className="empty-state" id="terminalEmpty">
                  <div className="empty-icon">
                    <Icon name="terminal" size={24} />
                  </div>
                  <strong>Ready for a serial connection</strong>
                  <span>
                    Select COM21 in the browser prompt, connect, then try <code>AYT</code>.
                  </span>
                </div>
              </div>

              <div className="quick-commands" id="quickCommands">
                {["AYT", "PR1", "PRX", "TID", "UNI", "ERR", "MAC", "PNR", "RHR", "TMP", "COM,1"].map(
                  (command) => (
                    <button type="button" data-command={command} key={command}>
                      {command}
                    </button>
                  )
                )}
              </div>

              <div className="composer">
                <div className="composer-options">
                  <label className="compact-select">
                    <span>Input</span>
                    <select id="inputFormatSelect">
                      <option value="ascii" selected>
                        ASCII
                      </option>
                      <option value="escaped">Escaped text</option>
                      <option value="hex">Hex bytes</option>
                      <option value="decimal">Decimal bytes</option>
                      <option value="base64">Base64</option>
                    </select>
                  </label>
                  <label className="compact-select">
                    <span>Ending</span>
                    <select id="lineEndingSelect">
                      <option value="cr" selected>
                        CR
                      </option>
                      <option value="crlf">CR + LF</option>
                      <option value="lf">LF</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                  <label className="switch-label" title="After ACK, automatically transmit ENQ (0x05)">
                    <input id="autoEnqCheck" type="checkbox" defaultChecked />
                    <span>Auto ENQ after ACK</span>
                  </label>
                </div>
                <div className="composer-entry">
                  <textarea
                    id="commandInput"
                    rows="2"
                    defaultValue="AYT"
                    spellCheck="false"
                    aria-label="Command input"
                  />
                  <button className="send-button" id="sendBtn" type="button" disabled>
                    <Icon name="send" />
                    <span>Send</span>
                    <small>Ctrl ↵</small>
                  </button>
                </div>
                <div className="composer-preview">
                  <span id="bytePreview">41 59 54 0D</span>
                  <span id="composerHint">ASCII with CR · 4 bytes</span>
                </div>
              </div>
            </section>
          </main>

          <aside className="right-rail">
            <section className="dictionary-panel">
              <div className="dictionary-heading">
                <div>
                  <p className="eyebrow">Protocol library</p>
                  <h2>Command dictionary</h2>
                </div>
                <span className="command-count" id="commandCount">
                  —
                </span>
              </div>

              <label className="search-field">
                <Icon name="search" size={16} />
                <input id="commandSearch" placeholder="Search mnemonic or purpose…" />
                <kbd>⌘K</kbd>
              </label>

              <div className="category-strip" id="categoryStrip" aria-label="Command categories" />
              <div className="command-list" id="commandList" />

              <div className="command-detail" id="commandDetail">
                <div className="command-detail-empty">
                  <Icon name="book" size={22} />
                  <strong>Select a command</strong>
                  <span>Syntax, response format, cautions, and examples appear here.</span>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <footer className="footer">
          <span>
            <Icon name="shield" size={14} /> Serial traffic and saved sessions stay in this browser.
          </span>
          <a
            href="https://www.inficon.com/media/4375/download/Operating-manual-VGC50x.pdf?inline=true&language=en&v=3"
            target="_blank"
            rel="noreferrer"
          >
            INFICON operating manual
          </a>
        </footer>
      </div>

      <dialog className="modal" id="helpDialog">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Guide</p>
            <h2>Using the VGC50x console</h2>
          </div>
          <button className="icon-button modal-close" type="button" aria-label="Close help">
            <Icon name="x" />
          </button>
        </div>
        <div className="help-layout">
          <nav className="help-nav">
            <button className="active" data-help-target="help-connect" type="button">
              Connect
            </button>
            <button data-help-target="help-protocol" type="button">
              Protocol
            </button>
            <button data-help-target="help-formats" type="button">
              Input formats
            </button>
            <button data-help-target="help-troubleshoot" type="button">
              Troubleshooting
            </button>
            <button data-help-target="help-privacy" type="button">
              Logs & privacy
            </button>
          </nav>
          <div className="help-content">
            <article className="help-section active" id="help-connect">
              <h3>Connect to a controller</h3>
              <ol className="steps">
                <li>
                  Open this page in current Chrome or Microsoft Edge over HTTPS or localhost.
                </li>
                <li>
                  Choose <strong>Select a serial port</strong> and pick the VGC50x virtual COM
                  port—COM21 in the current setup.
                </li>
                <li>
                  Use <strong>115200, 8 data bits, no parity, 1 stop bit, no flow control</strong>,
                  then connect.
                </li>
                <li>
                  Send <code>AYT</code>. With Auto ENQ enabled, the console requests and displays
                  the identity record automatically.
                </li>
              </ol>
              <div className="callout">
                Browsers intentionally show the operating system’s port picker. A website cannot
                silently open COM21 without your click and permission.
              </div>
            </article>
            <article className="help-section" id="help-protocol">
              <h3>VGC50x ACK / ENQ flow</h3>
              <div className="protocol-flow">
                <span>HOST</span>
                <code>AYT&lt;CR&gt;</code>
                <span>VGC50x</span>
                <code>&lt;ACK&gt;&lt;CR&gt;&lt;LF&gt;</code>
                <span>HOST</span>
                <code>&lt;ENQ&gt;</code>
                <span>VGC50x</span>
                <code>VGC501,…&lt;CR&gt;&lt;LF&gt;</code>
              </div>
              <p>
                Most three-character mnemonics can be queried without parameters or changed by
                adding comma-separated parameters. Auto ENQ watches for ACK byte <code>0x06</code>{" "}
                and transmits ENQ byte <code>0x05</code>. NAK is <code>0x15</code>.
              </p>
              <p>
                Sending any command pauses automatic measurement streaming. Use <code>COM,1</code>{" "}
                to restore one-second continuous output.
              </p>
            </article>
            <article className="help-section" id="help-formats">
              <h3>Custom input formats</h3>
              <div className="format-table">
                <div>
                  <strong>ASCII</strong>
                  <code>SP1,2,1E-6,5E-6</code>
                </div>
                <div>
                  <strong>Escaped</strong>
                  <code>AYT\r or &lt;ENQ&gt;</code>
                </div>
                <div>
                  <strong>Hex bytes</strong>
                  <code>41 59 54 0D</code>
                </div>
                <div>
                  <strong>Decimal bytes</strong>
                  <code>65, 89, 84, 13</code>
                </div>
                <div>
                  <strong>Base64</strong>
                  <code>QVlUDQ==</code>
                </div>
              </div>
              <p>
                Escaped mode accepts <code>\r</code>, <code>\n</code>, <code>\t</code>,{" "}
                <code>\xNN</code>, and tokens such as <code>&lt;CR&gt;</code>,{" "}
                <code>&lt;LF&gt;</code>, <code>&lt;ENQ&gt;</code>, <code>&lt;ACK&gt;</code>,{" "}
                <code>&lt;NAK&gt;</code>, and <code>&lt;ETX&gt;</code>.
              </p>
            </article>
            <article className="help-section" id="help-troubleshoot">
              <h3>When nothing responds</h3>
              <ul className="checklist">
                <li>Confirm the INFICON virtual port reports connected in its configuration tool.</li>
                <li>Close other applications that may have exclusive access to the COM port.</li>
                <li>Verify 115200 / 8-N-1 / no handshake, matching the controller setup.</li>
                <li>Try AYT with CR and Auto ENQ enabled.</li>
                <li>Use ERR to read a syntax or parameter error after a NAK.</li>
                <li>Reconnect the virtual port if the network lease changed.</li>
              </ul>
              <div className="callout warning">
                Commands marked “Actuates” can switch gauges, emission, degas, or relays. Review
                the linked manual before sending them to a live process.
              </div>
            </article>
            <article className="help-section" id="help-privacy">
              <h3>Local logs and exports</h3>
              <p>
                When autosave is enabled, sessions, raw traffic, and parsed measurements are stored
                in IndexedDB for this browser profile. They are not uploaded by this application.
              </p>
              <p>
                Export a full JSON session, a readable transcript, raw traffic CSV, or measurement
                CSV. Clearing browser site data also removes saved sessions.
              </p>
            </article>
          </div>
        </div>
      </dialog>

      <dialog className="modal small-modal" id="exportDialog">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Download</p>
            <h2>Export current session</h2>
          </div>
          <button className="icon-button modal-close" type="button" aria-label="Close export dialog">
            <Icon name="x" />
          </button>
        </div>
        <div className="export-summary" id="exportSummary">
          No session data yet.
        </div>
        <div className="export-grid">
          <button className="export-option" data-export="json" type="button">
            <strong>Session JSON</strong>
            <span>Settings, identity, traffic, and measurements</span>
          </button>
          <button className="export-option" data-export="transcript" type="button">
            <strong>Text transcript</strong>
            <span>Readable timestamped terminal record</span>
          </button>
          <button className="export-option" data-export="logs" type="button">
            <strong>Traffic CSV</strong>
            <span>Direction, text, and exact bytes</span>
          </button>
          <button className="export-option" data-export="data" type="button">
            <strong>Measurement CSV</strong>
            <span>Channel, status, value, and unit</span>
          </button>
        </div>
      </dialog>

      <dialog className="modal small-modal" id="sessionsDialog">
        <div className="modal-header">
          <div>
            <p className="eyebrow">IndexedDB</p>
            <h2>Saved sessions</h2>
          </div>
          <button className="icon-button modal-close" type="button" aria-label="Close session history">
            <Icon name="x" />
          </button>
        </div>
        <div className="saved-sessions" id="savedSessions">
          <div className="empty-sessions">No locally saved sessions.</div>
        </div>
        <label className="button secondary import-button">
          Import session JSON
          <input id="importSessionInput" type="file" accept=".json,application/json" hidden />
        </label>
      </dialog>

      <div className="toast-region" id="toastRegion" aria-live="polite" />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
