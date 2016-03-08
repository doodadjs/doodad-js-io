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
			version: '0.4.0d',
			namespaces: ['MixIns'],
			dependencies: [
				'Doodad.Types', 
				'Doodad.Tools', 
				'Doodad.Tools.Files', 
				{
					name: 'Doodad',
					version: '2.0.0',
				}, 
				'Doodad.NodeJs', 
				{
					name: 'Doodad.IO',
					version: '0.4.0',
				}, 
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
					nodejsIO = nodejs.IO,
					nodejsIOMixIns = nodejsIO.MixIns,
					
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
					
					__transformDecoder: doodad.PROTECTED(  null  ),
					
					create: doodad.OVERRIDE(function create(/*paramarray*/) {
						this._super.apply(this, arguments);
						
						types.getDefault(this.options, 'encoding', 'utf8');
					}),
					
					transform: doodad.REPLACE(function transform(data) {
						if (!this.__transformDecoder) {
							this.__transformDecoder = new nodeStringDecoder(this.options.encoding);
						};
						if (data.raw === io.EOF) {
							data.text = this.__transformDecoder.end();
							this.__transformDecoder = null;
						} else if (data.raw instanceof Buffer) {
							data.text = this.__transformDecoder.write(data.raw);
						} else {
							data.text = String(data.raw);
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
				

				nodejsIO.REGISTER(io.InputStream.$extend(
										mixIns.NodeEvents,
				{
					$TYPE_NAME: 'BinaryInputStream',
					
					stream: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					__buffer: doodad.PROTECTED(null),
					__listening: doodad.PROTECTED(false),

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
								const buffer = this.__buffer;
								if (buffer.length < this.options.bufferSize) {
									buffer.push(data.valueOf());
								} else {
									throw new types.BufferOverflow();
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
								const buffer = this.__buffer;
								if (buffer.length < this.options.bufferSize) {
									buffer.push(data.valueOf());
								} else {
									throw new types.BufferOverflow();
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
						};
					}),

					streamOnClose: doodad.NODE_EVENT('close', function streamOnClose(context) {
						try {
							this.stopListening();
						} catch(ex) {
							if (ex instanceof types.ScriptAbortedError) {
								throw ex;
							};
							if (root.DD_ASSERT) {
								debugger;
							};
							this.onError(new doodad.ErrorEvent(ex));
						};
					}),
					
					streamOnError: doodad.NODE_EVENT('error', function streamOnError(context, ex) {
						this.onError(new doodad.ErrorEvent(ex));
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
							if (!types.isNothing(size)) {
								raw = stream.read(options.size);
							} else {
								raw = stream.read();
							};
							let data = {
								raw: raw,
							};
							data = this.transform(data) || data;
							const ev = new doodad.Event(data);
							this.onReady(ev);
							if (!ev.prevent) {
								if (buffer.length < this.options.bufferSize) {
									buffer.push(data.valueOf());
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
							this.streamOnData.attach(stream);
							this.streamOnEnd.attach(stream);
							this.streamOnClose.attach(stream);
							this.streamOnError.attach(stream);
						};
					}),
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							
							this.streamOnData.clear();
							this.streamOnEnd.clear();
							this.streamOnClose.clear();
							this.streamOnError.clear();
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
				
				
				nodejsIO.REGISTER(io.OutputStream.$extend(
									mixIns.NodeEvents,
				{
					$TYPE_NAME: 'BinaryOutputStream',
					
					stream: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					__buffer: doodad.PROTECTED(null),
					
					//streamOnClose: doodad.NODE_EVENT('close', function streamOnClose(context) {
					//	const ev = new doodad.Event({
					//		raw: io.EOF,
					//	});
					//	this.onWrite(ev);
					//}),
					
					streamOnError: doodad.NODE_EVENT('error', function streamOnError(context, ex) {
						this.onError(new doodad.ErrorEvent(ex));
					}),
					
					streamOnDrain: doodad.NODE_EVENT('drain', function streamOnDrain(context, ex) {
						context.data.callback();
					}),
					
					
					create: doodad.OVERRIDE(function create(stream, /*optional*/options) {
						// FIXME: Figure out the object model of NodeJS to make the assertion because it fails with an http.ServerResponse object
						//root.DD_ASSERT && root.DD_ASSERT(types._instanceof(stream, [nodeStream.Writable, nodeStream.Duplex, nodeStream.Transform]), "Invalid node.js stream object.");
						
						this._super(options);

						//this.streamOnClose.attach(stream);
						this.streamOnError.attach(stream);
						
						types.setAttribute(this, 'stream', stream);
						
						this.__buffer = [];
					}),
					
					destroy: doodad.OVERRIDE(function destroy() {
						//this.streamOnClose.clear();
						this.streamOnError.clear();
						this.streamOnDrain.clear();
						
						this._super();
					}),
					
					__streamWrite: doodad.PROTECTED(function streamWrite(value, /*optional*/options) {
						const callback = types.get(options, 'callback');

						let ok = true;
						
						if (value === io.EOF) {
							this.stream.end(callback);
						} else {
							if (callback) {
								ok = this.stream.write(value, function() {
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
								ok = this.stream.write(value);
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
						data = this.transform(data) || data;

						this.onWrite(new doodad.Event(data));
						
						const buffer = this.__buffer,
							bufferSize = this.options.bufferSize,
							callback = types.get(options, 'callback');
						
						if (this.options.autoFlush) {
							buffer.push(data);
							if ((data.valueOf() === io.EOF) || (buffer.length >= bufferSize)) {
								this.flush(types.extend({}, options, {
									callback: function() {
										if (callback) {
											callback();
										};
									},
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
								ok = this.__streamWrite(data.valueOf(), types.extend({}, data.options, {
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

					__streamWrite: doodad.REPLACE(function streamWrite(value, /*optional*/options) {
						const callback = types.get(options, 'callback');

						let ok = true;
						
						if (value === io.EOF) {
							this.stream.end(callback);
						} else {
							if (callback) {
								ok = this.stream.write(value, this.options.encoding, function() {
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
								ok = this.stream.write(value, this.options.encoding);
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
					const stdout = new nodejsIO.TextOutputStream(process.stdout, {autoFlush: true, bufferSize: 1});
					// <PRB> Since Node version 5.6.0 or 5.7.0, children of a cluster are taking control of 'stdin'.
					if (nodeCluster.isMaster) {
						io.setStds({
							stdin: new nodejsIO.TextInputStream(process.stdin, {autoFlush: true, bufferSize: 1}),
						});
					};
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