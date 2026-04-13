/**
 * PictView-VocabularyManager
 *
 * A-Z glossary view for browsing, searching, creating, and editing
 * vocabulary term definitions. Ships inside pict-provider-vocabulary
 * so any app that registers the provider gets the management UI for
 * free — just mount it at a DOM target.
 *
 * The view reads terms from the sibling Vocabulary provider (not
 * from a hardcoded API URL), so it works with any term source the
 * host app configured (filesystem, database, API).
 *
 * Editing: instead of rendering its own textarea, the view delegates
 * to the host app via an `onEditTerm(slug, filePath)` callback in
 * options. This lets retold-content-system open the term in its
 * main markdown editor, and retold-labs use its own edit pattern.
 *
 * @author Steven Velozo <steven@velozo.com>
 * @license MIT
 */
const libPictView = require('pict-view');

const defaultOptions =
{
	ViewIdentifier: 'Pict-VocabularyManager',
	DefaultRenderable: 'VocabularyManager-Container',
	DefaultDestinationAddress: '#PictVocabularyManager',
	AutoInitialize: false,
	AutoRender: false,

	// API endpoints
	VocabularyIndexURL: '/api/vocabulary/index',
	VocabularyTermURL: '/api/vocabulary/term',

	// Route prefix for "Read more" links
	VocabularyRoute: '#/vocabulary',

	// The hash of the Vocabulary provider
	VocabularyProviderHash: 'Vocabulary',

	// The folder path prefix for vocabulary files in the content
	// tree. Used to build the file path passed to onEditTerm.
	VocabularyFolderPath: 'vocabulary/',

	// Callback: host app provides this to open a term file in its
	// own editor. Signature: (slug, filePath) => void.
	// If null, falls back to rendering a read-only markdown preview.
	onEditTerm: null
};

