/** Theme-native styling for Side Chat without global DSH element overrides. */
export const sideChatStyles = `
.sc-icon-button {
  width: calc(28px + var(--dsh-content-font-delta, 0px));
  height: calc(28px + var(--dsh-content-font-delta, 0px));
  padding: 6px; border: 0; border-radius: var(--dsw-radius-sm);
  background: transparent; color: var(--dsw-alias-label-tertiary);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; vertical-align: middle;
}
.sc-icon-button svg { width: 16px; height: 16px; }
.sc-icon-button:hover { color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover); }
.sc-icon-button:focus-visible, .sc-selection-action:focus-visible { outline: 2px solid var(--dsw-focus-ring-color); outline-offset: 2px; }
.sc-selection-capsule {
  display: inline-flex !important; align-items: stretch; overflow: hidden;
  border-radius: 999px; background: var(--dsw-alias-button-floating-fill);
  box-shadow: var(--dsw-elevation-panel);
}
.sc-selection-capsule > button:not([data-side-chat-selection-button]) {
  box-shadow: none !important;
  border-radius: 999px 0 0 999px !important;
  background: transparent !important;
}
.sc-selection-action {
  appearance: none; padding: 5px 12px; cursor: pointer;
  font: var(--dsw-font-xs-13); color: var(--dsw-alias-label-primary);
  border: 0; border-left: 1px solid var(--dsw-alias-border-l3);
  border-radius: 0 999px 999px 0;
  background: transparent;
}
.sc-selection-action:hover, .sc-selection-action:focus-visible {
  background: var(--dsw-alias-button-floating-hover);
}
.sc-root {
  --sc-muted: var(--dsw-alias-label-caption);
  color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1);
  font: var(--dsw-font-sm-14); height: 100%; min-height: 0;
  display: flex; flex-direction: column; overflow: hidden;
}
:where(.sc-root, .sc-rail, .sc-anchor-markers) :where(button, textarea, input, select) {
  font: inherit; color: inherit;
}
.sc-muted { color: var(--dsw-alias-label-caption); font: var(--dsw-font-xs-13); }
.sc-directory-help { color: var(--dsw-alias-label-caption); font: var(--dsw-font-xxs-12); line-height: 1.5; }
.sc-header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2);
  flex-shrink: 0;
}
.sc-heading { font: var(--dsw-font-xs-strong-13); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sc-padded { padding: 16px; }
.sc-scroll { overflow: auto; overscroll-behavior: contain; flex: 1; min-height: 0; }
.sc-toolbar { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
.sc-toolbar > [data-state] { display: inline-flex; }
.sc-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 7px 12px; border: 1px solid var(--dsw-alias-border-l2);
  background: transparent; color: var(--dsw-alias-label-primary);
  cursor: pointer; border-radius: var(--dsw-radius-md); font: var(--dsw-font-xs-13);
}
.sc-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.sc-btn:disabled { opacity: .4; cursor: default; }
.sc-btn-primary { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-layer-1); border-color: transparent; }
.sc-btn-primary:hover { opacity: .85; background: var(--dsw-alias-label-primary); }
.sc-search {
  display: flex; align-items: center; gap: 2px;
  min-height: 32px; box-sizing: border-box;
  padding: 0 3px 0 10px; border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md); background: var(--dsw-specific-input-major);
}
.sc-search:focus-within { border-color: var(--dsw-alias-border-l4); box-shadow: 0 0 0 2px var(--dsw-alias-interactive-bg-hover); }
.sc-search-input {
  min-width: 0; flex: 1; padding: 6px 0; border: 0; outline: none;
  background: transparent; color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxs-12); line-height: 18px;
}
.sc-search-input::placeholder { color: var(--dsw-alias-label-caption); }
.sc-search .sc-icon-button { flex: none; width: 24px; height: 24px; padding: 4px; }
.sc-search .sc-icon-button svg { width: 14px; height: 14px; }
.sc-item {
  width: 100%; text-align: left; display: block; padding: 12px 13px;
  background: transparent; border: 1px solid transparent; border-radius: var(--dsw-radius-lg);
  cursor: pointer;
}
.sc-item:hover, .sc-item[data-active='true'] { background: var(--dsw-alias-interactive-bg-hover); }
.sc-item[data-active='true'] { border-color: var(--dsw-alias-border-l2); }
.sc-item-title { font: var(--dsw-font-xxs-12); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-item-excerpt { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xs-13); margin-top: 4px; }
.sc-item-preview { color: var(--dsw-alias-label-caption); font: var(--dsw-font-xs-13); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; margin-top: 3px; }
.sc-quote {
  --sc-quote-surface: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, var(--dsw-alias-bg-layer-1));
  position: relative; isolation: isolate;
  margin: 0; padding: 10px 12px 10px 22px; border: 0;
  background: var(--sc-quote-surface);
  border-radius: var(--dsw-radius-md);
  color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xs-13);
}
.sc-quote-mark {
  position: absolute; z-index: 0; left: 6px; top: 9px; width: 16px; height: 16px;
  color: color-mix(in srgb, var(--dsw-alias-label-primary) 26%, transparent);
  pointer-events: none; user-select: none;
}
.sc-quote-text {
  position: relative; z-index: 1;
  display: block; white-space: pre-wrap; overflow-wrap: anywhere;
}
.sc-quote-clamped .sc-quote-text {
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3;
  overflow: hidden; text-overflow: ellipsis; white-space: normal;
}
.sc-quote-clamped.sc-quote-truncated::after {
  content: '…'; position: absolute; z-index: 2; right: 12px; bottom: 10px;
  min-width: 22px; padding-left: 12px; text-align: right;
  color: var(--dsw-alias-label-secondary);
  background: linear-gradient(90deg, transparent, var(--sc-quote-surface) 38%);
  font: var(--dsw-font-xs-13); line-height: 1.55;
  pointer-events: none;
}
.sc-composer { padding: 10px 12px 12px; flex: none; }
.sc-input-wrap {
  position: relative; width: 100%; box-sizing: border-box;
  border-radius: var(--dsw-radius-panel);
  background: var(--dsw-specific-input-major);
  box-shadow: var(--dsw-elevation-soft);
}
.sc-composer-input {
  display: block; box-sizing: border-box; width: 100%; height: auto; min-height: 70px;
  max-height: 180px; resize: none; overflow-y: hidden;
  padding: 11px 50px 37px 13px;
  border: 0; border-radius: var(--dsw-radius-panel);
  outline: none; background: transparent;
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xs-13); line-height: 1.55;
  caret-color: var(--dsw-alias-state-business-primary);
}
.sc-composer-input::placeholder { color: var(--dsw-alias-label-caption); }
.sc-promoted-notice {
  display: flex; align-items: center; gap: 10px;
  min-height: 46px; box-sizing: border-box; padding: 8px 8px 8px 12px;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-specific-selector);
  color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xs-13);
}
.sc-promoted-copy {
  min-width: 0; flex: 1; line-height: 1.45;
}
.sc-inline-action {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  flex: none; min-height: 30px; box-sizing: border-box; padding: 0 10px;
  border: 0; border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-label-on-color);
  font: var(--dsw-font-xxs-12); font-weight: 600; cursor: pointer;
}
.sc-inline-action svg { width: 14px; height: 14px; }
.sc-inline-action:hover { opacity: .84; }
.sc-inline-action:focus-visible { outline: 2px solid var(--dsw-focus-ring-color); outline-offset: 2px; }
.sc-send-anchor { position: absolute; right: 8px; bottom: 8px; display: flex; align-items: center; }
.sc-root .sc-send {
  display: grid; place-items: center; box-sizing: border-box;
  width: 34px; min-width: 34px; height: 34px; min-height: 34px;
  border: 0; border-radius: 50%; corner-shape: round; padding: 0; cursor: pointer;
  background: var(--dsw-alias-label-primary); color: var(--dsw-alias-label-on-color);
  transition: background-color 100ms ease, opacity 100ms ease;
}
.sc-root .sc-send svg { display: block; width: 16px; height: 16px; }
.sc-root .sc-send:hover:not(:disabled) { opacity: .84; }
.sc-root .sc-send:disabled { opacity: .24; cursor: default; }
.sc-root .sc-send:focus-visible { outline: 2px solid var(--dsw-focus-ring-color); outline-offset: 2px; }
.sc-thread-pane { position: relative; display: flex; flex: 1; min-height: 0; container-type: inline-size; }
.sc-msg-list { padding: 12px 16px 18px 34px; display: flex; flex-direction: column; gap: 20px; }
.sc-turn { display: flex; flex-direction: column; gap: 10px; min-width: 0; scroll-margin-top: 12px; }
.sc-msg { min-width: 0; font: var(--dsw-font-xs-13); line-height: 1.55; overflow-wrap: anywhere; }
.sc-msg-text { white-space: pre-wrap; }
.sc-msg-user {
  align-self: flex-end; padding: 9px 12px; border-radius: var(--dsw-radius-lg);
  background: var(--dsw-specific-selector);
  color: var(--dsw-alias-label-primary);
  max-width: 88%;
}
.sc-msg-assistant { align-self: stretch; max-width: 100%; }
.sc-assistant-blocks { display: flex; flex-direction: column; gap: 12px; }
.sc-markdown > div {
  color: var(--dsw-alias-label-primary);
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
}
.sc-markdown > div :where(p, ul, ol, blockquote) { margin: 8px 0; }
.sc-markdown > div :where(h1, h2, h3, h4, h5, h6) {
  margin: 18px 0 8px; color: var(--dsw-alias-label-primary);
  font-weight: 600; line-height: 1.4;
}
.sc-markdown > div h1 { font-size: 16px; }
.sc-markdown > div h2 { font-size: 15px; }
.sc-markdown > div :where(h3, h4, h5, h6) { font-size: 14px; }
.sc-markdown > div :where(ul, ol) { padding-left: 18px; }
.sc-markdown > div > :first-child { margin-top: 0; }
.sc-markdown > div > :last-child { margin-bottom: 0; }
.sc-markdown-compact > div :where(p, ul, ol, blockquote) { margin: 4px 0; }
.sc-reasoning { min-width: 0; }
.sc-reasoning-summary {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--dsw-alias-label-tertiary);
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(24px + var(--dsh-content-font-delta, 0px));
}
.sc-reasoning-body { padding: 4px 0 4px 22px; min-width: 0; }
.sc-msg-actions {
  display: flex; align-items: center; justify-content: flex-start;
  gap: 2px; min-height: 28px; margin-top: 8px;
}
.sc-msg-actions .sc-icon-button { color: var(--dsw-alias-label-tertiary); }
.sc-msg-actions .sc-icon-button:hover { color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover); }
.sc-msg-actions .sc-icon-button svg { width: 17px; height: 17px; }
.sc-msg-time {
  margin-left: 8px; color: var(--dsw-alias-label-tertiary);
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(24px + var(--dsh-content-font-delta, 0px));
  white-space: nowrap;
}
.sc-turn-nav {
  position: absolute; left: 3px; top: 50%; z-index: 4;
  width: 24px; max-height: min(70%, 420px);
  transform: translateY(-50%);
}
.sc-turn-nav-scroll {
  max-height: inherit; overflow-y: auto; overscroll-behavior: contain;
  scrollbar-width: none;
}
.sc-turn-nav-scroll::-webkit-scrollbar { display: none; }
.sc-turn-nav-marks { position: relative; padding: 6px 0; }
.sc-turn-mark {
  position: relative; display: grid; place-items: center;
  width: 24px; height: 16px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm);
  outline: none; background: transparent; color: var(--dsw-alias-border-l4); cursor: pointer;
}
.sc-turn-dot {
  display: block; width: 13px; height: 13px; overflow: visible;
  color: inherit; shape-rendering: geometricPrecision;
}
.sc-turn-dot circle {
  fill: currentColor; stroke: transparent; stroke-width: 1.5;
  transform-box: fill-box; transform-origin: center;
  transition: transform 140ms ease, color 140ms ease, stroke 140ms ease;
}
.sc-turn-mark[data-preview='true'] { color: var(--dsw-alias-label-tertiary); }
.sc-turn-mark[data-preview='true'] .sc-turn-dot circle { transform: scale(1.1); }
.sc-turn-mark[data-active='true'] { color: var(--dsw-alias-label-primary); }
.sc-turn-mark[data-active='true'] .sc-turn-dot circle { transform: scale(1.25); }
.sc-turn-mark:focus-visible .sc-turn-dot {
  color: var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
}
.sc-turn-mark:focus-visible .sc-turn-dot circle {
  stroke: var(--dsw-alias-bg-layer-1);
  transform: scale(1.3);
}
.sc-turn-preview {
  position: absolute; left: 30px; top: clamp(
    44px,
    var(--sc-turn-preview-top),
    calc(100% - 44px)
  );
  width: 280px; width: min(280px, calc(100cqw - 44px));
  max-height: 88px; box-sizing: border-box;
  overflow: hidden; padding: 10px 12px;
  border-radius: var(--dsw-radius-lg);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-elevation-panel);
  pointer-events: none; transform: translateY(-50%);
  animation: sc-turn-preview-enter 120ms ease-out;
}
.sc-turn-preview-prompt,
.sc-turn-preview-response {
  display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical;
}
.sc-turn-preview-prompt {
  -webkit-line-clamp: 1;
  font: var(--dsw-font-xs-strong-13);
}
.sc-turn-preview-response {
  margin-top: 4px; color: var(--dsw-alias-label-caption);
  -webkit-line-clamp: 3;
  font: var(--dsw-font-xxs-12);
}
.sc-message-header { padding: 10px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2); display: grid; gap: 6px; }
.sc-status { color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xs-13); }
.sc-empty { padding: 28px 20px; text-align: center; color: var(--dsw-alias-label-caption); font: var(--dsw-font-xs-13); }
.sc-alert { padding: 10px 14px; font: var(--dsw-font-xs-13); color: var(--dsw-alias-state-danger-primary, #b42318); }
.sc-divider { height: 1px; background: var(--dsw-alias-border-l2); border: 0; margin: 10px 0; }
.sc-section-label { color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxs-12); font-weight: 600; margin: 0 0 8px; }
.sc-context-options {
  display: flex; flex-wrap: wrap; gap: 8px 16px;
  min-width: 0; margin: 0; padding: 0; border: 0;
}
.sc-context-options .sc-section-label { width: 100%; padding: 0; }
.sc-radio-option {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xs-13);
  cursor: pointer;
}
.sc-radio-option input {
  width: 14px; height: 14px; margin: 0;
  accent-color: var(--dsw-alias-label-primary);
}
.sc-radio-option input:focus-visible { outline: 2px solid var(--dsw-focus-ring-color); outline-offset: 2px; }
.sc-anchor-markers { position: fixed; inset: 0; pointer-events:none; z-index:15; }
.sc-anchor-wrapper { position: absolute; pointer-events: auto; width: 22px; height: 22px; }
.sc-anchor-preview {
  position: absolute; right: calc(100% + 9px); top: -7px;
  width: min(290px, 55vw); box-sizing: border-box;
  display: grid; gap: 4px; padding: 10px 12px;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-1); box-shadow: var(--dsw-elevation-panel);
  border: 1px solid var(--dsw-alias-border-l2); pointer-events: none;
}
.sc-anchor-preview-title {
  font: var(--dsw-font-xs-strong-13); color: var(--dsw-alias-label-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sc-anchor-preview-question {
  font: var(--dsw-font-xxs-12); color: var(--dsw-alias-label-caption);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sc-anchor-button {
  position:static; pointer-events:auto; width:22px; height:22px;
  border:0; border-radius:50%; background:var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-elevation-panel); color:var(--dsw-alias-label-tertiary);
  display:inline-flex;align-items:center;justify-content:center;cursor:pointer;
}
.sc-anchor-button:hover { color: var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); }
.sc-anchor-button svg {width:13px;height:13px;}
.sc-jump-full { animation: sc-jump-body 790ms ease-out 3; border-radius: 3px; }
.sc-jump-range { position:fixed; pointer-events:none; z-index:19; border-radius:2px; background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 42%, transparent); animation:sc-jump-highlight 790ms ease-out 3; }
@keyframes sc-enter {from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
@keyframes sc-jump-body {
  0%,100% { outline: 3px solid transparent; background: transparent; }
  40%,65% {
    outline: 3px solid var(--dsw-alias-state-business-primary);
    outline-offset: 5px;
    background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);
  }
}
@keyframes sc-jump-highlight { 0%,100% { opacity:.15 } 40% { opacity:1 } }
@keyframes sc-turn-preview-enter {
  from { opacity: 0; transform: translate(-4px, -50%); }
  to { opacity: 1; transform: translate(0, -50%); }
}
@media (max-width: 920px) {
 .sc-rail { display: none; }
 .sc-anchor-button { width: 20px; height: 20px; }
}
@media (prefers-reduced-motion:reduce) {
 .sc-jump-full,.sc-jump-range {animation:none!important;transition:none!important;}
 .sc-jump-full {outline:3px solid var(--dsw-alias-state-business-primary); background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);}
 .sc-turn-dot circle,
 .sc-turn-preview { animation:none!important; transition:none!important; scroll-behavior:auto; }
}
`
