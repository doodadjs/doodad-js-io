//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: NodeJs_IO.js - Node.js IO Tools
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BinaryInputStreamNodeJs')), true) */,
					
					stream: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					__listening: doodad.PROTECTED(false),
					__ended: doodad.PROTECTED(false),
					__waiting: doodad.PROTECTED(false),
					
					streamOnData: doodad.NODE_EVENT('data', function streamOnData(context, chunk) {
						if (this.__waiting) {
							throw new types.BufferOverflow();
						};

						const __endCb = doodad.AsyncCallback(this, function endCb() {
							this.stopListening();
						});

						const __pushCb = doodad.Callback(this, function pushCb() {
							if (this.__listening) {
								const chunk = this.stream.read();
								if (chunk) {
									const data = this.transform({raw: chunk});
									this.push(data, {callback: __pushCb});
								} else {
									this.__waiting = false;
									if (this.__ended) {
										const data = this.transform({raw: io.EOF}, {callback: __endCb});
										this.push(data);
									} else {
										this.stream.resume();
										this.streamOnData.attach(this.stream);
									};
								};
							} else {
								// Fully apply stopListening
								this.__waiting = false;
								this.__listening = true;
								this.stopListening();
							};
						})

						this.__waiting = true;
						this.stream.pause();
						this.streamOnData.clear();

						const data = this.transform({raw: chunk}, {callback: __pushCb});
						this.push(data);
					}),
					
					streamOnEnd: doodad.NODE_EVENT('end', function streamOnEnd(context) {
						this.__ended = true;
						if (!this.__waiting) {
							const __endCb = doodad.AsyncCallback(this, function endCb() {
								if (this.getCount() === 0) {
									this.stopListening();
								};
							});

							const data = this.transform({raw: io.EOF});
							this.push(data, {callback: __endCb});
						};
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
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__ended = false;
						this.__waiting = false;
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
							
							if (!this.__waiting) {
								const stream = this.stream;
							
								this.streamOnData.attach(stream);
								this.streamOnEnd.attach(stream);
								this.streamOnClose.attach(stream);
								this.streamOnError.attach(stream);
							
								stream.resume();

								this.onListen(new doodad.Event());
							};
						};
					}),

					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							
							if (!this.__waiting) {
								this.streamOnData.clear();
								this.streamOnEnd.clear();
								this.streamOnClose.clear();
								this.streamOnError.clear();
							
								this.stream.pause();

								this.onStopListening(new doodad.Event());
							};
						};
					}),
				}));
				
				
				nodejsIO.REGISTER(nodejsIO.BinaryInputStream.$extend(
									ioMixIns.TextInput,
									ioMixIns.TextTransformable,
				{
					$TYPE_NAME: 'TextInputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextInputStreamNodeJs')), true) */,
				}));
				
				
				nodejsIO.REGISTER(io.OutputStream.$extend(
									mixIns.NodeEvents,
				{
					$TYPE_NAME: 'BinaryOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BinaryOutputStreamNodeJs')), true) */,
					
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
					
					canWrite: doodad.OVERRIDE(function canWrite() {
						return this._super() && this.__lastWriteOk;
					}),

					__writeToStream: doodad.PROTECTED(function __writeToStream(raw, /*optional*/callback) {
						return this.stream.write(raw, null, callback);
					}),

					onReady: doodad.OVERRIDE(function onReady(ev) {
						const retval = this._super(ev);

						const data = ev.data;
						const hasCallback = !!types.get(data.options, 'callback');

						ev.preventDefault();
						data.delayed = true; // Will be consumed later

						const consumeCallback = doodad.Callback(this, function consume() {
							this.__lastWriteOk = true;
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
							const ok = this.__lastWriteOk = this.__writeToStream(data.valueOf());
							if (ok) {
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextOutputStreamNodeJs')), true) */,

					__writeToStream: doodad.REPLACE(function __writeToStream(raw, /*optional*/callback) {
						return this.stream.write(raw, this.options.encoding, callback);
					}),
				}));
				
				
				io.REGISTER(io.Stream.$extend(
									io.TextInputStream,
									io.TextOutputStream,
				{
					$TYPE_NAME: 'UrlDecoderStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('UrlDecoderStreamNodeJs')), true) */,

					__listening: doodad.PROTECTED(false),
					__remaining: doodad.PROTECTED(null),
					__mode: doodad.PROTECTED(0),

					$Modes: doodad.PUBLIC(doodad.READ_ONLY(types.freezeObject({
						Key: 0,
						Value: 1,
					}))),

					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'maxStringLength', types.getIn(this.options, 'maxStringLength', 1024 * 1024 * 1));

						this._super(options);
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

						const data = ev.data;

						ev.preventDefault();

						const eof = (data.raw === io.EOF);
						const type = types.getType(this);
						const Modes = type.$Modes;
						const encoding = this.options.encoding;
						const decode = function decode(value) {
							value = _shared.Natives.windowUnescape(value);
							value = _shared.Natives.globalBuffer.from(value, 'binary');
							value = type.$decode(value, encoding);
							return value;
						};

						let remaining = this.__remaining;
						this.__remaining = '';

						const value = (eof ? '' : data.valueOf());
						if ((remaining.length + value.length) > this.options.maxStringLength) {
							throw new types.BufferOverflow("URL buffer exceeded maximum permitted length.");
						};

						const url = remaining + value;

						const delimiters = /\=|\&/g;

						let last = 0,
							result;
						while (result = delimiters.exec(url)) {
							const chr = result[0];
							if ((this.__mode === Modes.Value) && (chr === '=')) {
								// Character "=" in the value
							} else {
								const value = decode(url.slice(last, result.index));
								const mode = this.__mode;

								// TODO: Transform
								const section = {
									mode: mode, 
									Modes: Modes, 
									text: value, 
									valueOf: function() {
										return this.text;
									},
								};
								section.raw = section;
								this.push(section);

								if (mode === Modes.Key) {
									this.__mode = Modes.Value;
								} else {
									this.__mode = Modes.Key;
								};

								last = delimiters.lastIndex;
							};
						};

						remaining = url.slice(last);
						if (eof) {
							if (remaining) {
								// TODO: Transform
								const section = {
									mode: this.__mode, 
									Modes: Modes, 
									text: decode(remaining), 
									valueOf: function() {
										return this.text;
									},
								};
								section.raw = section;
								this.push(section);
							};
							const dta = this.transform({raw: io.EOF});
							this.push(dta);
						} else if (remaining) {
							this.__remaining = remaining;
						};

						if (this.options.flushMode === 'half') {
							this.flush(this.options.autoFlushOptions);
						};

						return retval;
					}),
				}));


				io.REGISTER(io.Stream.$extend(
									io.InputStream,
									io.OutputStream,
				{
					$TYPE_NAME: 'Base64DecoderStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('Base64DecoderStreamNodeJs')), true) */,

					__listening: doodad.PROTECTED(false),
					__remaining: doodad.PROTECTED(null),

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__listening = false;
						this.__remaining = '';
					}),

					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
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

						const buf = this.__remaining + (eof ? '' : data.valueOf().toString('ascii').replace(/\n|\r/gm, ''));
						this.__remaining = '';

						const bufLen = buf.length;
						const chunkLen = (eof ? bufLen : (bufLen >> 2) << 2); // Math.floor(bufLen / 4) * 4

						if (chunkLen) {
							const chunk = _shared.Natives.globalBuffer.from(buf.slice(0, chunkLen), 'base64');
							if (chunkLen !== bufLen) {
								this.__remaining = buf.slice(chunkLen);
							};
							const dta = this.transform({raw: chunk});
							this.push(dta);
						};

						if (eof) {
							const dta = this.transform({raw: io.EOF});
							this.push(dta);
						};

						if (this.options.flushMode === 'half') {
							this.flush(this.options.autoFlushOptions);
						};

						return retval;
					}),
				}));


				io.REGISTER(io.Stream.$extend(
									io.InputStream,
									io.OutputStream,
				{
					$TYPE_NAME: 'FormMultipartDecoderStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('FormMultipartDecoderStreamNodeJs')), true) */,

					__listening: doodad.PROTECTED(false),
					__headersCompiled: doodad.PROTECTED(false),
					__headers: doodad.PROTECTED(null),
					__inPart: doodad.PROTECTED(false),
					__remaining: doodad.PROTECTED(null),
					__parsing: doodad.PROTECTED(false),

					__boundary: doodad.PROTECTED(null),

					setOptions: doodad.OVERRIDE(function setOptions(options) {
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
						this.__parsing = false;
					}),

					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
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

					canWrite: doodad.OVERRIDE(function canWrite() {
						return this._super() && !this.__parsing;
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						if (this.__parsing) {
							throw new types.BufferOverflow();
						};

						const data = ev.data;

						ev.preventDefault();

						const eof = (data.raw === io.EOF);
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

						if (buf) {
							const __parseHeaders = function parseHeaders(buf, start, /*optional*/end) {
								if (types.isNothing(end)) {
									end = buf.length;
								};

								if (!this.__headersCompiled) {
									let index;
									while ((start < end) && ((index = buf.indexOf(0x0A, start)) >= 0)) { // "\n"
										if (index === start + 1) {
											this.__headersCompiled = true;
											start = index + 1;
											const dta = this.transform({raw: io.BOF, headers: this.__headers});
											this.push(dta);
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
									start = end;
									const dta = this.transform({raw: buf});
									this.push(dta);
								};

								return start;
							};

							let pos = 0;
							while (pos < buf.length) {
								const index = buf.indexOf(this.__boundary, pos);
								if (index >= 0) {
									if ((index + this.__boundary.length + 2) < buf.length) {
										let start = pos;
										pos = index + this.__boundary.length;
										const cr = buf[pos];
										const lf = buf[pos + 1];
										pos += 2;
										if (this.__inPart) {
											start = __parseHeaders.call(this, buf, start, index);
											if (this.__headersCompiled && (start >= index)) {
												const dta = this.transform({raw: io.EOF});
												this.push(dta);
												this.__headers = types.nullObject();
												this.__headersCompiled = false;
												if ((cr !== 0x0D) && (lf !== 0x0A)) { // "\r\n"
													// Latest boundary
													this.__inPart = false;
													break;
												};
											};
										} else {
											this.__inPart = true;
										};
									} else {
										// Missing end of boundary data
										break;
									};
								} else {
									if (this.__inPart) {
										__parseHeaders.call(this, buf, pos, null);
									};
									pos = buf.length;
									break;
								};
							};

							if (pos < buf.length) {
								this.__remaining = (pos > 0 ? buf.slice(pos) : buf);
							};
						};

						if (eof) {
							const dta = this.transform({raw: io.EOF});
							this.push(dta);
						};

						if (this.options.flushMode === 'half') {
							this.flush(this.options.autoFlushOptions);
						};

						return retval;
					}),
				}));



				files.ADD('openFile', function openFile(path, /*optional*/options) {
					path = _shared.pathParser(path, types.get(options, 'parseOptions'));
					
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
				});
				
				
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
					const stdout = new nodejsIO.TextOutputStream({nodeStream: process.stdout, flushMode: 'half', bufferSize: 1024});
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