//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: NodeJs_IO_Base.js - Node.js IO Base Tools
// Project home: https://github.com/doodadjs/
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2016 Claude Petit
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
				// Interfaces (continued)
				//=====================================================
				
				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsInterfaces.IEmitter.$extend(
				{
					$TYPE_NAME: 'IStream',
					
					onclose: doodad.RAW_EVENT(),
					onerror: doodad.RAW_EVENT(),
					ondestroy: doodad.RAW_EVENT(),

					closed: doodad.PUBLIC(false),
					destroyed: doodad.PUBLIC(false),
					
					close: doodad.PUBLIC(function close() {
						if (!this.closed) {
							this.closed = true;
							tools.callAsync(this.emit, -1, this, ['close'], null, _shared.SECRET); // function must return before event
						};
					}),

					destroy: doodad.PUBLIC(function destroy() {
						if (!this.destroyed) {
							this.destroyed = true;
							this.close();
							const host = this[doodad.HostSymbol];
							host && host.destroy();
							tools.callAsync(this.emit, -1, this, ['destroy'], null, _shared.SECRET); // function must return before event
						};
					}),
				}))));
				
				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IStream.$extend(
				{
					$TYPE_NAME: 'IReadable',
					
					ondata: doodad.RAW_EVENT(),
					onpause: doodad.RAW_EVENT(),
					onresume: doodad.RAW_EVENT(),
					onend: doodad.RAW_EVENT(),
					onreadable: doodad.RAW_EVENT(),
					
					__destinations: doodad.PROTECTED(null),
					__defaultEncoding: doodad.PROTECTED(null),
					
					__pipeWriting: doodad.PROTECTED(0),

					readable: doodad.PUBLIC(true),
					_readableState: doodad.PUBLIC({
						flowing: true,
					}),

					close: doodad.OVERRIDE(function close() {
						this.readable = false;
						this._readableState = null;
						this._super();
					}),

					onnewListener: doodad.OVERRIDE(function onnewListener(event, listener) {
						if ((event === 'readable') && !this.isPaused()) {
							this.pause();
						};
						return this._super(event, listener);
					}),

					__pipeOnReady: doodad.PROTECTED(function __pipeOnReady(ev) {
						const data = ev.data;
						const destinations = this.__destinations;
						const host = this[doodad.HostSymbol];

						ev.preventDefault();

						const callback = types.get(ev.data.options, 'callback');
						if (callback) {
							delete ev.data.options.callback;
						};

						if (destinations.length) {
							const self = this;
							const createWriteCb = function _createWriteCb(state) {
								return new doodad.AsyncCallback(self, function _writeCb(err) { // async
									if (err) {
										state.ok = false;
										if (callback) {
											callback(err); // sync
										} else {
											_shared.invoke(host, host.onError, [new doodad.ErrorEvent(err)], _shared.SECRET);
										};
									} else if (state.ok) {
										this.__pipeWriting--;
										if (data.raw === io.EOF) {
											// <PRB> ZLIB stream: Must give time to the stream to raise its 'error' event when unexpected EOF.
											//this.unpipe(state.destination);
											tools.callAsync(this.unpipe, 0, this, [state.destination]);
											if (this.__pipeWriting <= 0) {
												this.__pipeWriting = 0;
												callback && callback(); // sync
												this.emit('end');
											};
										} else {
											if (this.__pipeWriting <= 0) {
												this.__pipeWriting = 0;
												callback && callback(); // sync
											};
										};
									};
								});
							};

							if (data.raw === io.EOF) {
								// End
								tools.forEach(destinations, function(state) {
									this.__pipeWriting++;
									state.ok = true;
									if (state.endDestination) {
										state.destination.end(null, null, createWriteCb(state)); // async
									} else {
										createWriteCb(state)(); // async
									};
								}, this);
							} else {
								tools.forEach(destinations, function(state) {
									this.__pipeWriting++;
									state.ok = state.destination.write(data.valueOf(), state.encoding, createWriteCb(state)); // async
									if (!state.ok) {
										this.pause();
										state.drainFn = createWriteCb(state); // async
									};
								}, this);
							};
						} else {
							callback(); // sync
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
								finishCb: null,
								writeCb: null,
								encoding: null,
								ok: true,
								drainCb: null,
								drainFn: null,
								unpipe: function() {
									this.destination.removeListener('error', this.errorCb);
									this.destination.removeListener('drain', this.drainCb);
								},
							};

							const host = this[doodad.HostSymbol];
							
							host.onReady.attach(this, this.__pipeOnReady);

							state.encoding = this.__defaultEncoding;
							if (!state.encoding) {
								if (host._implements(ioMixIns.TextTransformable)) {
									state.encoding = host.options.encoding;
								};
							};

							state.errorCb = new doodad.Callback(this, function _errorCb(err) {
								this.unpipe(destination);
								_shared.invoke(host, host.onError, [new doodad.ErrorEvent(err)], _shared.SECRET);
							});
							destination.once('error', state.errorCb);

							state.drainCb = new doodad.Callback(this, function _drainCb() {
								state.ok = true;
								state.drainFn && state.drainFn();
								state.drainFn = null;
								this.resume();
							});
							destination.on('drain', state.drainCb);
							
							this.__destinations.push(state);
							
							if (host._implements(ioMixIns.Listener)) {
								host.listen();
							};
							
							if (types._implements(destination, nodejsIOInterfaces.IWritable)) {
								destination = destination.getInterface(nodejsIOInterfaces.IWritable);
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
						if (data && (data.raw !== io.EOF)) {
							return data.valueOf();
						} else {
							if (this.isPaused() && (data.raw === io.EOF)) {
								// Must be Async (function must return before the event)
								tools.callAsync(this.emit, -1, this, ['end'], null, _shared.SECRET);
							};
							return null;
						};
					}),
					
					resume: doodad.PUBLIC(function resume() {
						const host = this[doodad.HostSymbol];
						host.listen();
					}),
					
					setEncoding: doodad.PUBLIC(function setEncoding(encoding) {
						const host = this[doodad.HostSymbol];
						if (host._implements(ioMixIns.TextTransformable)) {
							host.options.encoding = encoding;
						};
						this.__defaultEncoding = encoding;
					}),
					
					unpipe: doodad.PUBLIC(function unpipe(/*optional*/destination) {
						if (this.destroyed) {
							return;
						};
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
						host.push(chunk, {noEvents: true, encoding: encoding || this.__defaultEncoding});
						return true; // TODO: Return 'false' when buffer is full, before it raises an error
					}),
					
					unshift: doodad.PUBLIC(function unshift(chunk) {
						const host = this[doodad.HostSymbol];
						return host.push(chunk, {next: true, noEvents: true});
					}),
					
					wrap: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function wrap(stream)
				}))));
				

				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IStream.$extend(
				{
					$TYPE_NAME: 'IWritable',
					
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

					close: doodad.OVERRIDE(function close() {
						this.writable = false;
						this._writableState = null;
						this._super();
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
						
						var options = {
							callback: callback,
						};
						
						if (encoding) {
							options.encoding = encoding;
						};
						
						const host = this[doodad.HostSymbol];

						try {
							host.write(chunk, options);
						} catch(ex) {
							if (ex.critical) {
								throw ex;
							} else if (ex.bubble) {
								// Do nothing
							} else {
								if (callback) {
									callback = new doodad.Callback(null, callback);
									callback(ex);
								} else {
									_shared.invoke(host, host.onError, [new doodad.ErrorEvent(ex)], _shared.SECRET);
								};
								return false;
							};
						};
						
						if (host.options.autoFlush) {
							return host.canWrite();
						};
						
						tools.callAsync(function() {
							if (!this.isDestroyed()) {
								this.flush();
							};
						}, 0, host, null, null, _shared.SECRET);
						
						return false;
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
							callback = new doodad.Callback(null, callback);
						};

						const host = this[doodad.HostSymbol];

						const flushCb = new doodad.Callback(this, function _flushCb(err) {
							if (err) {
								if (callback) {
									callback(err);
								} else {
									_shared.invoke(host, host.onError, [new doodad.ErrorEvent(err)], _shared.SECRET);
								};
							} else {
								callback && callback();
								this.emit('finish');
							};
						});

						const writeEOFCb = new doodad.Callback(this, function _writeEOFCb(err) {
							if (err) {
								if (callback) {
									callback(err);
								} else {
									_shared.invoke(host, host.onError, [new doodad.ErrorEvent(err)], _shared.SECRET);
								};
							} else if (!host.isDestroyed()) {
								host.flush({
									callback: flushCb,
								});
							};
						});
						
						if (types.isNothing(chunk)) {
							try {
								host.write(io.EOF, {
									callback: writeEOFCb,
								});
							} catch(ex) {
								if (ex.bubble) {
									throw ex;
								} else if (ex instanceof types.ScriptInterruptedError) {
									// Do nothing
								} else {
									if (callback) {
										callback(ex);
									} else {
										_shared.invoke(host, host.onError, [new doodad.ErrorEvent(ex)], _shared.SECRET);
									};
								};
							};
						} else {
							const writeChunkCb = new doodad.Callback(this, function _writeChunkCb(err) {
								if (err) {
									if (callback) {
										callback(err);
									} else {
										_shared.invoke(host, host.onError, [new doodad.ErrorEvent(err)], _shared.SECRET);
									};
								} else {
									host.write(io.EOF, {
										callback: writeEOFCb,
									});
								};
							});
							try {
								this.write(chunk, encoding, writeChunkCb);
							} catch(ex) {
								if (ex.critical) {
									throw ex;
								} else if (ex.bubble) {
									// Do nothing
								} else {
									if (callback) {
										callback(ex);
									} else {
										_shared.invoke(host, host.onError, [new doodad.ErrorEvent(err)], _shared.SECRET);
									};
								};
							};
						};
					}),
				}))));
				
				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IReadable.$extend(
									nodejsIOInterfaces.IWritable,
				{
					$TYPE_NAME: 'IDuplex',
				}))));

				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IDuplex.$extend(
				{
					$TYPE_NAME: 'ITransform',
					
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