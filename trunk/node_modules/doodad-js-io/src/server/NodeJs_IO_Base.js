//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// dOOdad - Object-oriented programming framework
// File: NodeJs_IO_Base.js - Node.js IO Base Tools
// Project home: https://sourceforge.net/projects/doodad-js/
// Trunk: svn checkout svn://svn.code.sf.net/p/doodad-js/code/trunk doodad-js-code
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

(function() {
	var global = this;

	var exports = {};
	
	//! BEGIN_REMOVE()
	if ((typeof process === 'object') && (typeof module === 'object')) {
	//! END_REMOVE()
		//! IF_DEF("serverSide")
			module.exports = exports;
		//! END_IF()
	//! BEGIN_REMOVE()
	};
	//! END_REMOVE()
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.NodeJs.IO'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE() */,
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
					
					destroy: doodad.PUBLIC(function destroy() {
						return this[doodad.HostSymbol].destroy();
					}),
				}))));
				
				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IStream.$extend(
				{
					$TYPE_NAME: 'IReadable',
					
					ondata: doodad.RAW_EVENT(),
					onpause: doodad.RAW_EVENT(),
					onresume: doodad.RAW_EVENT(),
					
					__destinations: doodad.PROTECTED(null),
					__defaultEncoding: doodad.PROTECTED(null),
					__defaultPaused: doodad.PROTECTED(false),
					
					__pipeFlush: doodad.PROTECTED(false),
					__pipeWriting: doodad.PROTECTED(0),

					onnewListener: doodad.OVERRIDE(function onnewListener(event, listener) {
						if ((event === 'readable') && !this.isPaused()) {
							this.pause();
						};
						return this._super(event, listener);
					}),

					__onFlushDataReadable: doodad.PROTECTED(function(ev) {
						if (!ev.data.options.output) {
							const data = ev.data.data;
							const destinations = this.__destinations;
							const writeCb = new doodad.Callback(this, function _writeCb() {
								this.__pipeWriting--;
								if ((data.raw === io.EOF) && (this.__pipeWriting <= 0)) {
									let callback = types.get(ev.data.options, 'callback');
									if (callback) {
										const cbObj = types.get(ev.data.options, 'callbackObj');
										delete ev.data.options.callbackObj;
										delete ev.data.options.callback;
										callback = new doodad.Callback(cbObj, callback);
										callback(); // sync
									};
								};
							});
							if (data.raw === io.EOF) {
								// End
								tools.forEach(destinations, function(state) {
									this.__pipeWriting++;
									if (state.endDestination) {
										state.destination.end("", state.encoding, writeCb);
									} else {
										state.writeCb = writeCb;
										state.finishCb();
									};
								}, this);
								if (this.__pipeWriting > 0) {
									ev.preventDefault();
								};
							} else {
								tools.forEach(destinations, function(state) {
									this.__pipeWriting++;
									const ok = state.destination.write(data.valueOf(), state.encoding, writeCb);
									if (!ok) {
										ev.data.state.ok = false;
									};
								}, this);
							};
						};
					}),

					onreadable: doodad.RAW_EVENT(function onreadable() {
						const host = this[doodad.HostSymbol];
						const destinations = this.__destinations;
						if (destinations.length) {
							// TODO: Enhance flow control
							if (this.__pipeWriting <= 0) {
								this.__pipeWriting = 0;

								host.flush({output: false});
							};

							// Cancel emit
							this.overrideSuper();
							return false;

						} else {
							return this._super();
						};
					}),

					isPaused: doodad.PUBLIC(function isPaused() {
						const host = this[doodad.HostSymbol];
						if (host._implements(nodejsIO.BinaryInputStream)) {
							return host.stream.isPaused();
						} else {
							return this.__defaultPaused;
						};
					}),
					
					pause: doodad.PUBLIC(function pause() {
						const host = this[doodad.HostSymbol];
						if (types._implements(host, nodejsIO.BinaryInputStream)) {
							const cb = new doodad.Callback(this, function() {
								host.stream.removeListener('pause', cb);
								this.emit("pause");
							});
							host.stream.once('pause', cb);
							host.stream.pause();
						} else if (!this.__defaultPaused) {
							this.__defaultPaused = true;
							this.emit("pause");
						};
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
								unpipe: function() {
									this.destination.removeListener('error', this.errorCb);
									this.destination.removeListener('finish', this.finishCb);
								},
							};

							const host = this[doodad.HostSymbol];
							
							host.onFlushData.attach(this, this.__onFlushDataReadable);

							state.encoding = this.__defaultEncoding;
							if (!state.encoding) {
								if (host._implements(ioMixIns.TextTransformable)) {
									state.encoding = host.options.encoding;
								};
							};

							state.errorCb = new doodad.Callback(this, function _errorCb(err) {
								this.emit('error', err);
							});
							destination.on('error', state.errorCb);

							state.finishCb = new doodad.Callback(this, function _finishCb() {
								this.unpipe(destination);
								this.writeCb && this.writeCb();
								if (!this.__destinations.length) {
									host.onFlushData.detach(this, this.__onFlushDataReadable);
									this.emit('end');
								};
							});
							destination.once('finish', state.finishCb);
							
							this.__destinations.push(state);
							
							if (host._implements(ioInterfaces.Listener)) {
								if (!host.isListening()) {
									host.listen();
								};
							};
							
							this.pause(); // force flow control (uses 'readable' event instead of 'data' event)
							
							if (types._implements(destination, nodejsIOInterfaces.ITransform)) {
								destination = destination.getInterface(nodejsIOInterfaces.ITransform);
							} else if (types._implements(destination, nodejsIOInterfaces.IDuplex)) {
								destination = destination.getInterface(nodejsIOInterfaces.IDuplex);
							} else if (types._implements(destination, nodejsIOInterfaces.IWritable)) {
								destination = destination.getInterface(nodejsIOInterfaces.IWritable);
							};
                            
							destination.emit('pipe', this);
						};

						return destination;
					}),
					
					_read: doodad.PUBLIC(function _read(/*optional*/size) {
						const host = this[doodad.HostSymbol];
						if (host._implements(nodejsIO.BinaryInputStream)) {
							return host.stream._read(size);
						} else {
							throw new types.NotSupported("'_read' is not supported by this stream.");
						};
					}),
					
					read: doodad.PUBLIC(function read(/*optional*/size) {
						if (!types.isNothing(size)) {
							throw new types.NotSupported("The 'size' argument is not supported by this stream.");
						};
						const host = this[doodad.HostSymbol];
						const data = host.read();
						if (data && (data.raw !== io.EOF)) {
							return data.valueOf();
						} else {
							return null;
						};
					}),
					
					resume: doodad.PUBLIC(function resume() {
						const host = this[doodad.HostSymbol];
						if (host._implements(nodejsIO.BinaryInputStream)) {
							const cb = new doodad.Callback(this, function() {
								this.emit("resume");
							});
							host.stream.once('resume', cb);
							host.stream.resume();
						} else if (this.__defaultPaused) {
							this.__defaultPaused = false;
							this.emit("resume");
						};
					}),
					
					setEncoding: doodad.PUBLIC(function setEncoding(encoding) {
						const host = this[doodad.HostSymbol];
						if (host._implements(ioMixIns.TextTransformable)) {
							host.options.encoding = encoding;
						};
						this.__defaultEncoding = encoding;
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
						let itm;
						if (items) {
							while (itm = items.pop()) {
								itm.unpipe();
								let dest = itm.destination;
								if (types._implements(dest, nodejsIOInterfaces.ITransform)) {
									dest = dest.getInterface(nodejsIOInterfaces.ITransform);
								} else if (types._implements(dest, nodejsIOInterfaces.IDuplex)) {
									dest = dest.getInterface(nodejsIOInterfaces.IDuplex);
								} else if (types._implements(dest, nodejsIOInterfaces.IWritable)) {
									dest = dest.getInterface(nodejsIOInterfaces.IWritable);
								};
								dest.emit('unpipe', this);
							};
						};
					}),
					
					push: doodad.PUBLIC(function push(chunk, /*optional*/encoding) {
						const host = this[doodad.HostSymbol];
						if (host._implements(nodejsIO.BinaryInputStream)) {
							return host.stream.push(chunk, encoding || this.__defaultEncoding);
						} else {
							host.push(chunk, {noEvents: true, encoding: encoding || this.__defaultEncoding});
							//this._read();
							return true; // TODO: Return 'false' when buffer is full, before it raises an error
						};
					}),
					
					unshift: doodad.PUBLIC(function unshift(chunk) {
						const host = this[doodad.HostSymbol];
						if (host._implements(nodejsIO.BinaryInputStream)) {
							return host.stream.unshift(chunk);
						} else {
							return host.push(chunk, {next: true, noEvents: true});
						};
					}),
					
					wrap: doodad.PUBLIC(function wrap(stream) {
						const host = this[doodad.HostSymbol];
						if (host._implements(nodejsIO.BinaryInputStream)) {
							return host.stream.wrap(stream);
						} else {
							throw new types.NotSupported("'wrap' is not supported by this stream.");
						};
					}),
				}))));
				

				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IStream.$extend(
				{
					$TYPE_NAME: 'IWritable',
					
					__defaultEncoding: doodad.PROTECTED(null),

					ondrain: doodad.RAW_EVENT(),
					onfinish: doodad.RAW_EVENT(),
					onpipe: doodad.RAW_EVENT(), // function(source)
					onunpipe: doodad.RAW_EVENT(), // function(source)

					cork: doodad.PUBLIC(function cork() {
						const host = this[doodad.HostSymbol];
						if (host._implements(nodejsIO.BinaryOutputStream)) {
							host.stream.cork();
						} else {
							throw new types.NotSupported("'cork' is not supported by this stream.");
						};
					}),
					
					uncork: doodad.PUBLIC(function uncork() {
						const host = this[doodad.HostSymbol];
						if (host._implements(nodejsIO.BinaryOutputStream)) {
							host.stream.uncork();
						} else {
							throw new types.NotSupported("'uncork' is not supported by this stream.");
						};
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

						host.write(chunk, options);
						
						if (host.options.autoFlush) {
							return true;
						};
						
						tools.callAsync(host.flush, 0, host);
						
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
									this.emit('error', err);
								};
							} else {
								this.emit('finish');
							};
						});

						const writeEOFCb = new doodad.Callback(this, function _writeEOFCb(err) {
							if (err) {
								if (callback) {
									callback(err);
								} else {
									this.emit('error', err);
								};
							} else {
								host.flush({
									callback: flushCb,
								});
							};
						});
						
						if (types.isNothing(chunk)) {
							host.write(io.EOF, {
								callback: writeEOFCb,
							});
						} else {
							const writeChunkCb = new doodad.Callback(this, function _writeChunkCb(err) {
								if (err) {
									if (callback) {
										callback(err);
									} else {
										this.emit('error', err);
									};
								} else {
									host.write(io.EOF, {
										callback: writeEOFCb,
									});
								};
							});
							this.write(chunk, encoding, writeChunkCb);
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
	};
	
	//! BEGIN_REMOVE()
	if ((typeof process !== 'object') || (typeof module !== 'object')) {
	//! END_REMOVE()
		//! IF_UNDEF("serverSide")
			// <PRB> export/import are not yet supported in browsers
			global.DD_MODULES = exports.add(global.DD_MODULES);
		//! END_IF()
	//! BEGIN_REMOVE()
	};
	//! END_REMOVE()
}).call(
	//! BEGIN_REMOVE()
	(typeof window !== 'undefined') ? window : ((typeof global !== 'undefined') ? global : this)
	//! END_REMOVE()
	//! IF_DEF("serverSide")
	//! 	INJECT("global")
	//! ELSE()
	//! 	INJECT("window")
	//! END_IF()
);