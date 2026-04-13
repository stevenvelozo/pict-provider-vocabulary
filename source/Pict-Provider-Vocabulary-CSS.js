/**
 * Vocabulary popover CSS — injected by the provider into the Pict
 * CSS cascade so any app that registers the provider gets the
 * popover styles for free.
 *
 * The .pict-vocab-term class is applied by pict-section-content's
 * _applyVocabularyLinks() method on each detected term. The
 * .vocab-popover class is the positioned tooltip that appears on
 * hover.
 *
 * CSS custom properties (--bg-secondary, --border-color, --accent,
 * --text-primary, --text-secondary, --text-muted) are expected to
 * be defined by the host app's theme. Falls back to reasonable
 * dark-theme defaults if the properties are missing.
 */
module.exports = `
/* ── Vocabulary term marker ─────────────────────────── */
.pict-vocab-term {
	border-bottom: 1px dotted var(--accent, #2a8a7a);
	cursor: help;
}

/* ── Popover ────────────────────────────────────────── */
.vocab-popover {
	position: fixed;
	z-index: 10000;
	max-width: 320px;
	padding: 12px 16px;
	background: var(--bg-secondary, #1a2a2a);
	border: 1px solid var(--border-color, #2a3a3a);
	border-radius: 6px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	font-size: 0.85em;
	line-height: 1.5;
	color: var(--text-primary, #d0dada);
}

.vocab-popover-title {
	font-weight: bold;
	margin-bottom: 6px;
	color: var(--accent, #2a8a7a);
}

.vocab-popover-short {
	margin-bottom: 8px;
	color: var(--text-secondary, #8ca0a0);
}

.vocab-popover-link {
	color: var(--accent, #2a8a7a);
	text-decoration: none;
	font-size: 0.85em;
}
.vocab-popover-link:hover {
	text-decoration: underline;
}

/* ── Vocabulary Manager View ────────────────────────── */
.vocab-layout {
	display: flex;
	height: calc(100vh - 80px);
	gap: 0;
}

.vocab-sidebar {
	width: 260px;
	min-width: 200px;
	border-right: 1px solid var(--border-color, #2a3a3a);
	overflow-y: auto;
	background: var(--bg-secondary, #1a2a2a);
	display: flex;
	flex-direction: column;
}

.vocab-sidebar-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 14px;
	border-bottom: 1px solid var(--border-color, #2a3a3a);
}

.vocab-content {
	flex: 1;
	overflow-y: auto;
	padding: 0;
	display: flex;
	flex-direction: column;
}

.vocab-list {
	flex: 1;
	overflow-y: auto;
	padding: 6px 0;
}

.vocab-item {
	padding: 6px 14px;
	cursor: pointer;
	font-size: 0.85em;
	color: var(--text-secondary, #8ca0a0);
	border-left: 3px solid transparent;
}
.vocab-item:hover {
	background: var(--bg-hover, #2a3a3a);
}
.vocab-item-active {
	background: var(--bg-hover, #2a3a3a);
	color: var(--text-primary, #d0dada);
	border-left-color: var(--accent, #2a8a7a);
}

.vocab-item-title {
	font-weight: 600;
	color: var(--text-primary, #d0dada);
}
.vocab-item-short {
	font-size: 0.78em;
	color: var(--text-muted, #6a8080);
	margin-top: 2px;
	line-height: 1.3;
}

.vocab-filter {
	margin: 8px 10px;
	padding: 6px 10px;
	border: 1px solid var(--border-color, #2a3a3a);
	border-radius: 4px;
	background: var(--bg-primary, #0e1818);
	color: var(--text-primary, #d0dada);
	font-size: 0.85em;
}
.vocab-filter:focus {
	border-color: var(--accent, #2a8a7a);
	outline: none;
}

.vocab-toolbar {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px 16px;
	border-bottom: 1px solid var(--border-color, #2a3a3a);
	background: var(--bg-secondary, #1a2a2a);
}

.vocab-slug {
	flex: 1;
	font-family: 'SF Mono', Menlo, Monaco, monospace;
	font-size: 0.82em;
	color: var(--text-muted, #6a8080);
}

.vocab-btn {
	padding: 4px 12px;
	border: 1px solid var(--border-color, #2a3a3a);
	border-radius: 4px;
	background: var(--bg-primary, #0e1818);
	color: var(--text-secondary, #8ca0a0);
	cursor: pointer;
	font-size: 0.82em;
}
.vocab-btn:hover {
	background: var(--bg-hover, #2a3a3a);
}
.vocab-btn-primary {
	background: var(--accent, #2a8a7a);
	border-color: var(--accent, #2a8a7a);
	color: #fff;
}

.vocab-rendered {
	flex: 1;
	padding: 20px 24px;
	overflow-y: auto;
	line-height: 1.6;
}

.vocab-editor {
	flex: 1;
	width: 100%;
	padding: 16px 20px;
	border: none;
	background: var(--bg-primary, #0e1818);
	color: var(--text-primary, #d0dada);
	font-family: 'SF Mono', Menlo, Monaco, monospace;
	font-size: 0.85em;
	line-height: 1.5;
	resize: none;
}
.vocab-editor:focus {
	outline: none;
}

.vocab-empty {
	padding: 40px 24px;
	text-align: center;
	color: var(--text-muted, #6a8080);
	font-size: 0.9em;
}

/* ── Term preview (expanded active item) ───────────── */
.vocab-item-preview-short {
	margin-top: 6px;
	padding: 6px 0;
	color: var(--text-secondary, #8ca0a0);
	font-size: 0.8em;
	line-height: 1.4;
	border-bottom: 1px solid var(--border-color, #2a3a3a);
}
.vocab-item-preview-body {
	margin-top: 6px;
	padding: 8px 10px;
	background: var(--bg-primary, #0e1818);
	border-radius: 4px;
	color: var(--text-muted, #6a8080);
	white-space: pre-wrap;
	font-family: 'SF Mono', Menlo, Monaco, monospace;
	font-size: 0.72em;
	line-height: 1.4;
	max-height: 200px;
	overflow-y: auto;
}
.vocab-item-preview-actions {
	margin-top: 6px;
	padding-bottom: 2px;
}

/* ── Create-term modal overlay ─────────────────────── */
.vocab-create-overlay {
	display: none;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 10001;
	background: rgba(0, 0, 0, 0.35);
}
.vocab-create-overlay.open {
	display: flex;
	align-items: center;
	justify-content: center;
}
.vocab-create-panel {
	background: var(--bg-primary, #0e1818);
	border: 1px solid var(--border-color, #2a3a3a);
	border-radius: 10px;
	box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
	width: 360px;
	max-width: 90vw;
	overflow: hidden;
}
.vocab-create-body {
	padding: 24px 22px 16px;
}
.vocab-create-title {
	font-size: 0.95rem;
	font-weight: 600;
	color: var(--text-primary, #d0dada);
	margin-bottom: 12px;
	text-align: center;
}
.vocab-create-input {
	display: block;
	width: 100%;
	box-sizing: border-box;
	padding: 8px 12px;
	border: 1px solid var(--border-color, #2a3a3a);
	border-radius: 5px;
	background: var(--bg-secondary, #1a2a2a);
	color: var(--text-primary, #d0dada);
	font-size: 0.88rem;
	font-family: 'SF Mono', Menlo, Monaco, monospace;
}
.vocab-create-input:focus {
	border-color: var(--accent, #2a8a7a);
	outline: none;
}
.vocab-create-actions {
	display: flex;
	gap: 10px;
	justify-content: center;
	padding: 0 22px 16px;
}
.vocab-create-footer {
	padding: 10px 22px;
	border-top: 1px solid var(--border-color, #2a3a3a);
	font-size: 0.72rem;
	color: var(--text-muted, #6a8080);
	text-align: center;
}
.vocab-create-footer kbd {
	display: inline-block;
	padding: 1px 5px;
	font-size: 0.68rem;
	font-family: monospace;
	background: var(--bg-secondary, #1a2a2a);
	border: 1px solid var(--border-color, #2a3a3a);
	border-radius: 3px;
	color: var(--text-secondary, #8ca0a0);
}
`;
