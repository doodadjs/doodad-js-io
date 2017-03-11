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
						if (types.isInitialized(obj)) {
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

						if (emitted) {
							err.trapped = true;
						};

						//if (types.isInitialized(host)) {
							if (types.isEntrant(host, 'onError') && (host.onError.getCount() > 0)) {
								const ev = new doodad.ErrorEvent(err);

								_shared.invoke(host, 'onError', [ev], _shared.SECRET);

								if (ev.error.trapped) {
									emitted = true;
								};
							};
						//};

						return !!emitted;
					}),

					destroy: doodad.PUBLIC(doodad.CAN_BE_DESTROYED(function destroy() {
						// IMPORTANT: Never access to "host" from this function.

						if (!this.destroyed) {
							this.emit('close');

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

					__pipeOnReady: doodad.PROTECTED(function __pipeOnReady(ev) {
						const destinations = this.__destinations;
						const host = this[doodad.HostSymbol];

						const data = ev.data;

						ev.preventDefault();

						const eof = (data.raw === io.EOF);

						if (destinations.length) {
							data.delayed = true;	// Will be consumed later

							const createWriteCb = function _createWriteCb(state) {
								return doodad.AsyncCallback(this, function _writeCb(err) { // async
									this.__pipeWriting--;
									if (err) {
										state.ok = false;
										this.emit('error', err);
									} else if (state.ok) {
										if (this.__pipeWriting <= 0) {
											this.__pipeWriting = 0;

											//if (types.isInitialized(host)) {
												host.__consumeData(data);
											//};

											if (eof) {
												if (!this._readableState.ended) {
													this.emit('end');
													this._readableState.ended = true;
												};
											};
										};
									};
								}, function errorHandler(err) {
									this.emit('error', err);
								});
							};

							let encoding = null;
							if (this._implements(ioMixIns.TextTransformable)) {
								encoding = this.options.encoding;
							} else {
								encoding = this.__encoding;
							};

							const value = data.valueOf();

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
									} else if (types.isNothing(value)) {
										createWriteCb.call(this, state)();
									};
								}, this);
							};

							if (!types.isNothing(value)) {
								const globalState = {drainCount: 0};
								tools.forEach(destinations, function forEachDestination(state) {
									if (!eof || !state.endDestination) {
										this.__pipeWriting++;
										state.ok = state.destination.write(value, encoding, createWriteCb.call(this, state));
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
													drainFn();
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

					isPaused: doodad.PUBLIC(function isPaused() {
						const host = this[doodad.HostSymbol];
						return host.isListening();
					}),
					
					pause: doodad.PUBLIC(function pause() {
						const host = this[doodad.HostSymbol];
						host.stopListening();
					}),
					
					pipe: doodad.PUBLIC(function pipe(destination, /*optional*/options) {
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

							const host = this[doodad.HostSymbol];
							
							host.onReady.attach(this, this.__pipeOnReady);

							state.unpipeCb = doodad.Callback(this, function _unpipeCb(readable) {
								if (readable === this) {
									this.unpipe(destination);
								};
							});
							destination.on('unpipe', state.unpipeCb);

							state.errorCb = doodad.Callback(this, function _errorCb(err) {
								try {
									this.emit('error', err);
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
						const host = this[doodad.HostSymbol];
						const data = host.read();
						if (data) {
							const value = data.valueOf();
							if (!types.isNothing(value)) {
								return value;
							};
						};
						if (this.isPaused()) {
							// Must be Async (function must return before the event)
							if (!this._readableState.ended) {
								tools.callAsync(this.emit, -1, this, ['end'], null, _shared.SECRET);
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
							host.options.encoding = encoding;
						} else {
							this.__encoding = encoding;
						};
					}),
					
					unpipe: doodad.PUBLIC(function unpipe(/*optional*/destination) {
						let items = null;
						if (types.isNothing(destination)) {
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
							const host = this[doodad.HostSymbol];
							host.onReady.detach(this, this.__pipeOnReady);
						};
					}),
					
					push: doodad.PUBLIC(function push(chunk, /*optional*/encoding) {
						const host = this[doodad.HostSymbol];
						const data = host.transform({raw: chunk});
						host.push(data, {encoding: encoding});
						return (host.getCount() < host.options.bufferSize);
					}),
					
					unshift: doodad.PUBLIC(function unshift(chunk) {
						const host = this[doodad.HostSymbol];
						const data = host.transform({raw: chunk});
						host.push(data, {next: true});
						return (host.getCount() < host.options.bufferSize);
					}),
					
					wrap: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function wrap(stream)
				}))));
				

				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IStream.$extend(
				{
					$TYPE_NAME: 'IWritable',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('IWritableIsolatedMixInNodeJs')), true) */,
					
					__defaultEncoding: doodad.PROTECTED(null),

					ondrain: doodad.RAW_EVENT(),
					onfinish: doodad.RAW_EVENT(),
					onpipe: doodad.RAW_EVENT(), // function(source)
					onunpipe: doodad.RAW_EVENT(), // function(source)

					cork: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function()
					uncork: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function()
					
					writable: doodad.PUBLIC(true),
					_writableState: doodad.PUBLIC({
						needDrain: false,
					}),

					setDefaultEncoding: doodad.PUBLIC(function setDefaultEncoding(encoding) {
						this.__defaultEncoding = encoding;
					}),
					
					write: doodad.PUBLIC(function write(chunk, /*optional*/encoding, /*optional*/callback) {
						if (types.isFunction(encoding)) {
							callback = encoding;
							encoding = undefined;
						};
						
						if (types.isNothing(encoding)) {
							encoding = this.__defaultEncoding;
						};
						
						const host = this[doodad.HostSymbol];

						const state = {ok: false};

						const options = {
							callback: doodad.Callback(this, function() {
								callback && callback();
								if (!state.ok && (host.getCount() === 0)) {
									this.emit('drain');
								};
							}),
							encoding: encoding,
						};
						
						host.write(chunk, options);
						
						state.ok = host.canWrite();

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

						const writeEOFCb = doodad.Callback(this, function _writeEOFCb(err) {
							if (err) {
								if (callback) {
									callback(err);
								} else {
									this.emit('error', err);
								};
							} else { //if (types.isInitialized(host)) {
								callback && callback();
								this.emit('finish');
							};
						});
						
						if (types.isNothing(chunk)) {
							host.flush({callback: function() {
								host.write(io.EOF, {
									callback: writeEOFCb,
								});
							}});
						} else {
							const writeChunkCb = doodad.Callback(this, function _writeChunkCb(err) {
								if (err) {
									if (callback) {
										callback(err);
									} else {
										this.emit('error', err);
									};
								} else {// if (types.isInitialized(host)) {
									host.flush({callback: function() {
										host.write(io.EOF, {
											callback: writeEOFCb,
										});
									}});
								//} else if (callback) {
								//	callback(new types.NotAvailable("Object is destroyed."));
								};
							});
							host.write(chunk, {encoding: encoding, callback: writeChunkCb});
						};
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