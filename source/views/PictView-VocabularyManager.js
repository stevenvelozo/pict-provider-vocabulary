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
 * Layout: left sidebar (search + A-Z term list) + right content
 * pane (rendered markdown with edit toggle).
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

	// API endpoints — configurable per host app. The provider
	// handles index loading; these are only for per-term CRUD.
	VocabularyIndexURL: '/api/vocabulary/index',
	VocabularyTermURL: '/api/vocabulary/term',   // + /:slug

	// Route prefix for "Read more →" links in popovers.
	VocabularyRoute: '#/vocabulary',

	// The hash of the Vocabulary provider to read terms from.
	// The view looks it up on this.pict.providers[ProviderHash].
	VocabularyProviderHash: 'Vocabulary'
};

class PictViewVocabularyManager extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, Object.assign({}, defaultOptions, pOptions), pServiceHash);
		this.serviceType = 'PictViewVocabularyManager';

		this._SelectedSlug = '';
		this._Body = '';
		this._EditMode = false;
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

	/**
	 * Reload the term list from the provider and re-render.
	 * The provider's index is already loaded at app init; this
	 * just refreshes in case terms were added or edited.
	 */
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
		tmpSelf._EditMode = false;
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

	saveTerm(fCallback)
	{
		let tmpSelf = this;
		let tmpTextarea = document.querySelector('#vocab-edit-textarea');
		let tmpBody = tmpTextarea ? tmpTextarea.value : '';
		let tmpURL = this.options.VocabularyTermURL + '/' + encodeURIComponent(tmpSelf._SelectedSlug);
		fetch(tmpURL,
			{
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: tmpBody })
			})
			.then(function (r) { return r.json(); })
			.then(function ()
			{
				tmpSelf._Body = tmpBody;
				tmpSelf._EditMode = false;
				tmpSelf.refreshTermList(fCallback);
			})
			.catch(function (e)
			{
				if (fCallback) fCallback(e);
			});
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
				tmpSelf.refreshTermList(function ()
				{
					tmpSelf.loadTerm(tmpSlug);
				});
			});
	}

	setFilter(pText)
	{
		this._FilterText = (pText || '').toLowerCase();
		this.render();
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
		let tmpHTML = '<div class="vocab-layout">';

		// ── Sidebar ──────────────────────────────────────────
		tmpHTML += '<div class="vocab-sidebar">';
		tmpHTML += '<div class="vocab-sidebar-header">';
		tmpHTML += '<strong>Vocabulary</strong>';
		tmpHTML += `<button class="vocab-btn" onclick="${tmpViewRef}.createTerm()">+ New</button>`;
		tmpHTML += '</div>';
		tmpHTML += `<input type="text" class="vocab-filter" placeholder="Filter terms..." oninput="${tmpViewRef}.setFilter(this.value)" value="${this._FilterText}" />`;
		tmpHTML += '<div class="vocab-list">';

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

		for (let i = 0; i < tmpFiltered.length; i++)
		{
			let tmpTerm = tmpFiltered[i];
			let tmpActive = tmpTerm.slug === this._SelectedSlug ? ' vocab-item-active' : '';
			tmpHTML += `<div class="vocab-item${tmpActive}" onclick="${tmpViewRef}.loadTerm('${tmpTerm.slug}')">`;
			tmpHTML += `<div class="vocab-item-title">${tmpTerm.title}</div>`;
			tmpHTML += `<div class="vocab-item-short">${(tmpTerm.short || '').substring(0, 80)}${tmpTerm.short && tmpTerm.short.length > 80 ? '...' : ''}</div>`;
			tmpHTML += '</div>';
		}

		if (tmpFiltered.length === 0)
		{
			tmpHTML += '<div class="vocab-empty">No terms match your filter.</div>';
		}

		tmpHTML += '</div></div>';

		// ── Content pane ─────────────────────────────────────
		tmpHTML += '<div class="vocab-content">';

		if (!this._SelectedSlug)
		{
			tmpHTML += '<div class="vocab-empty">Select a term from the sidebar, or click <strong>+ New</strong> to define one.</div>';
		}
		else if (this._EditMode)
		{
			tmpHTML += '<div class="vocab-toolbar">';
			tmpHTML += `<span class="vocab-slug">${this._SelectedSlug}</span>`;
			tmpHTML += `<button class="vocab-btn vocab-btn-primary" onclick="${tmpViewRef}.saveTerm()">Save</button>`;
			tmpHTML += `<button class="vocab-btn" onclick="${tmpViewRef}._EditMode=false;${tmpViewRef}.render()">Cancel</button>`;
			tmpHTML += '</div>';
			tmpHTML += `<textarea id="vocab-edit-textarea" class="vocab-editor">${this._Body.replace(/</g, '&lt;')}</textarea>`;
		}
		else
		{
			tmpHTML += '<div class="vocab-toolbar">';
			tmpHTML += `<span class="vocab-slug">${this._SelectedSlug}</span>`;
			tmpHTML += `<button class="vocab-btn" onclick="${tmpViewRef}._EditMode=true;${tmpViewRef}.render()">Edit</button>`;
			tmpHTML += '</div>';

			let tmpRendered = this._Body;
			try
			{
				let tmpContentProv = this.pict && this.pict.providers && this.pict.providers['Pict-Content'];
				if (tmpContentProv && typeof tmpContentProv.parseMarkdown === 'function')
				{
					let tmpVocabResolver = tmpProvider ? tmpProvider.getResolver() : null;
					tmpRendered = tmpContentProv.parseMarkdown(this._Body, null, null, tmpVocabResolver);
				}
			}
			catch (e)
			{
				tmpRendered = '<pre>' + this._Body.replace(/</g, '&lt;') + '</pre>';
			}
			tmpHTML += `<div class="vocab-rendered">${tmpRendered}</div>`;
		}

		tmpHTML += '</div></div>';

		tmpDest.innerHTML = tmpHTML;

		// Wire popovers on the rendered content
		if (tmpProvider && typeof tmpProvider.wirePopovers === 'function')
		{
			tmpProvider.wirePopovers(this.options.DefaultDestinationAddress,
				{ vocabularyRoute: this.options.VocabularyRoute });
		}
	}
}

module.exports = PictViewVocabularyManager;
module.exports.default_configuration = defaultOptions;
