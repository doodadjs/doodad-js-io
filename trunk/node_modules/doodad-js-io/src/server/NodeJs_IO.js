//! REPLACE_BY("// Copyright 2015 Claude Petit, licensed under Apache License version 2.0\n")
// dOOdad - Class library for Javascript (BETA) with some extras (ALPHA)
// File: NodeJs_IO.js - Node.js IO Tools
// Project home: https://sourceforge.net/projects/doodad-js/
// Trunk: svn checkout svn://svn.code.sf.net/p/doodad-js/code/trunk doodad-js-code
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2015 Claude Petit
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

	global.DD_MODULES = (global.DD_MODULES || {});
	global.DD_MODULES['Doodad.NodeJs.IO'] = {
		type: null,
		version: '0a',
		namespaces: null,
		dependencies: ['Doodad.Types', 'Doodad.Tools', 'Doodad', 'Doodad.NodeJs', 'Doodad.IO'],
		
		create: function create(root, /*optional*/_options) {
			"use strict";
			
			const doodad = root.Doodad,
				types = doodad.Types,
				tools = doodad.Tools,
				files = tools.Files,
				io = doodad.IO,
				ioMixIns = io.MixIns,
				nodejs = doodad.NodeJs,
				nodejsIO = nodejs.IO,
				
				nodeStream = require('stream'),
				nodeFs = require('fs');
			
			//===================================
			// IO Streams
			//===================================
			
			nodejsIO.REGISTER(io.InputStream.$extend(
			{
				$TYPE_NAME: 'BinaryInputStream',
				
				stream: doodad.PUBLIC(doodad.READ_ONLY(null)),
				
				__buffer: doodad.PROTECTED(null),

				__parseChunk: doodad.PROTECTED(function parseChunk(chunk) {
					return {
						data: chunk,
						options: this.options,
					};
				}),
				
				__streamOnData: doodad.PROTECTED(doodad.ATTRIBUTE(function onData(chunk) {
					try {
						const buffer = this.__buffer,
							data = this.__parseChunk(chunk);
							//data = this.stream.read();
						if (data) {
							//data = this.__parseChunk(data);
							const ev = new doodad.Event(data);
							this.onReady(ev);
							if (!ev.prevent) {
								if (buffer.length < this.options.bufferSize) {
									buffer.push(data);
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
					};
				})),
				__streamOnDataListener: doodad.PROTECTED(null),

				__streamOnEnd: doodad.PROTECTED(doodad.ATTRIBUTE(function onEnd() {
					try {
						const data = this.__parseChunk(io.EOF);
						const ev = new doodad.Event(data);
						this.onReady(ev);
					} catch(ex) {
						if (ex instanceof types.ScriptAbortedError) {
							throw ex;
						};
						if (root.DD_ASSERT) {
							debugger;
						};
						this.onError(new doodad.ErrorEvent(ex));
					};
				})),
				__streamOnEndListener: doodad.PROTECTED(null),

				__streamOnClose: doodad.PROTECTED(doodad.ATTRIBUTE(function onClose() {
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
				})),
				__streamOnCloseListener: doodad.PROTECTED(null),
				
				__streamOnError: doodad.PROTECTED(doodad.ATTRIBUTE(function onError(ex) {
					this.onError(new doodad.ErrorEvent(ex));
				})),
				__streamOnErrorListener: doodad.PROTECTED(null),
				
				
				create: doodad.OVERRIDE(function create(stream, /*optional*/options) {
					root.DD_ASSERT && root.DD_ASSERT(types._instanceof(stream, [nodeStream.Readable, nodeStream.Duplex]), "Invalid node.js stream object.");
						
					this._super(options);
					
					this.setAttribute('stream', stream);
					
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
						paused = stream.isPaused();
					let data = null;
					if (paused) {
						// NOTE: According to the doc, Node.js Stream object should be in 'pause' mode before calling 'read'
						// NOTE: When not in pause mode, event "data" is raised 
						const size = types.get(options, 'size', undefined);
						if (!types.isNothing(size)) {
							data = stream.read(options.size);
						} else {
							data = stream.read();
						};
					};
					const buffer = this.__buffer;
					if (buffer.length) {
						// NOTE: According to the doc, 'read' should raise 'data' event. So "data" should be in the buffer.
						const offset = types.getDefault(options, 'offset', 0),
							count = types.getDefault(options, 'count', 1);
						if (types.get(options, 'preread', false)) {
							return buffer.slice(offset, count);
						} else {
							return buffer.splice(offset, count);
						};
					} else if (!types.isNothing(data)) {
						return [this.__parseChunk(data)];
					} else {
						return null;
					};
				}),
				getCount: doodad.OVERRIDE(function getCount(/*optional*/options) {
					return this.__buffer.length;
				}),
				listen: doodad.OVERRIDE(function listen(/*optional*/options) {
					if (!this.__streamOnDataListener) {
						this.__streamOnDataListener = new doodad.Callback(this, '__streamOnData');
						this.__streamOnEndListener = new doodad.Callback(this, '__streamOnEnd');
						this.__streamOnCloseListener = new doodad.Callback(this, '__streamOnClose');
						this.__streamOnErrorListener = new doodad.Callback(this, '__streamOnError');
						
						const stream = this.stream;
						stream.on('data', this.__streamOnDataListener);
						//stream.on('readable', this.__streamOnDataListener);
						stream.on('end', this.__streamOnEndListener);
						stream.on('close', this.__streamOnCloseListener);
						stream.on('error', this.__streamOnErrorListener);
					};
				}),
				stopListening: doodad.OVERRIDE(function stopListening() {
					if (this.__streamOnDataListener) {
						const stream = this.stream;
						stream.removeListener('data', this.__streamOnDataListener);
						stream.removeListener('end', this.__streamOnEndListener);
						stream.removeListener('close', this.__streamOnCloseListener);
						stream.removeListener('error', this.__streamOnErrorListener);
						
						this.__streamOnDataListener = null;
						this.__streamOnEndListener = null;
						this.__streamOnCloseListener = null;
						this.__streamOnErrorListener = null;
					};
					
					this.clear();
				}),
			}));
			
			nodejsIO.REGISTER(io.InputStream.$extend(
								ioMixIns.TextInput,
								nodejsIO.BinaryInputStream,
			{
				$TYPE_NAME: 'TextInputStream',
				
				__parseChunk: doodad.OVERRIDE(function parseChunk(chunk) {
					const data = this._super(chunk);
					if (data.data) {
						data.text = data.data.toString();
					} else {
						data.text = null;
					};
					return data;
				}),
				
				listen: doodad.OVERRIDE(function listen(/*optional*/options) {
					if (!this.__streamOnDataListener) {
						this.stream.setEncoding(types.get(this.options, 'encoding', 'utf8'));
					};
					this._super(options);
				}),
			}));
			
			nodejsIO.REGISTER(io.OutputStream.$extend(
			{
				$TYPE_NAME: 'BinaryOutputStream',
				
				stream: doodad.PUBLIC(doodad.READ_ONLY(null)),
				
				__buffer: doodad.PROTECTED(null),
				
				//__streamOnClose: doodad.PROTECTED(function onClose() {
				//	const ev = new doodad.Event({
				//		raw: io.EOF,
				//	});
				//	this.onWrite(ev);
				//}),
				//__streamOnCloseListener: doodad.PROTECTED(null),
				
				__streamOnError: doodad.PROTECTED(doodad.ATTRIBUTE(function onError(ex) {
					this.onError(new doodad.ErrorEvent(ex));
				})),
				__streamOnErrorListener: doodad.PROTECTED(null),
				
				
				create: doodad.OVERRIDE(function create(stream, /*optional*/options) {
					// FIXME: Figure out the object model of NodeJS to make the assertion because it fails with an http.ServerResponse object
					//root.DD_ASSERT && root.DD_ASSERT(types._instanceof(stream, [nodeStream.Writable, nodeStream.Duplex, nodeStream.Transform]), "Invalid node.js stream object.");
					
					this._super(options);

					//this.__streamOnCloseListener = new doodad.Callback(this, '__streamOnClose');
					this.__streamOnErrorListener = new doodad.Callback(this, '__streamOnError');
					
					//stream.on('close', this.__streamOnCloseListener);
					stream.on('error', this.__streamOnErrorListener);
					
					this.setAttribute('stream', stream);
					
					this.__buffer = [];
				}),
				
				destroy: doodad.OVERRIDE(function destroy() {
					const stream = this.stream;
					//stream.removeListener('close', this.__streamOnCloseListener);
					stream.removeListener('error', this.__streamOnErrorListener);
					
					this._super();
				}),
				
				write: doodad.OVERRIDE(function write(raw, /*optional*/options) {
					if (!options) {
						options = {};
					};
					const ev = new doodad.Event({
						raw: raw || '',
					});
					this.onWrite(ev);
					raw = ev.data.raw;
					const self = this,
						buffer = this.__buffer,
						stream = this.stream,
						bufferSize = this.options.bufferSize;
					const callback = types.get(options, 'callback');
					if (this.options.autoFlush) {
						if (raw === io.EOF) {
							stream.end(callback);
						} else {
							const encoding = types.get(options, 'encoding');
							if (raw.length === 0) {
								callback && callback();
							} else if (callback) {
								const ok = stream.write(raw, encoding, function() {
									if (ok) {
										callback();
									};
								});
								if (!ok) {
									stream.once('drain', callback);
								};
							} else {
								const ok = stream.write(raw, encoding);
								if (!ok) {
									throw new types.BufferOverflow();
								};
							};
						};
					} else {
						if (buffer.length < bufferSize) {
							buffer.push({
								data: raw,
								options: options,
							});
							if (callback) {
								callback();
							};
						} else {
							throw new types.BufferOverflow();
						};
					};
				}),
				flush: doodad.OVERRIDE(function flush(/*optional*/options) {
					const buffer = this.__buffer,
						stream = this.stream,
						callback = types.get(options, 'callback');
					const flush = new doodad.Callback(this, function flushInternal() {
						let ok = true,
							chunk;
						while (ok && (chunk = buffer.shift())) {
							const data = chunk.data;
								
							if (data === io.EOF) {
								stream.end();
							} else {
								const encoding = types.get(chunk.options, 'encoding');
								ok = stream.write(data, encoding, function() {
									if (ok) {
										flush();
									};
								});
								if (!ok) {
									stream.once('drain', flush);
								};
							};
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
			
			nodejsIO.REGISTER(io.OutputStream.$extend(
								ioMixIns.TextOutput,
								nodejsIO.BinaryOutputStream,
			{
				$TYPE_NAME: 'TextOutputStream',
			}));
			
			nodejsIO.REGISTER(nodejsIO.TextOutputStream.$extend(
								ioMixIns.HtmlOutput,
			{
				$TYPE_NAME: 'HtmlOutputStream',
			}));


			
			files.openFile = function openFile(path, /*optional*/options) {
				// TODO: HTTP files
				// TODO: Options
				/*
					{ flags: 'r',
					  encoding: null,
					  fd: null,
					  mode: 0o666,
					  autoClose: true,
					  start:
					  end:
					}
				*/
				path = tools.options.hooks.urlParser(path, options.parseOptions);
				root.DD_ASSERT && root.DD_ASSERT((path instanceof tools.Path) || ((path instanceof tools.Url) && (path.protocol === 'file')), "Invalid path.")
				if (path instanceof tools.Url) {
					path = tools.Path.parse(url);
				};
				path = path.toString();
				options = types.extend({
					autoClose: true,
				}, options);
				const encoding = types.get(options, 'encoding', null),
					Promise = tools.getPromise();
				return new Promise(function(resolve, reject) {
					try {
						const nodeStream = nodeFs.createReadStream(path, options);
						resolve(encoding ? new nodejsIO.TextInputStream(nodeStream, {encoding: encoding}) : new nodejsIO.BinaryInputStream(nodeStream));
					} catch(ex) {
						reject(ex);
					};
				});
			};
			
			
			return function init(/*optional*/options) {
				// NOTE: Every "std" must be a stream.
				const stdout = new nodejsIO.TextOutputStream(process.stdout, {autoFlush: true, bufferSize: 1});
				io.setStds({
					stdin: new nodejsIO.TextInputStream(process.stdin, {autoFlush: true, bufferSize: 1}),
					stdout: stdout,
					stderr: ((process.stderr === process.stdout) ? stdout : new nodejsIO.TextOutputStream(process.stderr, {autoFlush: true, bufferSize: 1})),
				});
			};
		},
	};
})();