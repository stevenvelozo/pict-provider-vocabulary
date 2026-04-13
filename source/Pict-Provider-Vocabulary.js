/**
 * Pict Provider: Vocabulary
 *
 * Manages a vocabulary/glossary term index and provides:
 *   - A resolver callback for pict-section-content's parseMarkdown
 *     auto-linking system (the 4th parameter to parseMarkdown)
 *   - Popover hover handlers for rendered .pict-vocab-term elements
 *   - Term access for glossary UI views
 *
 * The provider is source-agnostic — terms can be loaded from:
 *   - A pre-built object: loadIndex({slug: {title, short}})
 *   - A URL: loadFromURL('/api/vocabulary/index', fCallback)
 *   - Application-specific code (e.g. Meadow database query)
 *
 * @author Steven Velozo <steven@velozo.com>
 * @license MIT
 */
const libPictProvider = require('pict-provider');
const libCSS = require('./Pict-Provider-Vocabulary-CSS.js');

class PictProviderVocabulary extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this.serviceType = 'PictProviderVocabulary';

		// The term index: { slug: { title, short } }
		this._Index = {};

		// Inject the popover CSS into the Pict CSS cascade
		if (this.pict && this.pict.CSSMap)
		{
			this.pict.CSSMap['Pict-Provider-Vocabulary'] =
			{
				Hash: 'Pict-Provider-Vocabulary',
				CSS: libCSS,
				Priority: 500
			};
		}
	}

	// ================================================================
	// Loading terms
	// ================================================================

	/**
	 * Load terms from a pre-built index object.
	 * @param {object} pIndex - { slug: { title: string, short: string } }
	 */
	loadIndex(pIndex)
	{
		this._Index = pIndex || {};
	}

	/**
	 * Load terms from a URL. Expects a JSON response with an
	 * `Index` key: { Index: { slug: { title, short } } }.
	 * @param {string} pURL
	 * @param {function} [fCallback] - (pError) callback
	 */
	loadFromURL(pURL, fCallback)
	{
		let tmpSelf = this;
		if (typeof fetch === 'undefined')
		{
			// Server-side / test — no fetch
			if (fCallback) fCallback(null);
			return;
		}
		fetch(pURL)
			.then(function (pResponse) { return pResponse.json(); })
			.then(function (pData)
			{
				tmpSelf._Index = (pData && pData.Index) || {};
				if (fCallback) fCallback(null);
			})
			.catch(function (pError)
			{
				if (tmpSelf.log) tmpSelf.log.warn('VocabularyProvider: fetch failed: ' + pError.message);
				if (fCallback) fCallback(pError);
			});
	}

	// ================================================================
	// Resolver for pict-section-content
	// ================================================================

	/**
	 * Return a resolver callback suitable as the 4th parameter to
	 * pict-section-content's parseMarkdown(). Returns null if no
	 * terms are loaded (parseMarkdown will skip vocabulary linking).
	 *
	 * Usage:
	 *   let resolver = vocabProvider.getResolver();
	 *   contentProvider.parseMarkdown(md, null, null, resolver);
	 */
	getResolver()
	{
		let tmpIndex = this._Index;
		if (!tmpIndex || Object.keys(tmpIndex).length === 0)
		{
			return null;
		}
		return function (pWord)
		{
			let tmpEntry = tmpIndex[pWord];
			if (!tmpEntry) return null;
			return { slug: pWord, title: tmpEntry.title, short: tmpEntry.short };
		};
	}

	// ================================================================
	// Term access for glossary views
	// ================================================================

	/**
	 * Return all terms as a sorted array of { slug, title, short }.
	 */
	getTerms()
	{
		let tmpSlugs = Object.keys(this._Index).sort();
		let tmpTerms = [];
		for (let i = 0; i < tmpSlugs.length; i++)
		{
			let tmpSlug = tmpSlugs[i];
			let tmpEntry = this._Index[tmpSlug];
			tmpTerms.push(
				{
					slug: tmpSlug,
					title: tmpEntry.title || tmpSlug,
					short: tmpEntry.short || ''
				});
		}
		return tmpTerms;
	}

	/**
	 * Return a single term by slug, or null if not found.
	 */
	getTerm(pSlug)
	{
		let tmpEntry = this._Index[pSlug];
		if (!tmpEntry) return null;
		return { slug: pSlug, title: tmpEntry.title || pSlug, short: tmpEntry.short || '' };
	}

	/**
	 * Return the raw index object (for serialization or debugging).
	 */
	getIndex()
	{
		return this._Index;
	}

	// ================================================================
	// Popover wiring
	// ================================================================

	/**
	 * Wire hover handlers on all .pict-vocab-term elements inside
	 * the given container. Shows a positioned popover with the term
	 * title, short definition, and a "Read more →" link.
	 *
	 * @param {string} pContainerSelector - CSS selector for the
	 *   container to search for .pict-vocab-term elements.
	 * @param {object} [pOptions] - { vocabularyRoute: '#/vocabulary' }
	 */
	wirePopovers(pContainerSelector, pOptions)
	{
		if (typeof document === 'undefined') return;
		let tmpOpts = pOptions || {};
		let tmpRoute = tmpOpts.vocabularyRoute || '#/vocabulary';

		let tmpContainer = document.querySelector(pContainerSelector);
		if (!tmpContainer) return;

		let tmpTerms = tmpContainer.querySelectorAll('.pict-vocab-term');
		if (!tmpTerms || tmpTerms.length === 0) return;

		for (let i = 0; i < tmpTerms.length; i++)
		{
			let tmpEl = tmpTerms[i];
			// Skip if already wired
			if (tmpEl._vocabWired) continue;
			tmpEl._vocabWired = true;

			tmpEl.addEventListener('mouseenter', function (pEvent)
			{
				let tmpSlug = tmpEl.getAttribute('data-vocab-slug');
				let tmpTitle = tmpEl.getAttribute('data-vocab-title') || tmpSlug;
				let tmpShort = tmpEl.getAttribute('data-vocab-short') || '';

				// Remove any existing popover
				let tmpOld = document.querySelector('.vocab-popover');
				if (tmpOld) tmpOld.remove();

				let tmpPopover = document.createElement('div');
				tmpPopover.className = 'vocab-popover';
				tmpPopover.innerHTML =
					'<div class="vocab-popover-title">' + tmpTitle + '</div>' +
					'<div class="vocab-popover-short">' + tmpShort + '</div>' +
					'<a class="vocab-popover-link" href="' + tmpRoute + '/' + tmpSlug + '">Read more &rarr;</a>';

				// Position near the term
				let tmpRect = tmpEl.getBoundingClientRect();
				tmpPopover.style.left = tmpRect.left + 'px';
				tmpPopover.style.top = (tmpRect.bottom + 6) + 'px';

				document.body.appendChild(tmpPopover);

				// Dismiss on mouse leave (with delay so user can hover into popover)
				let tmpDismissTimer = null;
				let tmpDismiss = function ()
				{
					tmpDismissTimer = setTimeout(function ()
					{
						if (tmpPopover.parentNode) tmpPopover.remove();
					}, 300);
				};
				let tmpCancelDismiss = function ()
				{
					if (tmpDismissTimer) clearTimeout(tmpDismissTimer);
				};

				tmpEl.addEventListener('mouseleave', tmpDismiss, { once: true });
				tmpPopover.addEventListener('mouseenter', tmpCancelDismiss);
				tmpPopover.addEventListener('mouseleave', function ()
				{
					if (tmpPopover.parentNode) tmpPopover.remove();
				});
			});
		}
	}
}

module.exports = PictProviderVocabulary;
module.exports.default_configuration = {};

// Export the vocabulary manager view so host apps can register it.
// Usage:
//   const libVocab = require('pict-provider-vocabulary');
//   pict.addView('Vocabulary', libVocab.VocabularyManagerView.default_configuration, libVocab.VocabularyManagerView);
module.exports.VocabularyManagerView = require('./views/PictView-VocabularyManager.js');
