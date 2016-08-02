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
		DD_MODULES['Doodad.NodeJs.IO/root'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE() */,
			dependencies: [
				'Doodad.IO/common',
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
					nodejs = doodad.NodeJs,
					nodejsMixIns = nodejs.MixIns,
					nodejsInterfaces = nodejs.Interfaces,
					nodejsIO = nodejs.IO,
					nodejsIOMixIns = nodejsIO.MixIns,
					nodejsIOInterfaces = nodejsIO.Interfaces,
					
					nodeStream = require('stream'),
					nodeFs = require('fs'),
					nodeCluster = require('cluster');
				
				
				//=====================================================
				// Stream objects
				//=====================================================
				
				nodejsIO.REGISTER(io.InputStream.$extend(
										mixIns.NodeEvents,
				{
					$TYPE_NAME: 'BinaryInputStream',
					
					stream: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					__listening: doodad.PROTECTED(false),
					__ended: doodad.PROTECTED(false),
					__closed: doodad.PROTECTED(false),
					
					isClosed: doodad.PUBLIC(function isClosed() {
						return this.__closed;
					}),
					
					streamOnReadable: doodad.NODE_EVENT('readable', function streamOnReadable(context) {
						if (this.stream.isPaused()) {
							const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
							ireadable.emit('readable');
						};
					}),
					
					streamOnData: doodad.NODE_EVENT('data', function streamOnData(context, chunk) {
						if (this.stream.isPaused()) {
							return;
						};
						const options = {output: false};
						const data = this.transform({raw: chunk}, options);
						this.push(data, options);
					}),
					
					streamOnEnd: doodad.NODE_EVENT('end', function streamOnEnd(context) {
						this.__ended = true;
						const options = {output: false};
						const data = this.transform({raw: io.EOF}, options);
						this.push(data, options);
					}),

					streamOnClose: doodad.NODE_EVENT('close', function streamOnClose(context) {
						if (!this.__ended) {
							this.__ended = true;
							const options = {output: false};
							const data = this.transform({raw: io.EOF}, options);
							this.push(data, options);
						};
						this.__closed = true;
						const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
						ireadable.emit('close');
					}),
					
					streamOnError: doodad.NODE_EVENT('error', function streamOnError(context, ex) {
						this.onError(new doodad.ErrorEvent(ex));
					}),
					
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						const stream = types.get(options, 'nodeStream');

						root.DD_ASSERT && root.DD_ASSERT(types._instanceof(stream, [nodeStream.Readable, nodeStream.Duplex, nodeStream.Transform]), "Invalid node.js stream object.");
						
						this._super(options);
						
						_shared.setAttribute(this, 'stream', stream);
					}),
					
					isPaused: doodad.REPLACE(nodejsIOInterfaces.IReadable, function isPaused() {
						const host = this[doodad.HostSymbol];
						return host.stream.isPaused();
					}),

					pause: doodad.REPLACE(nodejsIOInterfaces.IReadable, function pause() {
						const host = this[doodad.HostSymbol];
						const cb = new doodad.Callback(this, function() {
							host.stream.removeListener('pause', cb);
							this.emit("pause");
						});
						host.stream.once('pause', cb);
						host.stream.pause();
					}),

					_read: doodad.REPLACE(nodejsIOInterfaces.IReadable, function _read(/*optional*/size) {
						const host = this[doodad.HostSymbol];
						return host.stream._read(size);
					}),
					
					resume: doodad.REPLACE(nodejsIOInterfaces.IReadable, function resume() {
						const host = this[doodad.HostSymbol];
						const cb = new doodad.Callback(this, function() {
							host.stream.removeListener('resume', cb);
							this.emit("resume");
						});
						host.stream.once('resume', cb);
						host.stream.resume();
					}),

					push: doodad.REPLACE(nodejsIOInterfaces.IReadable, function push(chunk, /*optional*/encoding) {
						const host = this[doodad.HostSymbol];
						return host.stream.push(chunk, encoding || this.__defaultEncoding);
					}),
					
					unshift: doodad.REPLACE(nodejsIOInterfaces.IReadable, function unshift(chunk) {
						const host = this[doodad.HostSymbol];
						return host.stream.unshift(chunk);
					}),
					
					wrap: doodad.REPLACE(nodejsIOInterfaces.IReadable, function wrap(stream) {
						const host = this[doodad.HostSymbol];
						return host.stream.wrap(stream);
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

							this.onListen(new doodad.Event());
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

							this.onStopListening(new doodad.Event());
						};
						
						this.clear();
					}),
					
					read: doodad.OVERRIDE(function read(/*optional*/options) {
						const stream = this.stream;
						
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
							this.push(raw, types.extend({}, options, {next: false, output: false, transformed: false}));
						};
						
						return this._super(options);
					}),
					
					push: doodad.OVERRIDE(function push(data, /*optional*/options) {
						if (this.__closed) {
							throw new types.NotAvailable("Stream closed.");
						};
						return this._super(data, options);
					}),
				}));
				
				
				nodejsIO.REGISTER(nodejsIO.BinaryInputStream.$extend(
									ioMixIns.TextInput,
									ioMixIns.TextTransformable,
				{
					$TYPE_NAME: 'TextInputStream',
				}));
				
				
				nodejsIO.REGISTER(io.OutputStream.$extend(
									mixIns.NodeEvents,
				{
					$TYPE_NAME: 'BinaryOutputStream',
					
					stream: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					__buffer: doodad.PROTECTED(null),
					__closed: doodad.PROTECTED(false),
					
					isClosed: doodad.PUBLIC(function isClosed() {
						return this.__closed;
					}),
					
					streamOnFinish: doodad.NODE_EVENT('finish', function streamOnFinish(context) {
						const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
						iwritable.emit('finish');
					}),
					
					streamOnError: doodad.NODE_EVENT('error', function streamOnError(context, ex) {
						this.onError(new doodad.ErrorEvent(ex));
					}),
					
					streamOnDrain: doodad.NODE_EVENT('drain', function streamOnDrain(context, ex) {
						context.data.callback(ex);
					}),
					
					streamOnClose: doodad.NODE_EVENT('close', function streamOnClose(context) {
						this.__closed = true;
						const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
						iwritable.emit('close');
					}),
					
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						const stream = types.get(options, 'nodeStream');

						// FIXME: Figure out the object model of NodeJS to make the assertion because it fails with an http.ServerResponse object
						//root.DD_ASSERT && root.DD_ASSERT(types._instanceof(stream, [nodeStream.Writable, nodeStream.Duplex, nodeStream.Transform]), "Invalid node.js stream object.");
						
						this._super(options);

						this.streamOnFinish.attach(stream);
						this.streamOnError.attach(stream);
						this.streamOnClose.attach(stream);
						
						_shared.setAttribute(this, 'stream', stream);
					}),
					
					destroy: doodad.OVERRIDE(function destroy() {
						const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
						iwritable.emit('destroy');

						this.streamOnFinish.clear();
						this.streamOnError.clear();
						this.streamOnClose.clear();
						this.streamOnDrain.clear();
						
						this._super();
					}),
					
					__flushInternal: doodad.REPLACE(function __flushInternal(state, data, /*optional*/options) {
						this.onFlushData(new doodad.Event(data));

						let callback = types.get(options, 'callback');
						if (callback) {
							const cbObj = types.get(options, 'callbackObj');
							callback = new doodad.AsyncCallback(cbObj, callback);
						};

						if (data.raw === io.EOF) {
							this.stream.end(callback); // async
						} else {
							if (callback) {
								state.ok = this.stream.write(data.valueOf());
								if (state.ok) {
									callback(); // async
								} else {
									// <PRB> "possible EventEmitter memory leak detected"
									//this.stream.once('drain', callback);
									this.streamOnDrain.attachOnce(this.stream, {callback: callback}); // async
								};
							} else {
								state.ok = this.stream.write(data.valueOf());
								if (!state.ok) {
									throw new types.BufferOverflow();
								};
							};
						};
					}),
					
					cork: doodad.REPLACE(nodejsIOInterfaces.IWritable, function cork() {
						const host = this[doodad.HostSymbol];
						host.stream.cork();
					}),
					
					uncork: doodad.REPLACE(nodejsIOInterfaces.IWritable, function uncork() {
						const host = this[doodad.HostSymbol];
						host.stream.uncork();
					}),

					push: doodad.OVERRIDE(function push(data, /*optional*/options) {
						if (this.__closed) {
							throw new types.NotAvailable("Stream closed.");
						};
						return this._super(data, options);
					}),
				}));
				
				
				nodejsIO.REGISTER(nodejsIO.BinaryOutputStream.$extend(
									ioMixIns.TextOutput,
									ioMixIns.TextTransformable,
				{
					$TYPE_NAME: 'TextOutputStream',

					__flushInternal: doodad.REPLACE(function __flushInternal(state, data, /*optional*/options) {
						this.onFlushData(new doodad.Event(data));
						
						let callback = types.get(options, 'callback');
						
						if (data.raw === io.EOF) {
							const cbObj = types.get(options, 'callbackObj');
							callback = new doodad.Callback(cbObj, callback);
							this.stream.end(callback); // async
							
						} else if (callback) {
							state.ok = this.stream.write(data.valueOf(), this.options.encoding);
							if (state.ok) {
								const cbObj = types.get(options, 'callbackObj');
								callback = new doodad.AsyncCallback(cbObj, callback);
								callback(); // async
							} else {
								const cbObj = types.get(options, 'callbackObj');
								callback = new doodad.Callback(cbObj, callback);
								// <PRB> "possible EventEmitter memory leak detected"
								//this.stream.once('drain', callback);
								this.streamOnDrain.attachOnce(this.stream, {callback: callback}); // async
							};
							
						} else {
							state.ok = this.stream.write(data.valueOf(), this.options.encoding);
							if (!state.ok) {
								throw new types.BufferOverflow();
							};
						};
					}),
				}));
				
				
				files.openFile = function openFile(path, /*optional*/options) {
					path = _shared.urlParser(path, types.get(options, 'parseOptions'));
					
					root.DD_ASSERT && root.DD_ASSERT((path instanceof files.Path) || ((path instanceof files.Url) && (path.protocol === 'file')), "Invalid path.")
					
					if (path instanceof files.Url) {
						path = files.Path.parse(path);
					};
					
					path = path.toString();
					
					const encoding = types.get(options, 'encoding'),
						Promise = types.getPromise();
						
					return Promise.try(function() {
						const nodeStream = nodeFs.createReadStream(path, {autoClose: true});
						if (encoding) {
							return new nodejsIO.TextInputStream({nodeStream: nodeStream, encoding: encoding});
						} else {
							return new nodejsIO.BinaryInputStream({nodeStream: nodeStream});
						};
					});
				};
				
				
				//===================================
				// Init
				//===================================
				return function init(/*optional*/options) {
					// NOTE: Every "std" must be a stream.
					// <PRB> Since Node version 5.6.0 or 5.7.0, children of a cluster are taking control of 'stdin'.
					if (nodeCluster.isMaster) {
						io.setStds({
							stdin: new nodejsIO.TextInputStream({nodeStream: process.stdin, autoFlush: true, bufferSize: 1}),
						});
					};
					const stdout = new nodejsIO.TextOutputStream({nodeStream: process.stdout, autoFlush: true, bufferSize: 1});
					io.setStds({
						stdout: stdout,
						stderr: ((process.stderr === process.stdout) ? stdout : new nodejsIO.TextOutputStream({nodeStream: process.stderr, autoFlush: true, bufferSize: 1})),
					});
				};
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