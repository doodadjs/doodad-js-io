//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: NodeJs_IO_Base.js - Node.js IO Base Tools
// Project home: https://github.com/doodadjs/
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2015-2017 Claude Petit
//
//	Licensed under the Apache License, Version 2.0 (the "License");
//	you may not use this file except in compliance with the License.
//	You may obtain a copy of the License at
//
//		http://www.apache.org/licenses/LICENSE-2.0
//
//	Unless required by applicable law or agreed to in writing, software
//	distributed under the License is distributed on an "AS IS" BASIS,
//	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//	See the License for the specific language governing permissions and
//	limitations under the License.
//! END_REPLACE()

module.exports = {
	add: function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.NodeJs.IO'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
			namespaces: ['MixIns', 'Interfaces'],
			dependencies: [
				'Doodad.IO',
			],
			
			create: function create(root, /*optional*/_options, _shared) {
				"use strict";
				
				const doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					files = tools.Files,
					mixIns = doodad.MixIns,
					io = doodad.IO,
					ioMixIns = io.MixIns,
					ioInterfaces = io.Interfaces,
					nodejs = doodad.NodeJs,
					nodejsMixIns = nodejs.MixIns,
					nodejsInterfaces = nodejs.Interfaces,
					nodejsIO = nodejs.IO,
					nodejsIOMixIns = nodejsIO.MixIns,
					nodejsIOInterfaces = nodejsIO.Interfaces;

				//=====================================================
				// Internals
				//=====================================================
				
				const __Internal__ = {
				};

				//=====================================================
				// DESTROY hook
				//=====================================================
				
				__Internal__.oldDESTROY = _shared.DESTROY;
				_shared.DESTROY = function DESTROY(obj) {
					if (types.isLike(obj, doodad.Interface) && types._implements(obj, nodejsIOInterfaces.IStream)) {
						if (!obj.destroyed) {
							obj.destroy();
						};
					} else {
						__Internal__.oldDESTROY(obj);
					};
				};

				//=====================================================
				// Interfaces (continued)
				//=====================================================
				
				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsInterfaces.IEmitter.$extend(
				{
					$TYPE_NAME: 'IStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('IStreamIsolatedMixInNodeJs')), true) */,
					
					onclose: doodad.RAW_EVENT(),

					destroyed: doodad.PUBLIC(doodad.PERSISTENT(doodad.READ_ONLY( false ))),
					
					onerror: doodad.RAW_ERROR_EVENT(function onerror(err) {
						const host = this[doodad.HostSymbol];

						let emitted = this._super(err);

						if (types.isEntrant(host, 'onError')) {
							if (host.onError.getCount() > 0) {
								const ev = new doodad.ErrorEvent(err);

								host.onError(ev);

								if (ev.prevent) {
									err.trapped = true;
								};
							};
						};

						if (err.trapped) {
							emitted = true;
						} else if (emitted) {
							err.trapped = true;
						};

						return !!emitted;
					}),

					destroy: doodad.PUBLIC(doodad.CAN_BE_DESTROYED(function destroy() {
						// IMPORTANT: Never access to "host" from this function.

						if (!this.destroyed) {
							this.onclose();

							this.removeAllListeners();

							_shared.setAttribute(this, 'destroyed', true);

							// NOTE: Should calls "IReadable.unpipe".
							const host = this[doodad.HostSymbol];
							types.DESTROY(host);

							this._delete();
						};
					})),
				}))));
				
				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IStream.$extend(
				{
					$TYPE_NAME: 'IReadable',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('IReadableIsolatedMixInNodeJs')), true) */,
					
					ondata: doodad.RAW_EVENT(),
					onpause: doodad.RAW_EVENT(),
					onresume: doodad.RAW_EVENT(),
					onend: doodad.RAW_EVENT(),
					onreadable: doodad.RAW_EVENT(),
					
					__destinations: doodad.PROTECTED(null),
					
					__pipeWriting: doodad.PROTECTED(0),

					__encoding: doodad.PROTECTED(null),

					readable: doodad.PUBLIC(true),
					_readableState: doodad.PUBLIC({
						flowing: true,
						ended: false,
					}),

					onnewListener: doodad.OVERRIDE(function onnewListener(event, listener) {
						if ((event === 'readable') && !this.isPaused()) {
							this.pause();
						};
						return this._super(event, listener);
					}),

					//__pipeOnData: doodad.PROTECTED(function __pipeOnData(ev) {
					__pipeOnReady: doodad.PROTECTED(function __pipeOnReady(ev) {
						//const isBuffered = ev.handlerData[0],
						//	isReady = ev.handlerData[1];

						//if (isBuffered && !isReady && !ev.prevent) {
						//	this.onData.detach(this, this.__pipeOnData);
						//	this.onReady.attach(this, this.__pipeOnData, 40, [isBuffered, true]);
						//	return;
						//};

						const destinations = this.__destinations;
						const host = this[doodad.HostSymbol];

						const data = ev.data;

						ev.preventDefault();

						const eof = (data.raw === io.EOF);

						const globalState = {drainCount: 0, consumeCb: null};

						if (destinations.length) {
							const createWriteCb = function _createWriteCb(state) {
								if (!globalState.consumeCb) {
									globalState.consumeCb = data.defer();	// Will be consumed later
								};
								return doodad.AsyncCallback(this, function _writeCb(err) { // async
									this.__pipeWriting--;
									if (err) {
										state.ok = false;
										globalState.consumeCb(err);
										this.onerror(err);
									} else if (state.ok) {
										if (this.__pipeWriting <= 0) {
											this.__pipeWriting = 0;

											globalState.consumeCb(null);

											if (eof) {
												if (!this._readableState.ended) {
													this.onend();
													this._readableState.ended = true;
												};
											};
										};
									};
								}, this.onerror);
							};

							const encoding = this.getEncoding();
							const value = host.transform(data, {encoding: encoding});

							if (eof) {
								// End
								tools.forEach(destinations, function(state) {
									this.__pipeWriting++;
									state.ok = true;
									if (state.endDestination) {
										if (types.isNothing(value)) {
											state.destination.end(createWriteCb.call(this, state));
										} else {
											state.destination.end(value, createWriteCb.call(this, state));
										};
									} else if (!types.isNothing(value)) {
										state.destination.write(value, createWriteCb.call(this, state));
									};
								}, this);
							};

							if (!types.isNothing(value)) {
								tools.forEach(destinations, function forEachDestination(state) {
									if (!eof || !state.endDestination) {
										this.__pipeWriting++;
										state.ok = state.destination.write(value); //, createWriteCb.call(this, state));
										if (!state.ok) {
											if (globalState.drainCount === 0) {
												this.pause();
											};
											if (!state.drainCb) {
												const drainFn = createWriteCb.call(this, state);
												state.drainCb = doodad.Callback(this, function _drainCb() {
													globalState.drainCount--;
													state.ok = true;
													state.drainCb = null;
													drainFn(null);
													if (globalState.drainCount <= 0) {
														this.resume();
													};
												});
												globalState.drainCount++;
												state.destination.once('drain', state.drainCb);
											};
										};
									};
								}, this);
							};
						};
					}),

					getEncoding: doodad.PUBLIC(function getEncoding() {
						const host = this[doodad.HostSymbol];
						if (host._implements(ioMixIns.TextTransformable)) {
							return host.options.encoding;
						} else {
							return this.__encoding;
						};
					}),

					isPaused: doodad.PUBLIC(function isPaused() {
						const host = this[doodad.HostSymbol];
						return host.isListening();
					}),
					
					pause: doodad.PUBLIC(function pause() {
						const host = this[doodad.HostSymbol];
						host.stopListening();
					}),
					
					pipe: doodad.PUBLIC(function pipe(destination, /*optional*/options) {
						const host = this[doodad.HostSymbol];
						if (types._implements(destination, ioInterfaces.IStream)) {
							return host.pipe(destination, options);
						};
						if (tools.findItem(this.__destinations, function(item) {
							return (item.destination === destination);
						}) === null) {
							let destinations = this.__destinations;
							if (!destinations) {
								this.__destinations = destinations = [];
							};

							const state = {
								endDestination: types.get(options, 'end', true) && (tools.indexOf([io.stdout, io.stderr, process.stdout, process.stderr], destination) < 0),
								destination: destination,
								errorCb: null,
								closeCb: null,
								finishCb: null,
								writeCb: null,
								unpipeCb: null,
								ok: true,
								drainCb: null,
								unpipe: function() {
									this.destination.removeListener('unpipe', this.unpipeCb);
									this.destination.removeListener('error', this.errorCb);
									this.destination.removeListener('close', this.closeCb);
									this.destination.removeListener('destroy', this.closeCb);
									if (this.drainCb) {
										this.destination.removeListener('drain', this.drainCb);
									};
								},
							};

							//const isBuffered = types._implements(this, io.BufferedStreamBase)

							//host.onData.attach(this, this.__pipeOnData, 40, [isBuffered, false]);
							host.onReady.attach(this, this.__pipeOnReady, 40);

							state.unpipeCb = doodad.Callback(this, function _unpipeCb(readable) {
								if (readable === this) {
									this.unpipe(destination);
								};
							});
							destination.on('unpipe', state.unpipeCb);

							state.errorCb = doodad.Callback(this, function _errorCb(err) {
								try {
									this.onerror(err);
								} catch(ex) {
									throw ex;
								} finally {
									this.unpipe(destination);
								};
							});
							destination.once('error', state.errorCb);

							state.closeCb = doodad.Callback(this, function _closeCb() {
								this.unpipe(destination);
							});
							destination.once('close', state.closeCb);
							destination.once('destroy', state.closeCb);

							this.__destinations.push(state);
							
							const autoListen = types.get(options, 'autoListen', true);
							if (autoListen) {
								this.resume();
							};
							
							destination.emit('pipe', this);
						};

						return destination;
					}),
					
					_read: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function _read(/*optional*/size)
					
					read: doodad.PUBLIC(function read(/*optional*/size) {
						if (size === 0) {
							return null;
						};
						if (!types.isNothing(size)) {
							throw new types.NotSupported("The 'size' argument is not supported by this stream.");
						};
						const encoding = this.getEncoding();
						const host = this[doodad.HostSymbol];
						const data = host.read({encoding: encoding});
						if (data) {
							return data;
						};
						if (this.isPaused()) {
							// Must be Async (function must return before the event)
							if (!this._readableState.ended) {
								tools.callAsync(this.onend, -1, this);
								this._readableState.ended = true;
							};
						};
						return null;
					}),
					
					resume: doodad.PUBLIC(function resume() {
						const host = this[doodad.HostSymbol];
						host.listen();
					}),
					
					setEncoding: doodad.PUBLIC(function setEncoding(encoding) {
						const host = this[doodad.HostSymbol];
						if (host._implements(ioMixIns.TextTransformable)) {
							host.setOptions({encoding: encoding});
						} else {
							this.__encoding = encoding;
						};
						return this;
					}),
					
					unpipe: doodad.PUBLIC(function unpipe(/*optional*/destination) {
						const host = this[doodad.HostSymbol];
						if (types._implements(destination, ioInterfaces.IStream)) {
							return host.unpipe(destination);
						};
						let items = null;
						if (types.isNothing(destination)) {
							// TODO: host.unpipe();
							items = this.__destinations;
						} else {
							const item = types.popItem(this.__destinations, function(itm) {
								return itm.destination === destination;
							});
							if (item) {
								items = [item];
							};
						};
						this.pause();
						if (items) {
							let itm;
							while (itm = items.pop()) {
								itm.unpipe();
								let dest = itm.destination;
								if (types._implements(dest, nodejsIOInterfaces.IWritable)) {
									dest = dest.getInterface(nodejsIOInterfaces.IWritable);
								};
								dest.emit('unpipe', this);
							};
						};
						if (!this.__destinations || !this.__destinations.length) {
							host.onReady.detach(this, this.__pipeOnReady);
						};
					}),
					
					push: doodad.PUBLIC(function push(chunk, /*optional*/encoding) {
						const host = this[doodad.HostSymbol];
						const data = host.transform(chunk);
						host.push(data, {encoding: encoding});
						return (host.getCount() < host.options.bufferSize);
					}),
					
					unshift: doodad.PUBLIC(function unshift(chunk) {
						const host = this[doodad.HostSymbol];
						const data = host.transform(chunk);
						host.push(data, {next: true});
						return (host.getCount() < host.options.bufferSize);
					}),
					
					wrap: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function wrap(stream)
				}))));
				

				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IStream.$extend(
				{
					$TYPE_NAME: 'IWritable',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('IWritableIsolatedMixInNodeJs')), true) */,
					
					ondrain: doodad.RAW_EVENT(),
					onfinish: doodad.RAW_EVENT(),
					onpipe: doodad.RAW_EVENT(), // function(source)
					onunpipe: doodad.RAW_EVENT(), // function(source)

					cork: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function()
					uncork: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function()
					
					__defaultEncoding: doodad.PROTECTED(null),

					writable: doodad.PUBLIC(true),
					_writableState: doodad.PUBLIC({
						needDrain: false,
					}),

					getDefaultEncoding: doodad.PUBLIC(function getDefaultEncoding() {
						const host = this[doodad.HostSymbol];
						if (host._implements(ioMixIns.TextTransformable)) {
							return host.options.encoding;
						} else {
							return this.__defaultEncoding;
						};
					}),

					setDefaultEncoding: doodad.PUBLIC(function setDefaultEncoding(encoding) {
						const host = this[doodad.HostSymbol];
						if (host._implements(ioMixIns.TextTransformable)) {
							host.setOptions({encoding: encoding});
						} else {
							this.__defaultEncoding = encoding;
						};
						return this;
					}),
					
					write: doodad.PUBLIC(function write(chunk, /*optional*/encoding, /*optional*/callback) {
						if (types.isFunction(encoding)) {
							callback = encoding;
							encoding = undefined;
						};
						
						const host = this[doodad.HostSymbol];

						if (types.isNothing(encoding)) {
							encoding = this.getDefaultEncoding();
						};
						
						const state = {ok: false};

						const options = {
							callback: doodad.AsyncCallback(this, function(err) {
								if (err) {
									if (callback) {
										callback(err);
									} else if (err) {
										this.onerror(err);
									};
								} else {
									callback && callback(null);
									if (!state.ok && host.canWrite()) {
										//this._writableState.needDrain = false;
										//this.writable = true;
										this.ondrain();
									};
								};
							}),
							encoding: encoding,
						};
						
						host.write(chunk, options);
						
						state.ok = host.canWrite();

						//this._writableState.needDrain = !state.ok;
						//this.writable = state.ok;

						return state.ok;
					}),
					
					end: doodad.PUBLIC(function end(/*optional*/chunk, /*optional*/encoding, /*optional*/callback) {
						if (types.isFunction(chunk)) {
							encoding = chunk;
							chunk = undefined;
						};

						if (types.isFunction(encoding)) {
							callback = encoding;
							encoding = undefined;
						};

						if (callback) {
							callback = doodad.Callback(null, callback);
						};

						const host = this[doodad.HostSymbol];

						host.write(chunk, {end: true, encoding: encoding, callback: doodad.Callback(this, function(err) {
							if (err) {
								if (callback) {
									callback(err);
								} else {
									this.onerror(err);
								};
							} else {
								callback && callback(null);
								this.onfinish();
							};
						})});
					}),
				}))));
				

				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IReadable.$extend(
									nodejsIOInterfaces.IWritable,
				{
					$TYPE_NAME: 'IDuplex',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('IDuplexIsolatedMixInNodeJs')), true) */,
				}))));


				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IDuplex.$extend(
				{
					$TYPE_NAME: 'ITransform',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ITransformIsolatedMixInNodeJs')), true) */,
					
					// ????
				}))));
				
				
				//===================================
				// Init
				//===================================
				//return function init(/*optional*/options) {
				//};
			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()