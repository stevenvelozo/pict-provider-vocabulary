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
`;
