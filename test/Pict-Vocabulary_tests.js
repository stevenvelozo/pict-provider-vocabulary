/**
 * pict-provider-vocabulary — Unit Tests
 */
const libAssert = require('assert');
const libFable = require('fable');

const libPictProviderVocabulary = require('../source/Pict-Provider-Vocabulary.js');

suite
(
	'pict-provider-vocabulary',
	() =>
	{
		function createProvider()
		{
			let tmpFable = new libFable(
				{
					Product: 'VocabTest',
					LogStreams: [{ streamtype: 'console', level: 'fatal' }]
				});

			let tmpProvider = new libPictProviderVocabulary(tmpFable, {}, 'TestVocab');
			tmpProvider.pict = { AppData: {}, CSSMap: {} };
			tmpProvider.log = tmpFable.log;
			return tmpProvider;
		}

		suite
		(
			'Module exports',
			() =>
			{
				test
				(
					'should export the provider class',
					(fDone) =>
					{
						libAssert.strictEqual(typeof libPictProviderVocabulary, 'function');
						libAssert.ok(libPictProviderVocabulary.default_configuration);
						fDone();
					}
				);
			}
		);

		suite
		(
			'Index management',
			() =>
			{
				test
				(
					'loadIndex should accept a term map',
					(fDone) =>
					{
						let tmpProv = createProvider();
						tmpProv.loadIndex(
							{
								vae: { title: 'VAE', short: 'Variational Autoencoder' },
								lora: { title: 'LoRA', short: 'Low-Rank Adaptation' }
							});
						libAssert.strictEqual(Object.keys(tmpProv.getIndex()).length, 2);
						fDone();
					}
				);

				test
				(
					'getTerms should return sorted array',
					(fDone) =>
					{
						let tmpProv = createProvider();
						tmpProv.loadIndex(
							{
								vae: { title: 'VAE', short: 'A' },
								lora: { title: 'LoRA', short: 'B' },
								diffusion: { title: 'Diffusion', short: 'C' }
							});
						let tmpTerms = tmpProv.getTerms();
						libAssert.strictEqual(tmpTerms.length, 3);
						libAssert.strictEqual(tmpTerms[0].slug, 'diffusion');
						libAssert.strictEqual(tmpTerms[1].slug, 'lora');
						libAssert.strictEqual(tmpTerms[2].slug, 'vae');
						fDone();
					}
				);

				test
				(
					'getTerm should return a single term or null',
					(fDone) =>
					{
						let tmpProv = createProvider();
						tmpProv.loadIndex({ vae: { title: 'VAE', short: 'Enc' } });
						let tmpTerm = tmpProv.getTerm('vae');
						libAssert.strictEqual(tmpTerm.slug, 'vae');
						libAssert.strictEqual(tmpTerm.title, 'VAE');
						libAssert.strictEqual(tmpProv.getTerm('nonexistent'), null);
						fDone();
					}
				);
			}
		);

		suite
		(
			'Resolver',
			() =>
			{
				test
				(
					'getResolver should return null when index is empty',
					(fDone) =>
					{
						let tmpProv = createProvider();
						libAssert.strictEqual(tmpProv.getResolver(), null);
						fDone();
					}
				);

				test
				(
					'getResolver should return a function when terms exist',
					(fDone) =>
					{
						let tmpProv = createProvider();
						tmpProv.loadIndex({ vae: { title: 'VAE', short: 'Enc' } });
						let tmpResolver = tmpProv.getResolver();
						libAssert.strictEqual(typeof tmpResolver, 'function');
						fDone();
					}
				);

				test
				(
					'resolver should return term data for known words',
					(fDone) =>
					{
						let tmpProv = createProvider();
						tmpProv.loadIndex({ vae: { title: 'VAE (Variational Autoencoder)', short: 'Compresses images' } });
						let tmpResolver = tmpProv.getResolver();
						let tmpResult = tmpResolver('vae');
						libAssert.strictEqual(tmpResult.slug, 'vae');
						libAssert.strictEqual(tmpResult.title, 'VAE (Variational Autoencoder)');
						libAssert.strictEqual(tmpResult.short, 'Compresses images');
						fDone();
					}
				);

				test
				(
					'resolver should return null for unknown words',
					(fDone) =>
					{
						let tmpProv = createProvider();
						tmpProv.loadIndex({ vae: { title: 'VAE', short: 'Enc' } });
						let tmpResolver = tmpProv.getResolver();
						libAssert.strictEqual(tmpResolver('unknown'), null);
						libAssert.strictEqual(tmpResolver(''), null);
						fDone();
					}
				);
			}
		);

		suite
		(
			'loadFromURL',
			() =>
			{
				test
				(
					'should call callback with error for unreachable URL',
					(fDone) =>
					{
						let tmpProv = createProvider();
						// Port 1 is almost certainly not running a server
						tmpProv.loadFromURL('http://127.0.0.1:1/api/vocabulary/index', (pError) =>
						{
							// Should get an error (connection refused or similar)
							libAssert.ok(pError, 'Expected an error for unreachable URL');
							libAssert.strictEqual(Object.keys(tmpProv.getIndex()).length, 0);
							fDone();
						});
					}
				);
			}
		);
	}
);
