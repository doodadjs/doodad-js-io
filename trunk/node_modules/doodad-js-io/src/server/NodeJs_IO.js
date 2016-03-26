//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n")
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
	if (typeof process === 'object') {
		module.exports = exports;
	};
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.NodeJs.IO'] = {
			type: null,
			//! INSERT("version:'" + VERSION('doodad-js-io') + "',")
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
					nodejsIOInterfaces = nodejsIO.Interfaces,
					
					nodeStream = require('stream'),
					nodeFs = require('fs'),
					nodeStringDecoder = require('string_decoder').StringDecoder,
					nodeCluster = require('cluster');
				
				
				//===================================
				// IO Streams
				//===================================
				
				nodejsIOMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextTransformable.$extend(
											ioMixIns.Stream,
											mixIns.Creatable,
				{
					$TYPE_NAME: 'TextTransformable',
					
					__transformEncoding: doodad.PROTECTED(  null  ),
					__transformDecoder: doodad.PROTECTED(  null  ),
					
					create: doodad.OVERRIDE(function create(/*paramarray*/) {
						this._super.apply(this, arguments);
						
						types.getDefault(this.options, 'encoding', 'utf-8');
					}),
					
					transform: doodad.REPLACE(function transform(data, /*optional*/options) {
						let encoding = types.get(options, 'encoding', this.options.encoding);
						let startingText = '';
						if (encoding && (this.__transformEncoding !== encoding)) {
							if (this.__transformDecoder) {
								startingText = this.__transformDecoder.end();
								this.__transformDecoder = null;
							};
							this.__transformDecoder = new nodeStringDecoder(encoding);
							this.__transformEncoding = encoding;
						};
						data.text = startingText;
						if (data.raw === io.EOF) {
							if (this.__transformDecoder) {
								data.text += this.__transformDecoder.end();
								this.__transformDecoder = null;
							};
						} else {
							if (this.__transformDecoder && (types.isTypedArray(data.raw) || types.isBuffer(data.raw))) {
								data.text += this.__transformDecoder.write(data.raw);
							} else {
								data.text += String(data.raw);
							};
						};
						data.valueOf = function valueOf() {
							if (this.raw === io.EOF) {
								return this.raw;
							} else {
								return this.text;
							};
						};
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this._super();
						
						this.__transformDecoder = null;
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.__transformDecoder = null;
					}),
				})));
				

				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsInterfaces.IEmitter.$extend(
				{
					$TYPE_NAME: 'IReadable',
					
					onclose: doodad.RAW_EVENT(),
					ondata: doodad.RAW_EVENT(),
					onend: doodad.RAW_EVENT(),
					onerror: doodad.RAW_EVENT(),
					onreadable: doodad.RAW_EVENT(),
					
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
							this.__host.stream.pause();
						} else {
							this.__defaultPaused = true;
						};
					}),
					
					pipe: doodad.PUBLIC(function pipe(destination, /*optional*/options) {
						if (tools.findItem(this.__destinations, function(item) {
							return (item.destination === destination);
						}) === null) {
							const endDestination = types.get(options, 'end', true) && 
									(tools.indexOf([io.stdout, io.stderr, process.stdout, process.stderr], destination) < 0); // end the writer when the reader ends
									
							const endCb = new doodad.Callback(this, function() {
								if (endDestination) {
									destination.end();
								};
								this.unpipe(destination);
							});
							//this.once('finish', endCb);
							this.once('end', endCb);
							this.once('close', endCb);
							
							const readableCb = new doodad.Callback(this, function() {
                                if (!this.__host.isDestroyed()) {
                                    const data = this.read();
                                    if (data && (data.raw !== io.EOF)) {
                                        destination.write(data.valueOf(), this.__defaultEncoding, readableCb);
                                    };
                                };
							});
							this.on('readable', readableCb);

							const errorCb = new doodad.Callback(this, function(err) {
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
					
					read: doodad.PUBLIC(function read(/*optional*/size) {
						return this.__host.read({
							// TODO: size: size,
						});
					}),
					
					resume: doodad.PUBLIC(function resume() {
						if (types._implements(this.__host, nodejsIO.BinaryInputStream)) {
							this.__host.stream.resume();
						} else {
							this.__defaultPaused = false;
						};
					}),
					
					setEncoding: doodad.PUBLIC(function setEncoding(encoding) {
						if (this.__host._implements(nodejsIOMixIns.TextTransformable)) {
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
					
					unshift: doodad.PUBLIC(function unshift(chunk) {
						if (types._implements(this.__host, nodejsIO.BinaryInputStream)) {
							return this.__host.stream.unshift(chunk);
						} else {
							// TODO:
							throw new types.NotSupported("'unshift' is not supported by this stream.");
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
				
				nodejsIO.REGISTER(io.InputStream.$extend(
										mixIns.NodeEvents,
										nodejsIOInterfaces.IReadable,
				{
					$TYPE_NAME: 'BinaryInputStream',
					
					stream: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					__buffer: doodad.PROTECTED(null),
					__listening: doodad.PROTECTED(false),

					streamOnReadable: doodad.NODE_EVENT('readable', function streamOnReadable(context) {
						if (this.stream.isPaused()) {
							const readable = this.getInterface(nodejsIOInterfaces.IReadable);
							readable.emit('readable');
						};
					}),
					
					streamOnData: doodad.NODE_EVENT('data', function streamOnData(context, chunk) {
						try {
							if (this.stream.isPaused()) {
								return;
							};
							let data = {
								raw: chunk,
							};
							data = this.transform(data) || data;
							const ev = new doodad.Event(data);
							this.onReady(ev);
							if (!ev.prevent) {
								const readable = this.getInterface(nodejsIOInterfaces.IReadable);
								const cancel = readable.emit('data', data.valueOf());
								if (!cancel) {
									const buffer = this.__buffer;
									if (buffer.length < this.options.bufferSize) {
										buffer.push(data);
										readable.emit('readable');
									} else {
										throw new types.BufferOverflow();
									};
								};
							};
						} catch(ex) {
							if (ex instanceof types.ScriptAbortedError) {
								throw ex;
							};
							if (root.DD_ASSERT) {
								debugger;
							};
							this.onError(new doodad.ErrorEvent(ex));
							this.getInterface(nodejsIOInterfaces.IReadable).emit('error', ex);
						};
					}),
					
					streamOnEnd: doodad.NODE_EVENT('end', function streamOnEnd(context) {
						try {
							let data = {
								raw: io.EOF,
							};
							data = this.transform(data) || data;
							const ev = new doodad.Event(data);
							this.onReady(ev);
							if (!ev.prevent) {
								const readable = this.getInterface(nodejsIOInterfaces.IReadable);
								const cancel = readable.emit('end');
								if (!cancel) {
									const buffer = this.__buffer;
									if (buffer.length < this.options.bufferSize) {
										buffer.push(data);
										readable.emit('readable');
									} else {
										throw new types.BufferOverflow();
									};
								};
							};
						} catch(ex) {
							if (ex instanceof types.ScriptAbortedError) {
								throw ex;
							};
							if (root.DD_ASSERT) {
								debugger;
							};
							this.onError(new doodad.ErrorEvent(ex));
							this.getInterface(nodejsIOInterfaces.IReadable).emit('error', ex);
						};
					}),

					streamOnClose: doodad.NODE_EVENT('close', function streamOnClose(context) {
						try {
							this.stopListening();
							const readable = this.getInterface(nodejsIOInterfaces.IReadable);
							readable.emit('close');
						} catch(ex) {
							if (ex instanceof types.ScriptAbortedError) {
								throw ex;
							};
							if (root.DD_ASSERT) {
								debugger;
							};
							this.onError(new doodad.ErrorEvent(ex));
							const readable = this.getInterface(nodejsIOInterfaces.IReadable);
							readable.emit('error', ex);
						};
					}),
					
					streamOnError: doodad.NODE_EVENT('error', function streamOnError(context, ex) {
						this.onError(new doodad.ErrorEvent(ex));
						this.getInterface(nodejsIOInterfaces.IReadable).emit('error', ex);
					}),
					
					
					create: doodad.OVERRIDE(function create(stream, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types._instanceof(stream, [nodeStream.Readable, nodeStream.Duplex]), "Invalid node.js stream object.");
							
						this._super(options);
						
						types.setAttribute(this, 'stream', stream);
						
						this.__buffer = [];
					}),
					
					destroy: doodad.OVERRIDE(function destroy() {
						this.stopListening();
						
						this._super();
					}),
					
					
					reset: doodad.OVERRIDE(function reset() {
						this.__buffer = [];
						
						this._super();
					}),
					clear: doodad.OVERRIDE(function clear() {
						this.__buffer = [];
						
						this._super();
					}),
					read: doodad.OVERRIDE(function read(/*optional*/options) {
						if (!options) {
							options = {};
						};
						const stream = this.stream,
							buffer = this.__buffer,
							count = types.get(options, 'count');
						if (stream.isPaused()) {
							// NOTE: According to the doc, Node.js Stream object should be in 'pause' mode before calling 'read'
							// NOTE: When not in pause mode, event "data" is raised 
							const size = types.get(options, 'size', undefined);
							let raw = null;
							if (types.isNothing(size)) {
								raw = stream.read();
							} else {
								raw = stream.read(size);
							};
							let data = {
								raw: raw,
							};
							data = this.transform(data, options) || data;
							const ev = new doodad.Event(data);
							this.onReady(ev);
							if (!ev.prevent) {
								if (buffer.length < this.options.bufferSize) {
									buffer.push(data);
								} else {
									throw new types.BufferOverflow();
								};
							};
						};
						if (types.isNothing(count)) {
							return buffer.shift();
						} else {
							return buffer.splice(0, count);
						};
					}),
					
					getCount: doodad.OVERRIDE(function getCount(/*optional*/options) {
						return this.__buffer.length;
					}),
					
					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						if (!this.__listening) {
							this.__listening = true;
							
							const stream = this.stream;
							
							this.streamOnReadable.attach(stream);
							this.streamOnData.attach(stream);
							this.streamOnEnd.attach(stream);
							this.streamOnClose.attach(stream);
							this.streamOnError.attach(stream);
							
							stream.resume();
						};
					}),
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							
							this.streamOnReadable.clear();
							this.streamOnData.clear();
							this.streamOnEnd.clear();
							this.streamOnClose.clear();
							this.streamOnError.clear();
							
							this.stream.pause();
						};
						
						this.clear();
					}),
				}));
				
				
				nodejsIO.REGISTER(nodejsIO.BinaryInputStream.$extend(
									ioMixIns.TextInput,
									nodejsIOMixIns.TextTransformable,
				{
					$TYPE_NAME: 'TextInputStream',
				}));
				
				
				nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsInterfaces.IEmitter.$extend(
				{
					$TYPE_NAME: 'IWritable',
					
					onclose: doodad.RAW_EVENT(),
					ondrain: doodad.RAW_EVENT(),
					onerror: doodad.RAW_EVENT(),
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
						
						this.__host.write(chunk, {
							callback: callback,
							encoding: encoding,
						});
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

						const flushCb = new doodad.Callback(this, function flushCb() {
							if (callback) {
								callback();
							};
							this.emit('finish');
						});

						const writeEOFCb = new doodad.Callback(this, function writeEOFCb() {
							this.__host.flush({
								callback: flushCb,
							});
						});
						
						if (types.isNothing(chunk)) {
							this.__host.write(io.EOF, {
								callback: writeEOFCb,
							});
						} else {
							const writeChunkCb = new doodad.Callback(this, function writeChunkCb() {
								this.__host.write(io.EOF, {
									callback: writeEOFCb,
								});
							});
							this.write(chunk, encoding, writeChunkCb);
						};
					}),
				}))));
				
				nodejsIO.REGISTER(io.OutputStream.$extend(
									mixIns.NodeEvents,
									nodejsIOInterfaces.IWritable,
				{
					$TYPE_NAME: 'BinaryOutputStream',
					
					stream: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					__buffer: doodad.PROTECTED(null),
					
					streamOnFinish: doodad.NODE_EVENT('finish', function streamOnFinish(context) {
						const writable = this.getInterface(nodejsIOInterfaces.IWritable);
						writable.emit('finish');
					}),
					
					streamOnError: doodad.NODE_EVENT('error', function streamOnError(context, ex) {
						this.onError(new doodad.ErrorEvent(ex));
						this.getInterface(nodejsIOInterfaces.IWritable).emit('error', ex);
					}),
					
					streamOnDrain: doodad.NODE_EVENT('drain', function streamOnDrain(context, ex) {
						context.data.callback();
					}),
					
					
					create: doodad.OVERRIDE(function create(stream, /*optional*/options) {
						// FIXME: Figure out the object model of NodeJS to make the assertion because it fails with an http.ServerResponse object
						//root.DD_ASSERT && root.DD_ASSERT(types._instanceof(stream, [nodeStream.Writable, nodeStream.Duplex, nodeStream.Transform]), "Invalid node.js stream object.");
						
						this._super(options);

						this.streamOnFinish.attach(stream);
						this.streamOnError.attach(stream);
						
						types.setAttribute(this, 'stream', stream);
						
						this.__buffer = [];
					}),
					
					destroy: doodad.OVERRIDE(function destroy() {
						this.streamOnFinish.clear();
						this.streamOnError.clear();
						this.streamOnDrain.clear();
						
						this._super();
					}),
					
					__streamWrite: doodad.PROTECTED(function streamWrite(data, /*optional*/options) {
						const callback = types.get(options, 'callback');

						let ok = true;
						
						if (data.raw === io.EOF) {
							this.stream.end(callback);
						} else {
							if (callback) {
								ok = this.stream.write(data.valueOf(), function() {
									if (ok) {
										callback();
									};
								});
								if (!ok) {
									// <PRB> "possible EventEmitter memory leak detected"
									//this.stream.once('drain', callback);
									this.streamOnDrain.attachOnce(this.stream, {
										callback: callback,
									});
								};
							} else {
								ok = this.stream.write(data.valueOf());
								if (!ok) {
									throw new types.BufferOverflow();
								};
							};
						};
						
						return ok;
					}),
					
					write: doodad.OVERRIDE(function write(raw, /*optional*/options) {
						let data = {
							raw : raw,
						};
						data = this.transform(data, options) || data;

						this.onWrite(new doodad.Event(data));
						
						const buffer = this.__buffer,
							bufferSize = this.options.bufferSize,
							callback = types.get(options, 'callback');
						
						if (this.options.autoFlush) {
							buffer.push(data);
							if ((data.raw === io.EOF) || (buffer.length >= bufferSize)) {
								this.flush(types.extend({}, options, {
									callback: callback,
								}));
							} else {
								if (callback) {
									callback();
								};
							};
						} else if (buffer.length < bufferSize) {
							buffer.push(data);
							if (callback) {
								callback();
							};
						} else {
							throw new types.BufferOverflow();
						};
					}),
					
					flush: doodad.OVERRIDE(function _flush(/*optional*/options) {
						const buffer = this.__buffer,
							stream = this.stream,
							callback = types.get(options, 'callback');
							
						const flush = new doodad.Callback(this, function flushInternal() {
							let ok = true,
								data;
							while (ok && (data = buffer.shift())) {
								ok = this.__streamWrite(data, types.extend({}, data.options, {
										callback: function() {
											if (!ok) {
												flush();
											};
										},
									}));
							};
							if (ok && !buffer.length) {
								this.onFlush(new doodad.Event({
									options: options,
								}));
								if (callback) {
									callback();
								};
							};
						});
						
						flush();
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this.__buffer = [];
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this.__buffer = [];
					}),
				}));
				
				
				nodejsIO.REGISTER(nodejsIO.BinaryOutputStream.$extend(
									ioMixIns.TextOutput,
									nodejsIOMixIns.TextTransformable,
				{
					$TYPE_NAME: 'TextOutputStream',

					__streamWrite: doodad.REPLACE(function streamWrite(data, /*optional*/options) {
						const callback = types.get(options, 'callback');

						let ok = true;
						
						if (data.raw === io.EOF) {
							this.stream.end(callback);
						} else {
							if (callback) {
								ok = this.stream.write(data.valueOf(), this.options.encoding, function() {
									if (ok) {
										callback();
									};
								});
								if (!ok) {
									// <PRB> "possible EventEmitter memory leak detected"
									//this.stream.once('drain', callback);
									this.streamOnDrain.attachOnce(this.stream, {
										callback: callback,
									});
								};
							} else {
								ok = this.stream.write(data.valueOf(), this.options.encoding);
								if (!ok) {
									throw new types.BufferOverflow();
								};
							};
						};
						
						return ok;
					}),
				}));
				
				
				nodejsIO.REGISTER(nodejsIO.TextOutputStream.$extend(
									ioMixIns.HtmlOutput,
				{
					$TYPE_NAME: 'HtmlOutputStream',
				}));

				
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

				
				files.openFile = function openFile(path, /*optional*/options) {
					path = files.getOptions().hooks.urlParser(path, options.parseOptions);
					
					root.DD_ASSERT && root.DD_ASSERT((path instanceof files.Path) || ((path instanceof files.Url) && (path.protocol === 'file')), "Invalid path.")
					
					if (path instanceof files.Url) {
						path = files.Path.parse(path);
					};
					
					path = path.toString();
					
					const encoding = types.get(options, 'encoding'),
						Promise = types.getPromise();
						
					return new Promise(function(resolve, reject) {
						try {
							const nodeStream = nodeFs.createReadStream(path, {autoClose: true});
							if (encoding) {
								resolve(new nodejsIO.TextInputStream(nodeStream, {encoding: encoding}));
							} else {
								resolve(new nodejsIO.BinaryInputStream(nodeStream));
							};
						} catch(ex) {
							reject(ex);
						};
					});
				};
				
				
				return function init(/*optional*/options) {
					// NOTE: Every "std" must be a stream.
					// <PRB> Since Node version 5.6.0 or 5.7.0, children of a cluster are taking control of 'stdin'.
					if (nodeCluster.isMaster) {
						io.setStds({
							stdin: new nodejsIO.TextInputStream(process.stdin, {autoFlush: true, bufferSize: 1}),
						});
					};
					const stdout = new nodejsIO.TextOutputStream(process.stdout, {autoFlush: true, bufferSize: 1});
					io.setStds({
						stdout: stdout,
						stderr: ((process.stderr === process.stdout) ? stdout : new nodejsIO.TextOutputStream(process.stderr, {autoFlush: true, bufferSize: 1})),
					});
				};
			},
		};
		
		return DD_MODULES;
	};
	
	if (typeof process !== 'object') {
		// <PRB> export/import are not yet supported in browsers
		global.DD_MODULES = exports.add(global.DD_MODULES);
	};
}).call((typeof global !== 'undefined') ? global : ((typeof window !== 'undefined') ? window : this));