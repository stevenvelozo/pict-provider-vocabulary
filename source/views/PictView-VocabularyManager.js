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
	DefaultRenderable: 'VocabMgr-Display',
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
	onEditTerm: null,

	Templates:
	[
		{
			Hash: 'VocabMgr-Shell',
			Template: /*html*/`<div class="vocab-sidebar-header"><strong>Vocabulary</strong></div>
<input type="text" class="vocab-filter" id="vocab-mgr-filter" placeholder="Filter terms..." oninput="{~P~}.views['{~D:Record.ViewHash~}'].setFilter(this.value)" value="" />
<div class="vocab-list" id="vocab-mgr-list"></div>
<div class="vocab-create-overlay" id="vocab-mgr-create-overlay" style="display:none" onclick="{~P~}.views['{~D:Record.ViewHash~}'].hideCreateModal()">
  <div class="vocab-create-panel" onclick="event.stopPropagation()">
    <div class="vocab-create-body">
      <div class="vocab-create-title">New Vocabulary Term</div>
      <input type="text" class="vocab-create-input" id="vocab-mgr-create-input" placeholder="Term slug (e.g. attention, bert)" onkeydown="if(event.key==='Enter'){event.preventDefault();{~P~}.views['{~D:Record.ViewHash~}']._submitCreateTerm()}" />
    </div>
    <div class="vocab-create-actions">
      <button class="vocab-btn vocab-btn-primary" onclick="{~P~}.views['{~D:Record.ViewHash~}']._submitCreateTerm()">Create</button>
      <button class="vocab-btn" onclick="{~P~}.views['{~D:Record.ViewHash~}'].hideCreateModal()">Cancel</button>
    </div>
    <div class="vocab-create-footer"><kbd>Enter</kbd> to create &middot; <kbd>Esc</kbd> to cancel</div>
  </div>
</div>`
		},
		{
			Hash: 'VocabMgr-TermItem',
			Template: /*html*/`<div class="vocab-item" onclick="{~P~}.views['{~D:Record.ViewHash~}'].loadTerm('{~D:Record.slug~}')">
  <div style="display:flex;align-items:center;gap:6px">
    <div class="vocab-item-title" style="flex:1">{~D:Record.title~}</div>
  </div>
  <div class="vocab-item-short">{~D:Record.shortTruncated~}</div>
</div>`
		},
		{
			Hash: 'VocabMgr-TermActive',
			Template: /*html*/`<div class="vocab-item vocab-item-active" onclick="{~P~}.views['{~D:Record.ViewHash~}'].loadTerm('{~D:Record.slug~}')">
  <div style="display:flex;align-items:center;gap:6px">
    <div class="vocab-item-title" style="flex:1">{~D:Record.title~}</div>
  </div>
  <div class="vocab-item-preview-short">{~D:Record.shortEscaped~}</div>
  <div class="vocab-item-preview-body">{~D:Record.bodyEscaped~}</div>
  <div class="vocab-item-preview-actions">
    <button class="vocab-btn vocab-btn-primary" style="font-size:0.75em" onclick="event.stopPropagation();{~P~}.views['{~D:Record.ViewHash~}'].editTerm('{~D:Record.slug~}')">Edit in Editor</button>
  </div>
</div>`
		},
		{
			Hash: 'VocabMgr-TermActiveLoading',
			Template: /*html*/`<div class="vocab-item vocab-item-active" onclick="{~P~}.views['{~D:Record.ViewHash~}'].loadTerm('{~D:Record.slug~}')">
  <div style="display:flex;align-items:center;gap:6px">
    <div class="vocab-item-title" style="flex:1">{~D:Record.title~}</div>
  </div>
  <div class="vocab-item-short">{~D:Record.shortTruncated~}</div>
  <div class="vocab-item-preview-actions">
    <button class="vocab-btn" style="font-size:0.75em" onclick="event.stopPropagation();{~P~}.views['{~D:Record.ViewHash~}'].editTerm('{~D:Record.slug~}')">Edit</button>
  </div>
</div>`
		},
		{
			Hash: 'VocabMgr-Empty',
			Template: /*html*/`<div class="vocab-empty">No vocabulary terms yet. Click <strong>+ New</strong> to create one.</div>`
		},
		{
			Hash: 'VocabMgr-EmptyFilter',
			Template: /*html*/`<div class="vocab-empty">No terms match your filter.</div>`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'VocabMgr-Display',
			TemplateHash: 'VocabMgr-Shell',
			RenderMethod: 'replace'
		}
	]
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
		let tmpPath = (this.options.VocabularyFolderPath || 'vocabulary/') + pSlug + '.md';

		// Delegate to host app's editor via callback
		let tmpCallback = this.options.onEditTerm;
		if (typeof tmpCallback === 'function')
		{
			if (this.log) this.log.info('VocabularyManager: editing term [' + pSlug + '] path [' + tmpPath + '] via onEditTerm callback');
			tmpCallback(pSlug, tmpPath);
			return;
		}

		// Fallback: try navigateToFile on the PictApplication
		if (this.pict && this.pict.PictApplication && typeof this.pict.PictApplication.navigateToFile === 'function')
		{
			if (this.log) this.log.info('VocabularyManager: editing term [' + pSlug + '] path [' + tmpPath + '] via navigateToFile fallback');
			this.pict.PictApplication.navigateToFile(tmpPath);
			return;
		}

		// Last resort: navigate to the vocabulary route
		if (this.log) this.log.info('VocabularyManager: editing term [' + pSlug + '] via hash navigation fallback');
		if (typeof window !== 'undefined')
		{
			window.location.hash = (this.options.VocabularyRoute || '#/vocabulary') + '/' + pSlug;
		}
	}

	createTerm()
	{
		this.showCreateModal();
	}

	// ================================================================
	// Create-term modal
	// ================================================================

	showCreateModal()
	{
		let tmpOverlay = this.pict.ContentAssignment.getElement('#vocab-mgr-create-overlay')[0];
		if (!tmpOverlay) return;

		tmpOverlay.style.display = '';
		tmpOverlay.classList.add('open');

		let tmpInput = this.pict.ContentAssignment.getElement('#vocab-mgr-create-input')[0];
		if (tmpInput)
		{
			tmpInput.value = '';
			tmpInput.focus();
		}

		// Attach Escape listener
		if (!this._createModalKeyHandler)
		{
			let tmpSelf = this;
			this._createModalKeyHandler = function (pEvent)
			{
				if (pEvent.key === 'Escape')
				{
					pEvent.preventDefault();
					tmpSelf.hideCreateModal();
				}
			};
		}
		window.addEventListener('keydown', this._createModalKeyHandler);
	}

	hideCreateModal()
	{
		let tmpOverlay = this.pict.ContentAssignment.getElement('#vocab-mgr-create-overlay')[0];
		if (tmpOverlay)
		{
			tmpOverlay.classList.remove('open');
			tmpOverlay.style.display = 'none';
		}

		let tmpInput = this.pict.ContentAssignment.getElement('#vocab-mgr-create-input')[0];
		if (tmpInput)
		{
			tmpInput.value = '';
		}

		if (this._createModalKeyHandler)
		{
			window.removeEventListener('keydown', this._createModalKeyHandler);
		}
	}

	_submitCreateTerm()
	{
		let tmpInput = this.pict.ContentAssignment.getElement('#vocab-mgr-create-input')[0];
		if (!tmpInput) return;

		let tmpSlug = (tmpInput.value || '').trim();
		if (!tmpSlug) return;

		tmpSlug = tmpSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

		let tmpSelf = this;
		let tmpTitle = tmpSlug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
		let tmpURL = this.options.VocabularyTermURL + '/' + encodeURIComponent(tmpSlug);

		this.hideCreateModal();

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
	// Lifecycle
	// ================================================================

	onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent)
	{
		this._renderTermList();

		if (this.pict && this.pict.CSSMap && typeof this.pict.CSSMap.injectCSS === 'function')
		{
			this.pict.CSSMap.injectCSS();
		}

		return super.onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent);
	}

	// ================================================================
	// Rendering
	// ================================================================

	/**
	 * Re-render just the term list inside #vocab-mgr-list,
	 * preserving the filter input's focus and cursor position.
	 */
	_renderTermList()
	{
		let tmpListEl = this.pict.ContentAssignment.getElement('#vocab-mgr-list')[0];
		if (!tmpListEl) return;

		let tmpProvider = this._getProvider();
		let tmpTerms = tmpProvider ? tmpProvider.getTerms() : [];

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
			let tmpIsActive = tmpTerm.slug === this._SelectedSlug;

			let tmpShortText = (tmpTerm.short || '').substring(0, 80);
			if (tmpTerm.short && tmpTerm.short.length > 80) tmpShortText += '...';

			let tmpRecord =
			{
				ViewHash: this.Hash,
				slug: tmpTerm.slug,
				title: tmpTerm.title,
				shortTruncated: this._escapeHTML(tmpShortText),
				shortEscaped: this._escapeHTML(tmpTerm.short || ''),
				bodyEscaped: this._escapeHTML(this._Body)
			};

			if (tmpIsActive && this._Body)
			{
				tmpHTML += this.pict.parseTemplateByHash('VocabMgr-TermActive', tmpRecord);
			}
			else if (tmpIsActive)
			{
				tmpHTML += this.pict.parseTemplateByHash('VocabMgr-TermActiveLoading', tmpRecord);
			}
			else
			{
				tmpHTML += this.pict.parseTemplateByHash('VocabMgr-TermItem', tmpRecord);
			}
		}

		if (tmpFiltered.length === 0 && this._FilterText)
		{
			tmpHTML += this.pict.parseTemplateByHash('VocabMgr-EmptyFilter', {});
		}
		else if (tmpFiltered.length === 0)
		{
			tmpHTML += this.pict.parseTemplateByHash('VocabMgr-Empty', {});
		}

		this.pict.ContentAssignment.assignContent('#vocab-mgr-list', tmpHTML);
	}

	// ================================================================
	// Utilities
	// ================================================================

	_escapeHTML(pText)
	{
		return (pText || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
}

module.exports = PictViewVocabularyManager;
module.exports.default_configuration = defaultOptions;
