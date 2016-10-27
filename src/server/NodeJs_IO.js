//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: NodeJs_IO.js - Node.js IO Tools
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
		DD_MODULES['Doodad.NodeJs.IO/root'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
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


				types.complete(_shared.Natives, {
					windowUnescape: global.unescape,
					globalBuffer: global.Buffer,
				});
				

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
					
					streamOnReadable: doodad.NODE_EVENT('readable', function streamOnReadable(context) {
						if (this.stream.isPaused()) {
							let chunk;
							while (chunk = this.stream.read()) {
								const data = this.transform({raw: chunk});
								this.push(data);
							};
						};
					}),
					
					streamOnData: doodad.NODE_EVENT('data', function streamOnData(context, chunk) {
						if (this.stream.isPaused()) {
							return;
						};
						const data = this.transform({raw: chunk});
						this.push(data);
					}),
					
					streamOnEnd: doodad.NODE_EVENT('end', function streamOnEnd(context) {
						this.__ended = true;
						const data = this.transform({raw: io.EOF});
						this.push(data);
					}),

					streamOnClose: doodad.NODE_EVENT('close', function streamOnClose(context) {
						if (!this.__ended) {
							this.__ended = true;
							const data = this.transform({raw: io.EOF});
							this.push(data);
						};
						const istream = this.getInterface(nodejsIOInterfaces.IStream);
						istream.close();
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
					
					_read: doodad.REPLACE(nodejsIOInterfaces.IReadable, function _read(/*optional*/size) {
						const host = this[doodad.HostSymbol];
						return host.stream._read(size);
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
							if (!types.isNothing(raw)) {
								this.push(raw, options);
							};
						};
						
						return this._super(options);
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
					
					__lastWriteOk: doodad.PROTECTED(true),
					
					streamOnFinish: doodad.NODE_EVENT('finish', function streamOnFinish(context) {
						const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
						iwritable.emit('finish');
					}),
					
					streamOnError: doodad.NODE_EVENT('error', function streamOnError(context, ex) {
						this.onError(new doodad.ErrorEvent(ex));
					}),
					
					streamOnDrain: doodad.NODE_EVENT('drain', function streamOnDrain(context, ex) {
						this.__lastWriteOk = true;
						const callback = context.data && context.data.callback;
						callback && callback(ex);
						const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
						iwritable.emit('drain');
					}),
					
					streamOnClose: doodad.NODE_EVENT('close', function streamOnClose(context) {
						const istream = this.getInterface(nodejsIOInterfaces.IStream);
						istream.close();
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

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__lastWriteOk = true;
					}),
					
					// TODO: Fix bug in Doodad that forces to use POSITION for nodeJsIO.TextOutputStream
					canWrite: doodad.POSITION(0, ioMixIns.OutputStream, doodad.REPLACE(function canWrite() {
						return this.__lastWriteOk;
					})),

					__writeToStream: doodad.PROTECTED(function __writeToStream(raw, /*optional*/callback) {
						return this.stream.write(raw, null, callback);
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						const data = ev.data;
						const hasCallback = !!types.get(data.options, 'callback');

						ev.preventDefault();
						data.consumed = true; // Will be consumed later

						const consumeCallback = new doodad.Callback(this, function consume() {
							// Consumed
							data.consumed = false;
							this.__consumeData(data);
						});

						if (data.raw === io.EOF) {
							//if (this.stream.autoClose) {
							//	this.stream.once('close', consumeCallback);
							//	this.stream.end();
							//} else {
								this.stream.end(consumeCallback); // async
							//};
						} else if (this.__lastWriteOk || hasCallback) {
							this.__lastWriteOk = this.__writeToStream(data.valueOf());
							if (this.__lastWriteOk) {
								consumeCallback();
							} else {
								this.streamOnDrain.attachOnce(this.stream, {callback: consumeCallback}); // async
							};
						} else {
							throw new types.BufferOverflow();
						};

						return retval;
					}),

					cork: doodad.REPLACE(nodejsIOInterfaces.IWritable, function cork() {
						const host = this[doodad.HostSymbol];
						host.stream.cork();
					}),
					
					uncork: doodad.REPLACE(nodejsIOInterfaces.IWritable, function uncork() {
						const host = this[doodad.HostSymbol];
						host.stream.uncork();
					}),

				}));
				
				
				nodejsIO.REGISTER(nodejsIO.BinaryOutputStream.$extend(
									ioMixIns.TextOutput,
									ioMixIns.TextTransformable,
				{
					$TYPE_NAME: 'TextOutputStream',

					__writeToStream: doodad.REPLACE(function __writeToStream(raw, /*optional*/callback) {
						return this.stream.write(raw, this.options.encoding, callback);
					}),
				}));
				
				
				io.REGISTER(io.Stream.$extend(
									io.InputStream,
									io.OutputStream,
									ioMixIns.TextTransformable,
				{
					$TYPE_NAME: 'TextDecoderStream',

					__listening: doodad.PROTECTED(false),

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__listening = false;
					}),

					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						//options = types.nullObject(options);
						if (!this.__listening) {
							this.__listening = true;
							this.onListen(new doodad.Event());
						};
					}),
					
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							this.onStopListening(new doodad.Event());
						};
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						ev.preventDefault();

						let data = ev.data;

						data = this.transform(data);
						this.push(data);

						return retval;
					}),
				}));


				io.REGISTER(io.Stream.$extend(
									io.TextInputStream,
									io.TextOutputStream,
				{
					$TYPE_NAME: 'UrlDecoderStream',

					__listening: doodad.PROTECTED(false),
					__remaining: doodad.PROTECTED(null),
					__mode: doodad.PROTECTED(0),

					$Modes: doodad.PUBLIC(doodad.READ_ONLY(types.freezeObject({
						Key: 0,
						Value: 1,
					}))),

					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);

						types.getDefault(options, 'maxStringLength', 1024 * 1024 * 1);
					}),

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__listening = false;
						this.__remaining = '';
						this.__mode = 0;
					}),

					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						//options = types.nullObject(options);
						if (!this.__listening) {
							this.__listening = true;
							this.onListen(new doodad.Event());
						};
					}),
					
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							this.onStopListening(new doodad.Event());
						};
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						ev.preventDefault();

						const data = ev.data;

						const type = types.getType(this);
						const Modes = type.$Modes;
						const encoding = this.options.encoding;
						const decode = function decode(value) {
							value = _shared.Natives.windowUnescape(value);
							value = _shared.Natives.globalBuffer.from(value, 'binary');
							value = type.$decode(value, encoding);
							return value;
						};

						const url = this.__remaining + ((data.raw === io.EOF) ? '' : data.valueOf());
						if (url.length > this.options.maxStringLength) {
							throw new types.BufferOverflow("URL buffer exceeded maximum permitted length.");
						};
						const delimiters = /\=|\&/g;
						let last = 0,
							result;
						while (result = delimiters.exec(url)) {
							const chr = result[0];
							if ((this.__mode === Modes.Value) && (chr === '=')) {
								continue;
							};
							let value = url.slice(last, result.index);
							value = decode(value);
							this.push({
								mode: this.__mode, 
								Modes: Modes, 
								text: value, 
								valueOf: function() {
									return this.text;
								}
							});
							if (this.__mode === Modes.Key) {
								this.__mode = Modes.Value;
							} else {
								this.__mode = Modes.Key;
							};
							last = result.index + chr.length;
						};

						if (data.raw === io.EOF) {
							let value = url.slice(last);
							if (value) {
								value = decode(value);
								this.push({
									mode: this.__mode, 
									Modes: Modes, 
									text: value, 
									valueOf: function() {
										return this.text;
									}
								});
							};
							this.push(data);
						} else {
							this.__remaining = url.slice(last);
						};

						return retval;
					}),
				}));


				io.REGISTER(io.Stream.$extend(
									io.InputStream,
									io.OutputStream,
				{
					$TYPE_NAME: 'Base64DecoderStream',

					__listening: doodad.PROTECTED(false),
					__buffer: doodad.PROTECTED(null),
					__bufferLength: doodad.PROTECTED(0),
					__decoder: doodad.PROTECTED(null),

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__listening = false;
						this.__buffer = '';
					}),

					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						//options = types.nullObject(options);
						if (!this.__listening) {
							this.__listening = true;
							this.onListen(new doodad.Event());
						};
					}),
					
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							this.onStopListening(new doodad.Event());
						};
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						ev.preventDefault();

						const data = ev.data;
							
						const eof = (data.raw === io.EOF);

						const buf = this.__buffer + (eof ? '' : data.valueOf().toString('ascii').replace(/\n|\r/gm, ''));
						this.__buffer = '';

						const bufLen = buf.length;
						const chunkLen = (eof ? bufLen : (bufLen >> 2) << 2); // Math.floor(bufLen / 4) * 4

						if (chunkLen) {
							const chunk = _shared.Natives.globalBuffer.from(buf.slice(0, chunkLen), 'base64');
							if (chunkLen !== bufLen) {
								this.__buffer = buf.slice(chunkLen);
							};
							this.push({
								raw: chunk,
								valueOf: function() {
									return this.raw;
								},
							});
						};

						if (eof) {
							this.push(data);
						};

						return retval;
					}),
				}));


				io.REGISTER(io.Stream.$extend(
									io.InputStream,
									io.OutputStream,
				{
					$TYPE_NAME: 'FormMultipartDecoderStream',

					__listening: doodad.PROTECTED(false),
					__headersCompiled: doodad.PROTECTED(false),
					__headers: doodad.PROTECTED(null),
					__inPart: doodad.PROTECTED(false),
					__remaining: doodad.PROTECTED(null),

					__boundary: doodad.PROTECTED(null),

					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
					
						if (!this.options.boundary) {
							throw new types.Error("The 'boundary' option is required.");
						};
						
						this.__boundary = _shared.Natives.globalBuffer.from('--' + types.toString(this.options.boundary), 'binary');
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__listening = false;
						this.__headers = types.nullObject();
						this.__headersCompiled = false;
						this.__inPart = false;
						this.__remaining = null;
					}),

					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						//options = types.nullObject(options);
						if (!this.__listening) {
							this.__listening = true;
							this.onListen(new doodad.Event());
						};
					}),
					
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							this.onStopListening(new doodad.Event());
						};
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						ev.preventDefault();

						const data = ev.data;
						const eof = (data.raw === io.EOF);
						const result = this.__result;

						let buf = !eof && data.valueOf();
						const remaining = this.__remaining;
						if (remaining) {
							this.__remaining = null;
							if (buf) {
								// TODO: Add a limit to "buf"'s length
								buf = _shared.Natives.globalBuffer.concat([remaining, buf], remaining.length + buf.length);
							} else {
								buf = remaining;
							};
						};

						const parse = function parse(buf, start, /*optional*/end) {
							if (types.isNothing(end)) {
								end = buf.length;
							};

							if (!this.__headersCompiled) {
								let index;
								while ((start < end) && ((index = buf.indexOf(0x0A, start)) >= 0)) { // "\n"
									if (index === start + 1) {
										this.__headersCompiled = true;
										this.push({raw: io.BOF, headers: this.__headers, valueOf: function() {this.raw;}});
										start = index + 1;
										break;
									};
									const str = buf.slice(start, index).toString('utf-8');  // Doing like Node.js (UTF-8). Normally it should be ASCII 7 bits.
									const header = tools.split(str, ':', 2);
									const name = tools.trim(header[0] || '');
									const value = tools.trim(header[1] || '');
									if (name) {
										this.__headers[name] = value;
									};
									start = index + 1;
								};
							};

							if ((start < end) && this.__headersCompiled) {
								if ((start > 0) || (end < buf.length)) {
									buf = buf.slice(start, end);
								};
								this.push({raw: buf, valueOf: function() {return this.raw}});
								start = end;
							};

							return start;
						};

						if (buf) {
							let pos = 0;

							while (buf && (pos < buf.length)) {
								const index = buf.indexOf(this.__boundary, pos);
								if (index >= 0) {
									if ((index + this.__boundary.length + 2) < buf.length) {
										if (this.__inPart) {
											const newPos = parse.call(this, buf, pos, index);
											if (!this.__headersCompiled || (newPos < index)) {
												break;
											};
											this.push({raw: io.EOF, valueOf: function() {return this.raw}});
										};
										pos = index + this.__boundary.length;
										if ((buf[pos] !== 0x0D) && (buf[pos + 1] !== 0x0A)) { // "\r\n"
											// Latest boundary
											pos += 2;
											this.__inPart = false;
											break;
										};
										pos += 2;
										this.__headers = {};
										this.__headersCompiled = false;
										this.__inPart = true;
									} else {
										// Missing end of boundary data
										break;
									};
								} else {
									if (this.__inPart) {
										pos = parse.call(this, buf, pos);
									} else {
										pos = buf.length;
									};
									break;
								};
							};

							if (!eof && (pos < buf.length)) {
								this.__remaining = (pos > 0 ? buf.slice(pos) : buf);
							};
						};

						if (eof) {
							this.push(data);
						};

						return retval;
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
					// <PRB> Since Node version 5.6.0 or 5.7.0, children of a cluster are taking control of 'stdin'. So we must have this condition...
					if (nodeCluster.isMaster) {
						io.setStds({
							stdin: new nodejsIO.TextInputStream({nodeStream: process.stdin}),
						});
					};
					const stdout = new nodejsIO.TextOutputStream({nodeStream: process.stdout});
					io.setStds({
						stdout: stdout,
						stderr: ((process.stderr === process.stdout) ? stdout : new nodejsIO.TextOutputStream({nodeStream: process.stderr})),
					});
				};
			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()