//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// dOOdad - Object-oriented programming framework
// File: NodeJs_IO.js - Node.js IO Tools
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
			
			create: function create(root, /*optional*/_options) {
				"use strict";
				
				const doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					files = tools.Files,
					mixIns = doodad.MixIns,
					io = doodad.IO,
					ioMixIns = io.MixIns,
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
				}))));
				
				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IStream.$extend(
				{
					$TYPE_NAME: 'IReadable',
					
					ondata: doodad.RAW_EVENT(),
					onend: doodad.RAW_EVENT(),
					onreadable: doodad.RAW_EVENT(),
					onpause: doodad.RAW_EVENT(),
					onresume: doodad.RAW_EVENT(),
					
					__destinations: doodad.PROTECTED(null),
					__defaultEncoding: doodad.PROTECTED(null),
					__defaultPaused: doodad.PROTECTED(false),
					
					isPaused: doodad.PUBLIC(function isPaused() {
						if (types._implements(this.__host, nodejsIO.BinaryInputStream)) {
							return this.__host.stream.isPaused();
						} else {
							return this.__defaultPaused;
						};
					}),
					
					pause: doodad.PUBLIC(function pause() {
						if (types._implements(this.__host, nodejsIO.BinaryInputStream)) {
							const cb = new doodad.Callback(this, function() {
								this.__host.stream.removeListener('pause', cb);
								this.emit("pause");
							});
							this.__host.stream.once('pause', cb);
							this.__host.stream.pause();
						} else if (!this.__defaultPaused) {
							this.__defaultPaused = true;
							this.emit("pause");
						};
					}),
					
					pipe: doodad.PUBLIC(function pipe(destination, /*optional*/options) {
						if (tools.findItem(this.__destinations, function(item) {
							return (item.destination === destination);
						}) === null) {
							const endDestination = types.get(options, 'end', true) && 
									(tools.indexOf([io.stdout, io.stderr, process.stdout, process.stderr], destination) < 0); // end the writer when the reader ends
									
							const endCb = new doodad.Callback(this, function _endCb() {
								if (endDestination) {
									destination.end();
								};
								this.unpipe(destination);
							});
							//this.once('finish', endCb);
							this.once('end', endCb);
							this.once('close', endCb);
							
							const readableCb = new doodad.Callback(this, function _readableCb() {
								const chunk = this.read();
								if (chunk) {
									destination.write(chunk, this.__defaultEncoding, readableCb);
								};
							});
							this.on('readable', readableCb);

							const errorCb = new doodad.Callback(this, function _errorCb(err) {
								this.emit('error', err);
							});
							destination.on('error', errorCb);

							if (!this.__destinations) {
								this.__destinations = [];
							};

							const self = this;

							this.__destinations.push({
								destination: destination,
								unpipe: function() {
									destination.removeListener('error', errorCb);
									self.removeListener('end', endCb);
									self.removeListener('close', endCb);
									self.removeListener('readable', readableCb);
								},
							});
							
							if (!this.__host.isListening()) {
								this.__host.listen();
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
						if (types._implements(this.__host, nodejsIO.BinaryInputStream)) {
							return this.__host.stream._read(size);
						} else {
							throw new types.NotSupported("'_read' is not supported by this stream.");
						};
					}),
					
					read: doodad.PUBLIC(function read(/*optional*/size) {
						// TODO: "size" (in bytes)
						const data = this.__host.read({
								//size: size,
							});
						
						if (data && (data.raw !== io.EOF)) {
							return data.valueOf();
						};
					}),
					
					resume: doodad.PUBLIC(function resume() {
						if (types._implements(this.__host, nodejsIO.BinaryInputStream)) {
							const cb = new doodad.Callback(this, function() {
								this.__host.stream.removeListener('resume', cb);
								this.emit("resume");
							});
							this.__host.stream.once('resume', cb);
							this.__host.stream.resume();
						} else if (this.__defaultPaused) {
							this.__defaultPaused = false;
							this.emit("resume");
						};
					}),
					
					setEncoding: doodad.PUBLIC(function setEncoding(encoding) {
						if (this.__host._implements(ioMixIns.TextTransformable)) {
							this.__host.options.encoding = encoding;
						};
						this.__defaultEncoding = encoding;
					}),
					
					unpipe: doodad.PUBLIC(function unpipe(/*optional*/destination) {
						let items = [];
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
					}),
					
					push: doodad.PUBLIC(function push(chunk, /*optional*/encoding) {
						if (types._implements(this.__host, nodejsIO.BinaryInputStream)) {
							return this.__host.stream.push(chunk, encoding);
						} else {
							this.__host.push(chunk, {noEvents: true, encoding: encoding || this.__defaultEncoding});
							this._read();
							return true; // TODO: Return 'false' when buffer is full, before it raises an error
						};
					}),
					
					unshift: doodad.PUBLIC(function unshift(chunk) {
						if (types._implements(this.__host, nodejsIO.BinaryInputStream)) {
							return this.__host.stream.unshift(chunk);
						} else {
							return this.__host.push(chunk, {next: true, noEvents: true});
						};
					}),
					
					wrap: doodad.PUBLIC(function wrap(stream) {
						if (types._implements(this.__host, nodejsIO.BinaryInputStream)) {
							return this.__host.stream.wrap(stream);
						} else {
							throw new types.NotSupported("'wrap' is not supported by this stream.");
						};
					}),
				}))));
				

				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IStream.$extend(
				{
					$TYPE_NAME: 'IWritable',
					
					ondrain: doodad.RAW_EVENT(),
					onfinish: doodad.RAW_EVENT(),
					onpipe: doodad.RAW_EVENT(),
					onunpipe: doodad.RAW_EVENT(),
					
					__defaultEncoding: doodad.PROTECTED(null),
					
					cork: doodad.PUBLIC(function cork() {
						if (types._implements(this.__host, nodejsIO.BinaryOutputStream)) {
							this.__host.stream.cork();
						} else {
							throw new types.NotSupported("'cork' is not supported by this stream.");
						};
					}),
					
					uncork: doodad.PUBLIC(function uncork() {
						if (types._implements(this.__host, nodejsIO.BinaryOutputStream)) {
							this.__host.stream.uncork();
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
						
						this.__host.write(chunk, options);
						
						if (this.__host.options.autoFlush) {
							return true;
						};
						
						tools.callAsync(this.__host.flush, 0, this.__host);
						
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
								this.__host.flush({
									callback: flushCb,
								});
							};
						});
						
						if (types.isNothing(chunk)) {
							this.__host.write(io.EOF, {
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
									this.__host.write(io.EOF, {
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