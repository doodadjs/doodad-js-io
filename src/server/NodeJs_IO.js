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
										ioMixIns.BinaryTransformableIn,
										ioMixIns.BinaryTransformableOut,
				{
					$TYPE_NAME: 'BinaryInputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BinaryInputStreamNodeJs')), true) */,
					
					stream: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					__ended: doodad.PROTECTED(false),
					__waiting: doodad.PROTECTED(false),
					__listening: doodad.PROTECTED(false),

					streamOnData: doodad.NODE_EVENT('data', function streamOnData(context, chunk) {
						if (this.__waiting) {
							throw new types.BufferOverflow();
						};

						const __pushCb = doodad.Callback(this, function pushCb(err) {
							if (!err && this.__listening) {
								const chunk = this.stream.read();
								if (chunk) {
									this.push(new io.BinaryData(chunk), {callback: __pushCb});
								} else {
									this.__waiting = false;
									if (this.__ended) {
										this.stopListening();
										this.push(new io.BinaryData(io.EOF));
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

						this.push(new io.BinaryData(chunk), {callback: __pushCb});
					}),
					
					streamOnEnd: doodad.NODE_EVENT('end', function streamOnEnd(context) {
						this.__ended = true;
						if (!this.__waiting) {
							this.stopListening();
							this.push(new io.BinaryData(io.EOF));
						};
					}),

					streamOnClose: doodad.NODE_EVENT('close', function streamOnClose(context) {
						if (!this.__ended) {
							this.__ended = true;
							this.push(new io.BinaryData(io.EOF));
						};
						const istream = this.getInterface(nodejsIOInterfaces.IStream);
						istream.destroy();
					}),
					
					streamOnError: doodad.NODE_EVENT('error', function streamOnError(context, ex) {
						if (types.isEntrant(this, 'onError')) {
							this.onError(new doodad.ErrorEvent(ex));
						};
					}),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						const stream = types.get(options, 'nodeStream');

						root.DD_ASSERT && root.DD_ASSERT(types._instanceof(stream, [nodeStream.Readable, nodeStream.Duplex, nodeStream.Transform]), "Invalid node.js stream object.");
						
						this._super(options);
						
						_shared.setAttribute(this, 'stream', stream);
					}),
					
					__pullInternal: doodad.REPLACE(function __pullInternal(/*optional*/options) {
						const size = types.get(options, 'size');

						const raw = this.stream.read(size);

						if (raw) {
							const data = new io.BinaryData(raw, options);

							data.attach(this);

							return data;

						} else {
							return null;

						};
					}),
					
					__pushInternal: doodad.REPLACE(function __pushInternal(data, /*optional*/options) {
						const next = types.get(options, 'next', false);

						const raw = this.transformOut(data, options);

						if (next) {
							this.stream.unshift(raw);
						} else {
							this.stream.push(raw);
						};

						data.consume();
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this._super();

						while (this.stream.read()) {
						};
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

					isListening: doodad.REPLACE(function isListening() {
						return this.__listening;
					}),

					listen: doodad.REPLACE(function listen(/*optional*/options) {
						if (!this.__listening) {
							this.__listening = true;
							
							if (!this.__waiting) {
								const stream = this.stream;
							
								this.streamOnData.attach(stream);
								this.streamOnEnd.attach(stream);
								this.streamOnClose.attach(stream);
								this.streamOnError.attach(stream);
							
								stream.resume();

								this.onListen();
							};
						};
					}),

					stopListening: doodad.REPLACE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							
							if (!this.__waiting) {
								this.streamOnData.clear();
								this.streamOnEnd.clear();
								this.streamOnClose.clear();
								this.streamOnError.clear();
							
								this.stream.pause();

								this.onStopListening();
							};
						};
					}),
				}));
				
				
				nodejsIO.REGISTER(nodejsIO.BinaryInputStream.$extend(
									ioMixIns.TextInput,
									ioMixIns.TextTransformableOut,
				{
					$TYPE_NAME: 'TextInputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextInputStreamNodeJs')), true) */,

					__pullInternal: doodad.REPLACE(function __pullInternal(/*optional*/options) {
						const size = types.get(options, 'size');
						const raw = this.stream.read(size);
						const data = raw && new io.TextData(raw, options);
						if (data) {
							data.attach(this);
						};
						return data;
					}),
				}));
				
				
				nodejsIO.REGISTER(io.OutputStream.$extend(
									mixIns.NodeEvents,
									ioMixIns.BinaryTransformableIn,
									ioMixIns.BinaryTransformableOut,
				{
					$TYPE_NAME: 'BinaryOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BinaryOutputStreamNodeJs')), true) */,
					
					stream: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					__lastWriteOk: doodad.PROTECTED(true),
					__finished: doodad.PROTECTED(false),

					streamOnError: doodad.NODE_EVENT('error', function streamOnError(context, ex) {
						if (types.isEntrant(this, 'onError')) {
							this.onError(new doodad.ErrorEvent(ex));
						};
					}),
					
					streamOnPipeDrain: doodad.NODE_EVENT('drain', function streamOnPipeDrain(context) {
						// <PRB> Some Node.Js streams don't wait after pipes before emitting 'finish'.

						this.streamOnPipeFinish.detach(context.emitter);
						this.streamOnPipeClose.detach(context.emitter);

						if (--context.data.count === 0) {
							this.__lastWriteOk = true;

							context.data.consume();
						};
					}),

					streamOnPipeFinish: doodad.NODE_EVENT('finish', function streamOnPipeFinish(context) {
						// <PRB> Some Node.Js streams don't emit 'drain' on 'finish'.
						this.streamOnPipeDrain(context);
					}),
					
					streamOnPipeClose: doodad.NODE_EVENT('close', function streamOnPipeClose(context) {
						// <PRB> Some Node.Js streams don't emit 'finish' before 'close'.
						this.streamOnPipeFinish(context);
					}),

					streamOnDrain: doodad.NODE_EVENT('drain', function streamOnDrain(context) {
						this.__lastWriteOk = true;

						context.data.consume();
					}),
					
					streamOnFinish: doodad.NODE_EVENT('finish', function streamOnFinish(context) {
						// <PRB> Some Node.Js streams don't emit 'drain' on 'finish'.
						this.streamOnDrain(context);

						//_shared.setAttribute(this, 'stream', null);
						this.__finished = true;

						const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
						iwritable.onfinish();
					}),
					
					streamOnClose: doodad.NODE_EVENT('close', function streamOnClose(context) {
						// <PRB> Some Node.Js streams don't emit 'finish' before 'close'.
						this.streamOnFinish(context);
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
						this.streamOnFinish.clear();
						this.streamOnError.clear();
						this.streamOnClose.clear();
						this.streamOnDrain.clear();
						
						this.streamOnPipeDrain.clear();
						this.streamOnPipeFinish.clear();
						this.streamOnPipeClose.clear();

						this._super();
					}),

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__lastWriteOk = true;
						this.__finished = false;
					}),
					
					canWrite: doodad.REPLACE(function canWrite() {
						return this.__lastWriteOk && !this.__finished;
					}),

					__writeToStream: doodad.PROTECTED(function __writeToStream(raw, /*optional*/end) {
						if (end) {
							if (types.isNothing(raw)) {
								this.stream.end();
								return true;
							} else {
								this.stream.end(raw);
								return false;
							};
						} else {
							if (types.isNothing(raw)) {
								return true;
							} else {
								return this.stream.write(raw);
							};
						};
					}),

					__submitInternal: doodad.REPLACE(function __submitInternal(data, /*optional*/options) {
						if (data.consumed) {
							throw new types.Error("Data object has been consumed.");
						};

						const callback = types.get(options, 'callback');
						const eof = (data.raw === io.EOF);

						if (callback) {
							data.chain(callback);
						};

						if (!this.__finished) {
							const lastOk = this.__lastWriteOk;

							if (eof || lastOk) {
								const buf = data.valueOf();
								const ok = this.__lastWriteOk = (buf || eof ? this.__writeToStream(buf, eof) : true) && lastOk;
								if (ok && !eof) {
									data.consume();
								} else {
									const context = {count: 1, consume: data.consume.bind(data)};
									const rs = this.stream._readableState;
									if (eof && rs && (rs.pipesCount > 0)) {
										// <PRB> Some Node.Js streams don't wait after pipes before emitting 'drain' or 'finish'.
										// NOTE: 'rs.pipes' can be a stream or an array of streams.
										context.count = rs.pipesCount;
										this.streamOnPipeDrain.attachOnce(rs.pipes, context, true);
										this.streamOnPipeFinish.attachOnce(rs.pipes, context, true);
										this.streamOnPipeClose.attachOnce(rs.pipes, context, true);
									} else if (ok && eof) {
										data.consume();
									} else {
										this.streamOnDrain.attachOnce(this.stream, context, true);
									};
								};
							} else {
								// Stream's 'write' function previously returned 'false', meaning that we should wait for the 'drain' event, but something has been submitted before that event.
								throw new types.BufferOverflow();
							};
						} else if (eof) {
							data.consume();
						} else {
							throw new types.NotAvailable("Stream has finished.");
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

				}));
				
				
				nodejsIO.REGISTER(nodejsIO.BinaryOutputStream.$extend(
									ioMixIns.TextOutput,
									ioMixIns.TextTransformableIn,
				{
					$TYPE_NAME: 'TextOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextOutputStreamNodeJs')), true) */,

					__writeToStream: doodad.REPLACE(function __writeToStream(raw, /*optional*/end) {
						if (end) {
							if (types.isNothing(raw)) {
								this.stream.end();
								return true;
							} else {
								this.stream.end(raw, this.options.encoding);
								return false;
							};
						} else {
							if (types.isNothing(raw)) {
								return true;
							} else {
								return this.stream.write(raw, this.options.encoding);
							};
						};
					}),
				}));
				
				
				io.REGISTER(io.Stream.$extend(
									io.BufferedOutputStream,
									ioMixIns.TextTransformableIn,
									ioMixIns.ObjectTransformableOut,
				{
					$TYPE_NAME: 'UrlDecoderStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('UrlDecoderStreamNodeJs')), true) */,

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

					clear: doodad.OVERRIDE(function clear() {
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__remaining = '';
						this.__mode = 0;
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
							value = io.TextData.$decode(value, encoding);
							return value;
						};

						let remaining = this.__remaining;
						this.__remaining = '';

						const value = data.toString();
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
								this.submit(new io.Data(section));

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
								const section = {
									mode: this.__mode, 
									Modes: Modes, 
									text: decode(remaining), 
								};
								this.submit(new io.Data(section));
							};
							this.submit(new io.Data(io.EOF), {callback: data.defer()});
						} else if (remaining) {
							this.__remaining = remaining;
						};

						return retval;
					}),
				}));


				io.REGISTER(io.Stream.$extend(
									io.BufferedOutputStream,
									ioMixIns.TextTransformableIn,
									ioMixIns.BinaryTransformableOut,
				{
					$TYPE_NAME: 'Base64DecoderStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('Base64DecoderStreamNodeJs')), true) */,

					__remaining: doodad.PROTECTED(null),

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__remaining = '';
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						ev.preventDefault();

						const data = ev.data;

						const eof = (data.raw === io.EOF);

						const value = data.toString();
						const buf = this.__remaining + (types.isNothing(value) ? '' : value.replace(/\n|\r/gm, ''));
						this.__remaining = '';

						const bufLen = buf.length;
						const chunkLen = (eof ? bufLen : (bufLen >> 2) << 2); // Math.floor(bufLen / 4) * 4

						if (chunkLen) {
							const chunk = _shared.Natives.globalBuffer.from(buf.slice(0, chunkLen), 'base64');
							if (chunkLen !== bufLen) {
								this.__remaining = buf.slice(chunkLen);
							};
							this.submit(new io.BinaryData(chunk));
						};

						if (eof) {
							this.submit(new io.Data(io.EOF), {callback: data.defer()});
						};

						return retval;
					}),
				}));


				io.REGISTER(io.Stream.$extend(
									io.BufferedOutputStream,
									ioMixIns.BinaryTransformableIn,
									ioMixIns.BinaryTransformableOut,
				{
					$TYPE_NAME: 'FormMultipartDecoderStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('FormMultipartDecoderStreamNodeJs')), true) */,

					__headersCompiled: doodad.PROTECTED(false),
					__headers: doodad.PROTECTED(null),
					__inPart: doodad.PROTECTED(false),
					__remaining: doodad.PROTECTED(null),

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

						this.__headers = types.nullObject();
						this.__headersCompiled = false;
						this.__inPart = false;
						this.__remaining = null;
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						const data = ev.data;

						ev.preventDefault();

						const eof = (data.raw === io.EOF);
						let buf = this.transformOut(data);
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
											this.submit(new io.Data(io.BOF, {headers: this.__headers}));
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
									this.submit(new io.BinaryData(buf));
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
												this.submit(new io.Data(io.EOF), {callback: data.defer()});
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
							this.submit(new io.Data(io.EOF), {callback: data.defer()});
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