class PictViewVocabularyManager extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, Object.assign({}, defaultOptions, pOptions), pServiceHash);
		this.serviceType = 'PictViewVocabularyManager';

		this._SelectedSlug = '';
		this._Body = '';
		this._FilterText = '';
	}

	// ================================================================
	// Provider access
	// ================================================================

	_getProvider()
	{
		let tmpHash = this.options.VocabularyProviderHash || 'Vocabulary';
		return (this.pict && this.pict.providers && this.pict.providers[tmpHash]) || null;
	}

	// ================================================================
	// Data loading
	// ================================================================

	refreshTermList(fCallback)
	{
		let tmpProvider = this._getProvider();
		if (!tmpProvider)
		{
			if (fCallback) fCallback('No vocabulary provider');
			return;
		}
		let tmpSelf = this;
		tmpProvider.loadFromURL(this.options.VocabularyIndexURL, function (pError)
		{
			tmpSelf.render();
			if (fCallback) fCallback(pError);
		});
	}

	loadTerm(pSlug, fCallback)
	{
		let tmpSelf = this;
		tmpSelf._SelectedSlug = pSlug;
		let tmpURL = this.options.VocabularyTermURL + '/' + encodeURIComponent(pSlug);
		fetch(tmpURL)
			.then(function (r) { return r.json(); })
			.then(function (d)
			{
				tmpSelf._Body = (d && d.Body) || '';
				tmpSelf.render();
				if (fCallback) fCallback(null);
			})
			.catch(function (e)
			{
				if (fCallback) fCallback(e);
			});
	}

	editTerm(pSlug)
	{
		// Delegate to host app's editor via callback
		let tmpCallback = this.options.onEditTerm;
		if (typeof tmpCallback === 'function')
		{
			let tmpPath = (this.options.VocabularyFolderPath || 'vocabulary/') + pSlug + '.md';
			tmpCallback(pSlug, tmpPath);
			return;
		}

		// Fallback: try navigateToFile on the PictApplication
		if (this.pict && this.pict.PictApplication && typeof this.pict.PictApplication.navigateToFile === 'function')
		{
			let tmpPath = (this.options.VocabularyFolderPath || 'vocabulary/') + pSlug + '.md';
			this.pict.PictApplication.navigateToFile(tmpPath);
			return;
		}

		// Last resort: navigate to the vocabulary route
		if (typeof window !== 'undefined')
		{
			window.location.hash = (this.options.VocabularyRoute || '#/vocabulary') + '/' + pSlug;
		}
	}

	createTerm()
	{
		let tmpSlug = prompt('New term slug (e.g. attention, bert):');
		if (!tmpSlug) return;
		tmpSlug = tmpSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
		let tmpSelf = this;
		let tmpTitle = tmpSlug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
		let tmpURL = this.options.VocabularyTermURL + '/' + encodeURIComponent(tmpSlug);
		fetch(tmpURL,
			{
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: '# ' + tmpTitle + '\n\nDefinition goes here.\n\n## In this library\n\n- ...\n\n## See also\n\n- ...\n' })
			})
			.then(function (r) { return r.json(); })
			.then(function ()
			{
				// Refresh with a small delay to let the file flush to disk
				setTimeout(function ()
				{
					tmpSelf.refreshTermList(function ()
					{
						tmpSelf._SelectedSlug = tmpSlug;
						tmpSelf.render();
						// Open in the host editor
						tmpSelf.editTerm(tmpSlug);
					});
				}, 200);
			});
	}

	setFilter(pText)
	{
		this._FilterText = (pText || '').toLowerCase();
		// Only re-render the term list, NOT the filter input
		this._renderTermList();
	}

	// ================================================================
	// Rendering
	// ================================================================

	render()
	{
		let tmpDest = document.querySelector(this.options.DefaultDestinationAddress);
		if (!tmpDest) return;

		let tmpProvider = this._getProvider();
		let tmpTerms = tmpProvider ? tmpProvider.getTerms() : [];

		let tmpViewRef = `window.pict.views['${this.Hash}']`;
		let tmpHTML = '';

		// ── Header ───────────────────────────────────────────
		tmpHTML += '<div class="vocab-sidebar-header">';
		tmpHTML += '<strong>Vocabulary</strong>';
		tmpHTML += `<button class="vocab-btn" onclick="${tmpViewRef}.createTerm()">+ New</button>`;
		tmpHTML += '</div>';

		// ── Filter ───────────────────────────────────────────
		tmpHTML += `<input type="text" class="vocab-filter" id="vocab-mgr-filter" placeholder="Filter terms..." oninput="${tmpViewRef}.setFilter(this.value)" value="${this._FilterText}" />`;

		// ── Term list ────────────────────────────────────────
		tmpHTML += '<div class="vocab-list" id="vocab-mgr-list"></div>';

		tmpDest.innerHTML = tmpHTML;

		// Render the term list separately so filter updates don't
		// rebuild the whole DOM (which would steal focus from the input)
		this._renderTermList();
	}

	/**
	 * Re-render just the term list inside #vocab-mgr-list,
	 * preserving the filter input's focus and cursor position.
	 */
	_renderTermList()
	{
		let tmpListEl = document.querySelector('#vocab-mgr-list');
		if (!tmpListEl) return;

		let tmpProvider = this._getProvider();
		let tmpTerms = tmpProvider ? tmpProvider.getTerms() : [];
		let tmpViewRef = `window.pict.views['${this.Hash}']`;

		let tmpFiltered = tmpTerms;
		if (this._FilterText)
		{
			let tmpFilter = this._FilterText;
			tmpFiltered = tmpTerms.filter(function (t)
			{
				return t.slug.indexOf(tmpFilter) !== -1 ||
					t.title.toLowerCase().indexOf(tmpFilter) !== -1;
			});
		}

		let tmpHTML = '';
		for (let i = 0; i < tmpFiltered.length; i++)
		{
			let tmpTerm = tmpFiltered[i];
			let tmpActive = tmpTerm.slug === this._SelectedSlug ? ' vocab-item-active' : '';
			tmpHTML += `<div class="vocab-item${tmpActive}" onclick="${tmpViewRef}.loadTerm('${tmpTerm.slug}')">`;
			tmpHTML += '<div style="display:flex;align-items:center;gap:6px">';
			tmpHTML += `<div class="vocab-item-title" style="flex:1">${tmpTerm.title}</div>`;
			if (tmpTerm.slug === this._SelectedSlug)
			{
				tmpHTML += `<button class="vocab-btn" style="font-size:0.7em;padding:2px 8px" onclick="event.stopPropagation();${tmpViewRef}.editTerm('${tmpTerm.slug}')">Edit</button>`;
			}
			tmpHTML += '</div>';
			tmpHTML += `<div class="vocab-item-short">${(tmpTerm.short || '').substring(0, 80)}${tmpTerm.short && tmpTerm.short.length > 80 ? '...' : ''}</div>`;
			tmpHTML += '</div>';
		}

		if (tmpFiltered.length === 0 && this._FilterText)
		{
			tmpHTML += '<div class="vocab-empty">No terms match your filter.</div>';
		}
		else if (tmpFiltered.length === 0)
		{
			tmpHTML += '<div class="vocab-empty">No vocabulary terms yet. Click <strong>+ New</strong> to create one.</div>';
		}

		tmpListEl.innerHTML = tmpHTML;
	}
}

module.exports = PictViewVocabularyManager;
module.exports.default_configuration = defaultOptions;
