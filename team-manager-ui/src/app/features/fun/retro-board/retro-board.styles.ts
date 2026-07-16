// Shared RetroBoard styles. Applied (via `styles: [RETRO_STYLES]`) to the container and every
// phase child component so each encapsulated view can resolve the same tokens and component
// classes. CSS custom properties declared on :host cascade into nested child hosts.
export const RETRO_STYLES = `
    :host { display:block; --bg:#0a0b11; --surface:#12131d; --surface2:#171827; --border:#24263a; --text:#e9eaf2; --dim:#9a9db2; --mute:#63677e; --accent:#7d5cff; --flag:#8f72ff; color:var(--text); font-size:15px; }
    :host *, :host *::before, :host *::after { box-sizing:border-box; }
    .wrap { background:var(--bg); min-height:100%; border-radius:14px; overflow:hidden; }
    .topbar { display:flex; align-items:center; gap:12px; padding:12px 18px; border-bottom:1px solid var(--border); flex-wrap:wrap; }
    .brand { font-weight:700; font-size:17px; } .brand span{ color:var(--accent); }
    .grow { flex:1; }
    .stepbar { display:flex; align-items:center; gap:2px; padding:9px 18px; border-bottom:1px solid var(--border); overflow-x:auto; }
    .step { border:0; background:none; color:var(--mute); font-size:12.5px; padding:6px 10px; border-radius:8px; white-space:nowrap; cursor:pointer; }
    .step.done { color:var(--dim); } .step.active { background:var(--accent); color:#fff; }
    .step:disabled { cursor:default; } .sep { color:var(--mute); opacity:.5; }
    .seg { display:inline-flex; background:var(--surface); border:1px solid var(--border); border-radius:9px; padding:3px; }
    .seg button { border:0; background:none; color:var(--dim); font-size:12px; font-weight:600; padding:5px 11px; border-radius:6px; cursor:pointer; }
    .seg button.on { background:var(--accent); color:#fff; }
    .clock { font-family:monospace; font-size:14px; padding:5px 10px; border:1px solid var(--border); border-radius:8px; }
    .clock.low { color:#f4566b; border-color:#f4566b; } .clock.idle { color:var(--mute); }
    /* Prominent phase clock at the top of the rail: label, large time, then controls. */
    .rail-timer { display:flex; flex-direction:column; align-items:flex-start; gap:6px; margin-bottom:18px; padding-bottom:16px; border-bottom:1px solid var(--border); }
    .rt-label { font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--mute); }
    .rt-time { font-family:monospace; font-size:34px; font-weight:600; line-height:1; color:var(--text); }
    .rt-time.low { color:#f4566b; } .rt-time.idle { color:var(--mute); }
    .rt-controls { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
    .live { display:flex; align-items:center; gap:8px; padding:8px 18px; background:#171029; border-bottom:1px solid var(--border); font-size:13px; color:var(--dim); }
    .dot { width:8px; height:8px; border-radius:50%; background:#f4566b; }
    .body { display:grid; grid-template-columns:220px 1fr; min-height:500px; }
    .rail { border-right:1px solid var(--border); padding:16px 12px; }
    .rail h4 { font-size:11px; letter-spacing:.1em; color:var(--mute); margin:0 0 12px 6px; text-transform:uppercase; }
    .p-row { display:flex; align-items:center; gap:10px; padding:7px; border-radius:9px; }
    .avatar { width:28px; height:28px; border-radius:50%; display:grid; place-items:center; font-size:11px; font-weight:700; flex-shrink:0; }
    .crown { margin-left:auto; color:#f5b544; font-size:12px; } .tick { margin-left:auto; color:#34d67f; }
    .main { padding:26px 30px; overflow-y:auto; }
    /* Setup renders outside the rail/grid, so centre it for a focused single-column config screen. */
    .setup-main { max-width:920px; margin:0 auto; }
    h1 { font-size:25px; margin:0 0 4px; } .sub { color:var(--dim); margin:0 0 22px; }
    /* Phase header: title/sub-text on the left, primary action pinned top-right without wrapping under it. */
    .phase-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:8px; }
    .phase-head > div:first-child { min-width:0; } .phase-head > .btn, .phase-head > .row, .phase-head > .ph-right { flex-shrink:0; }
    /* Right column of a phase header: primary action stacked above a small progress meter. */
    .ph-right { display:flex; flex-direction:column; align-items:flex-end; gap:12px; }
    .responded { display:flex; flex-direction:column; align-items:flex-end; gap:6px; min-width:150px; font-size:12.5px; }
    .responded .bar-track { width:100%; } .responded .bar-fill { background:var(--accent); }
    .row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; } .between { justify-content:space-between; }
    .btn { border:1px solid transparent; border-radius:10px; font-weight:600; padding:10px 16px; background:var(--surface2); color:var(--text); cursor:pointer; font-size:14px; }
    .btn:hover { filter:brightness(1.15); } .btn.primary { background:var(--accent); color:#fff; } .btn.ghost { background:transparent; border-color:var(--border); color:var(--dim); }
    /* A selected chip carries both ghost + primary; make primary win (higher specificity) so it highlights. */
    .btn.ghost.primary { background:var(--accent); color:#fff; border-color:transparent; }
    .btn:disabled { opacity:.4; cursor:default; } .btn.sm { padding:6px 11px; font-size:12.5px; }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:20px; margin-bottom:16px; }
    label.lbl { font-size:11px; letter-spacing:.1em; color:var(--mute); text-transform:uppercase; display:block; margin-bottom:6px; }
    input.f, textarea.f, select.f { width:100%; background:var(--surface2); border:1px solid var(--border); border-radius:9px; padding:10px 12px; color:var(--text); font:inherit; }
    input.f:focus, textarea.f:focus { outline:none; border-color:var(--accent); }
    .grid { display:grid; gap:14px; } .g2{ grid-template-columns:1fr 1fr; } .g4{ grid-template-columns:repeat(4,1fr); }
    .timers { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .budget { display:flex; gap:18px; margin-top:14px; font-size:13px; }
    .cols { display:grid; grid-template-columns:repeat(2,1fr); gap:18px; }
    .col { border:1px solid var(--border); border-radius:12px; padding:14px; min-width:0; }
    .col h3 { margin:0 0 4px; font-size:15px; } .col .desc{ color:var(--mute); font-size:12px; margin:0 0 10px; }
    .note { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px 13px; margin-bottom:10px; }
    .note .meta { color:var(--dim); font-size:12px; margin-top:8px; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
    .rate { border:1px solid var(--border); background:var(--surface2); border-radius:10px; padding:14px; cursor:pointer; color:var(--dim); font-weight:600; text-align:center; }
    .swatch { width:20px; height:20px; border-radius:50%; border:2px solid transparent; cursor:pointer; display:inline-block; }
    .swatch.sel { box-shadow:0 0 0 2px var(--bg),0 0 0 4px currentColor; }
    .pill { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--border); border-radius:20px; padding:5px 11px; font-size:12.5px; cursor:pointer; background:var(--surface2); color:var(--dim); }
    .pill.on { color:#fff; border-color:var(--flag); background:color-mix(in srgb,var(--flag) 25%, transparent); }
    .muted { color:var(--mute); } .intro-by { color:var(--flag); font-weight:600; }
    .lobby-card { display:flex; align-items:center; gap:12px; padding:14px 16px; border:1px solid var(--border); border-radius:12px; margin-bottom:10px; background:var(--surface); }
    .lobby-card .lc-main { flex:1; cursor:pointer; min-width:0; }
    .lobby-card:hover { border-color:var(--accent); }
    .tag { font-size:11px; padding:2px 8px; border-radius:20px; background:var(--surface2); color:var(--dim); font-family:monospace; }
    .tag.draft { color:#f5b544; } .tag.open { color:#5b9dff; } .tag.live { color:#34d67f; } .tag.closed { color:var(--mute); }
    .err { color:#f4566b; }
    .vote-dots { display:inline-flex; gap:3px; } .vote-dots i{ width:9px; height:9px; border-radius:50%; background:var(--surface2); } .vote-dots i.on{ background:var(--accent); }
    .chips { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
    .chip { display:inline-flex; align-items:center; gap:6px; background:color-mix(in srgb,var(--accent) 18%, transparent); border:1px solid var(--accent); border-radius:20px; padding:3px 10px; font-size:12.5px; }
    .chip b { cursor:pointer; opacity:.7; }
    .ta { position:relative; }
    .ta-list { position:absolute; z-index:5; left:0; right:0; background:var(--surface2); border:1px solid var(--border); border-radius:9px; margin-top:4px; overflow:hidden; }
    .ta-item { padding:8px 12px; cursor:pointer; font-size:13.5px; } .ta-item:hover { background:var(--accent); color:#fff; }
    .stars { display:inline-flex; gap:4px; } .stars.sm { gap:2px; }
    .star { color:var(--surface2); cursor:pointer; font-size:26px; line-height:1; transition:color .1s; -webkit-text-stroke:1px var(--border); }
    .stars.sm .star { font-size:16px; cursor:default; }
    .star.on { color:#f5b544; -webkit-text-stroke:0; } .star:hover { color:#f5b544; }
    .stars.sm .star:hover { color:var(--surface2); } .stars.sm .star.on:hover { color:#f5b544; }
    .bar-row { display:flex; align-items:center; gap:8px; margin:2px 0; }
    .bar-track { flex:1; height:8px; border-radius:4px; background:var(--surface2); overflow:hidden; }
    .bar-fill { display:block; height:100%; background:#f5b544; }
    /* Presentation view — projector-friendly: fill the screen and scale text up. */
    .wrap:fullscreen { border-radius:0; height:100vh; overflow-y:auto; }
    .wrap.present .main { font-size:16.5px; } .wrap.present h1 { font-size:30px; }
    .wrap.present .note { padding:14px 16px; } .wrap.present .seg { display:none; }
    @media (max-width: 760px) {
      .body { grid-template-columns:1fr; }
      .rail { border-right:0; border-bottom:1px solid var(--border); display:flex; gap:8px; overflow-x:auto; padding:10px; }
      .rail h4 { display:none; } .p-row { flex-direction:column; gap:3px; padding:4px; min-width:56px; text-align:center; }
      .p-row span:not(.avatar) { font-size:11px; } .crown,.tick { margin:0; }
      .main { padding:18px 16px; } h1 { font-size:21px; }
      .cols, .g2, .g4, .timers { grid-template-columns:1fr !important; }
      .stepbar { padding:8px 12px; } .topbar { gap:8px; }
    }
`;
