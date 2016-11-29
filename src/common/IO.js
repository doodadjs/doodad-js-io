//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: IO.js - IO tools
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
		DD_MODULES['Doodad.IO/common'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
			dependencies: [
				'Doodad.IO/root',
			],

			create: function create(root, /*optional*/_options, _shared) {
				"use strict";

				var doodad = root.Doodad,
					mixIns = doodad.MixIns,
					types = doodad.Types,
					tools = doodad.Tools,
					io = doodad.IO,
					ioMixIns = io.MixIns,
					ioInterfaces = io.Interfaces,
					extenders = doodad.Extenders;

					
					
				var __Internal__ = {
					stdin: null,
					stdout: null,
					stderr: null,
				};
					
					
				//=====================================================
				// Interfaces (continued)
				//=====================================================
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
				{
					$TYPE_NAME: 'NestedStream',

					openStream: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function openStream(/*optional*/options)
				})));
					
				//=====================================================
				// Basic implementations (continued)
				//=====================================================
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextInputStreamBase.$extend(
									ioMixIns.TextTransformable,
				{
					$TYPE_NAME: 'TextInputStream',
					
					// Non-formatted text
					readText: doodad.OVERRIDE(function readText(/*optional*/options) {
						// TODO: Test
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");

						var text = null;
						
						var data;
						
						while (data = this.read(options)) {
							if (data.raw === io.EOF) {
								break;
							};
							
							text = (text || '') + data.valueOf();
						};
						
						return text;
					}),
					
					// Non-formatted text + newline
					readLine: doodad.OVERRIDE(function readLine(/*optional*/options) {
						// TODO: Test
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");

						var line = null;
						
						if (this.options.newLine) {
							var ok = false,
								data;
							
							while (data = this.read(options)) {
								if (data.raw === io.EOF) {
									ok = true;
									break;
								};
								
								line = (line || '') + data.valueOf();
								
								var index = tools.search(line, this.options.newLine);
								if (index >= 0) {
									var remaining = line.slice(index + this.options.newLine.length);
									line = line.slice(0, index);

									if (remaining) {
										var dta = this.transform({raw: remaining});
										this.push(dta, {next: true});
									};

									ok = true;	
									break;
								};
							};
							
							if (!ok) {
								if (line) {
									var dta = this.transform({raw: line});
									this.push(dta, {next: true});
									line = null;
								};
							};
						};
						
						return line;
					}),
				})));

				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.TextOutputStreamBase.$extend(
									ioMixIns.TextTransformable,
				{
					$TYPE_NAME: 'TextOutputStream',
					
					// Non-formatted text
					writeText: doodad.OVERRIDE(function writeText(text, /*optional*/options) {
						this.write(types.toString(text), options);
					}),
					
					// Non-formatted text + newline
					writeLine: doodad.OVERRIDE(function writeLine(text, /*optional*/options) {
						if (types.isNothing(text)) {
							text = '';
						};
						this.writeText(types.toString(text) + this.options.newLine, options);
					}),
					
					// Formatted text + newline
					print: doodad.OVERRIDE(function print(text, /*optional*/options) {
						this.writeLine(tools.format(types.toString(text), types.get(options, 'params')), options);
					}),
				}))));
				
				

				//=====================================================
				// Complete implementations
				//=====================================================
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.InputStream.$extend(
									ioMixIns.TextInputStream,
				{
					$TYPE_NAME: 'TextInput',
				})));
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextInput.$extend(
				{
					$TYPE_NAME: 'KeyboardInput',
				})));

				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.OutputStream.$extend(
									ioMixIns.TextOutputStream,
				{
					$TYPE_NAME: 'TextOutput',
				})));
				

				//=====================================================
				// Stream objects
				//=====================================================
				
				io.REGISTER(doodad.BASE(doodad.Object.$extend(
									ioMixIns.Stream,
				{
					$TYPE_NAME: 'Stream',
				})));

				io.REGISTER(doodad.BASE(io.Stream.$extend(
									ioMixIns.InputStream,
				{
					$TYPE_NAME: 'InputStream',
				})));
				
				io.REGISTER(doodad.BASE(io.Stream.$extend(
									ioMixIns.OutputStream,
				{
					$TYPE_NAME: 'OutputStream',
				})));
				
				io.REGISTER(doodad.BASE(io.InputStream.$extend(
									ioMixIns.TextInput,
				{
					$TYPE_NAME: 'TextInputStream',
				})));

				io.REGISTER(io.OutputStream.$extend(
									ioMixIns.TextOutput,
				{
					$TYPE_NAME: 'TextOutputStream',
				}));
				
				io.REGISTER(io.TextOutputStream.$extend(
									ioMixIns.NestedStream,
				{
					$TYPE_NAME: 'HtmlOutputStream',
					
					__tags: doodad.PROTECTED(null),
					
					$__bufferTypes: doodad.TYPE(doodad.ATTRIBUTE({
						Deleted: -1,
						Html: 0,
						Open: 1,
						Close: 2,
						Stream: 3,
						Flush: 4,
					}, extenders.ExtendObject, {maxDepth: 0})),

					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						var printTag = types.getDefault(this.options, 'printTag', 'div'),
							identStr = types.getDefault(this.options, 'identStr', '\t');
						
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(printTag) || types.isString(printTag), "Invalid print tag name.");
							root.DD_ASSERT(types.isNothing(identStr) || types.isString(identStr), "Invalid print tag name.");
						};
						
						this.__tags = [];
					}),
					
					__pushInternal: doodad.OVERRIDE(function __pushInternal(data, /*optional*/options) {
						var next = types.get(options, 'next', false),
							buffer = this.__buffer;

						var value = (data.raw !== io.EOF) && data.valueOf();
						var newData = null;

						if (types.isString(value)) {
							var cls = types.getType(this),
								bufferTypes = cls.$__bufferTypes;
							
							if (next) {
								var firstItem = buffer[0],
									itemValue = firstItem && firstItem.valueOf();
									
								if (!firstItem || (itemValue[0] !== bufferTypes.Html)) {
									newData = {raw: [bufferTypes.Html, value, false], options: data.options, valueOf: function() {return this.raw}};
								} else {
									itemValue[1] = value + firstItem[1];
								};
							} else {
								var lastItem = buffer[buffer.length - 1],
									itemValue = lastItem && lastItem.valueOf();
									
								if (!lastItem || (itemValue[0] !== bufferTypes.Html)) {
									newData = {raw: [bufferTypes.Html, value, false], options: data.options, valueOf: function() {return this.raw}};
								} else {
									itemValue[1] += value;
								};
							};
						} else {
							newData = data;
						};

						if (newData) {
							this._super(newData, options);
						} else {
							this.__consumeData(data);

							this.overrideSuper();
						};
					}),

					print: doodad.REPLACE(function print(text, /*optional*/options) {
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isString(text), "Invalid text.");
							root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						};
						
						var attrs = types.get(options, 'attrs', null);
						
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(attrs) || types.isString(attrs), "Invalid attributes.");
						
						var html = ('<' + this.options.printTag);

						if (attrs) {
							html += (' ' + tools.trim(attrs));
						};
						
						html += ('>' + tools.escapeHtml(tools.format(text, types.get(options, 'params'))) + '</' + this.options.printTag + '>');
						
						this.writeLine(html);
					}),
					
					prepareFlushState: doodad.PROTECTED(function prepareFlushState(options) {
						return {
							html: '',
							flushElement: types.get(options, 'flushElement', false), // boolean
							flushElementChunk: null,
							bufferTypes: types.getType(this).$__bufferTypes,
							ignoreClose: false,
							identCount: 0,
							identIncrement: 0,
							idented: false,
						};
					}),
					
					handleBufferData: doodad.PROTECTED(doodad.JS_METHOD(function handleBufferData(data, state) {
						data = data.valueOf();
						
						var type = data[0],
							html = null;
						
						if (type === state.bufferTypes.Html) {
							html = data[1];
							state.idented = data[2];
						} else if (type === state.bufferTypes.Open) {
							var attrs = data[2];
							if (attrs) {
								attrs = tools.trim(attrs);
							};
							if (attrs && attrs.length) {
								html = ('<' + data[1] + ' ' + attrs + '>' + this.options.newLine);
							} else {
								html = ('<' + data[1] + '>' + this.options.newLine);
							};
							state.identIncrement = 1;
						} else if (type === state.bufferTypes.Close) {
							root.DD_ASSERT && root.DD_ASSERT(!state.flushElement, "Element not opened.");
							if (state.ignoreClose) {
								state.ignoreClose = false;
							} else {
								html = ('</' + data[1] + '>' + this.options.newLine);
							};
							state.identIncrement = -1;
						} else if (type === state.bufferTypes.Stream) {
							var stream = data[1];
							state.idented = stream.options.identLines;
							stream.flush();
							stream.onData.detach(this);
							html = this.handleBufferData(data, state);
						} else if (type === state.bufferTypes.Flush) {
							state.ignoreClose = true;
						};
						
						return html;
					})),
					
					flush: doodad.OVERRIDE(function flush(/*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						
						var state = this.prepareFlushState(options),
							buffer = this.__buffer,
							bufferStart = 0,
							bufferLen = buffer.length,
							identLines = types.get(options, 'identLines', false), // boolean
							identStr = this.options.identStr,
							identSpace,
							lines,
							linesLen,
							line,
							data,
							type;
							
						if (state.flushElement) {
							// NOTE: This will shrink the buffer
							state.identCount = this.__tags.length - 1;
							bufferStart = bufferLen;
							var closed = 0;
							// Get first, not closed, "Open" chunk
							for (var i = bufferLen - 1; i >= 0; i--) {
								data = buffer[i].valueOf();
								type = data[0];
								if (type === state.bufferTypes.Close) {
									closed++;
								} else if (type === state.bufferTypes.Open) {
									if (closed) {
										closed--;
									} else {
										bufferStart = i;
										break;
									};
								};
							};
							state.flushElementChunk = [state.bufferTypes.Flush, null];
						} else {
							root.DD_ASSERT && root.DD_ASSERT((this.__tags.length === 0), "Some elements have not been closed.");
						};
						
						for (var i = bufferStart; i < bufferLen; i++) {
							var html = this.handleBufferData(buffer[i], state);
							
							if (html) {
								root.DD_ASSERT && root.DD_ASSERT(types.isString(html), "Invalid html.");
								
								if (state.idented) {
									state.idented = false;
									state.html += html;
								} else if (identLines && identStr) {
									if (state.identIncrement < 0) {
										state.identCount--;
										state.identIncrement = 0;
									};
									lines = html.split(this.options.newLine);
									identSpace = tools.repeat(identStr, state.identCount);
									linesLen = lines.length;
									for (var j = 0; j < linesLen; j++) {
										line = tools.trim(lines[j], identStr);
										if (line.length) {
											state.html += (identSpace + line + this.options.newLine);
										};
									};
									if (state.identIncrement > 0) {
										state.identCount++;
										state.identIncrement = 0;
									};
								} else {
									state.html += html;
								};
							};
						};
						
						if (state.flushElementChunk && (bufferStart < bufferLen)) {
							// Replace everything after the "Open" chunk by the "Flush" chunk.
							state.flushElementChunk[1] = state.html;
							buffer.splice(bufferStart + 1, buffer.length - bufferStart - 1, {raw: state.flushElementChunk, valueOf: function (){return this.raw;}});

							var callback = types.get(options, 'callback');
							if (callback) {
								callback();
							};
							
							this.onFlush();

							this.overrideSuper();
							
						} else {
							this._super(options);
						};
					}),
					
					__streamOnData: doodad.PROTECTED(function __streamOnData(ev) {
						if (!ev.data.options.flushElement) {
							var cls = types.getType(this),
								bufferTypes = cls.$__bufferTypes,
								streamData = ev.handlerData[0];
								
							if (streamData.raw[0] === bufferTypes.Stream) {
								streamData.raw = [bufferTypes.Html, (ev.data.raw === io.EOF ? '' : ev.data.valueOf()), ev.obj.options.identLines];
							} else {
								streamData.raw[1] += (ev.data.raw === io.EOF ? '' : ev.data.valueOf());
							};
						};
					}),
					
					openStream: doodad.OVERRIDE(function openStream(/*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						
						options = types.extend({}, this.options, options);
						
						var tag = types.get(options, 'tag', null),
							attrs = types.get(options, 'attrs', null);
						
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isStringAndNotEmptyTrim(tag), "Invalid tag.");
							root.DD_ASSERT(types.isNothing(attrs) || types.isString(attrs), "Invalid attributes.");
						};

						var cls = types.getType(this),
							bufferTypes = cls.$__bufferTypes,
							stream = cls.$createInstance(options);
							
						var noOpenClose = types.get(options, 'noOpenClose', false);
						
						// TODO: Transform
						!noOpenClose && this.push({raw: [bufferTypes.Open, tag, attrs], valueOf: function() {return this.raw;}});

						// TODO: Transform
						var streamData = {raw: [bufferTypes.Stream, stream], valueOf: function() {return this.raw;}};
						this.push(streamData, pushOpts); // <--- Will get replaced on flush

						// TODO: Transform
						!noOpenClose && this.push({raw: [bufferTypes.Close, tag], valueOf: function() {return this.raw;}});
						
						stream.onData.attach(this, this.__streamOnData, 50, [streamData]);

						return stream;
					}),
					
					openElement: doodad.PUBLIC(function openElement(/*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						
						options = types.extend({}, this.options, options);

						var tag = types.get(options, 'tag', null),
							attrs = types.get(options, 'attrs', null);
						
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isStringAndNotEmptyTrim(tag), "Invalid tag.");
							root.DD_ASSERT(types.isNothing(attrs) || types.isString(attrs), "Invalid attributes.");
						};

						this.__tags.push([tag]);
						
						var cls = types.getType(this),
							bufferTypes = cls.$__bufferTypes;
						
						// TODO: Transform
						this.push({raw: [bufferTypes.Open, tag, attrs], valueOf: function() {return this.raw;}});
					}),
					
					closeElement: doodad.PUBLIC(function closeElement() {
						var tags = this.__tags;
						
						root.DD_ASSERT && root.DD_ASSERT((tags.length > 0), "No more elements opened.");
						
						var cls = types.getType(this),
							bufferTypes = cls.$__bufferTypes;
						
						// TODO: Transform
						this.push({raw: [bufferTypes.Close, tags.pop()[0]], valueOf: function() {return this.raw;}});
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.__tags = [];
					}),
				}));

				io.REGISTER(io.TextOutputStream.$extend(
									ioInterfaces.IConsole,
				{
					$TYPE_NAME: 'ConsoleOutputStream',
					
					__fn: doodad.PROTECTED(null),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						var name = types.get(this.options, 'name');
						
						if ((name === 'info') && global.console.info) {
							this.__fn = 'info';
						} else if ((name === 'warn') && global.console.warn) {
							this.__fn = 'warn';
						} else if ((name === 'error') && global.console.error) {
							this.__fn = 'error';
						} else if ((name === 'error') && global.console.exception) {
							this.__fn = 'exception';
						} else {
							this.__fn = 'log';
						};
					}),
					
					onData: doodad.OVERRIDE(function onData(ev) {
						var retval = this._super(ev);

						ev.preventDefault();

						var data = ev.data;
						if (data.raw !== io.EOF) {
							global.console[this.__fn](data.valueOf());
						};

						return retval;
					}),

					// Console hook
					log: doodad.OVERRIDE(ioInterfaces.IConsole, function log(raw, /*optional*/options) {
						if (global.console) {
							//! BEGIN_REMOVE()
								if ((typeof process === 'object') && (typeof module === 'object')) {
									global.console.warn(raw); // force stderr
								} else {
							//! END_REMOVE()
							
							//! IF_UNSET("serverSide")
									global.console.log(raw);
							//! END_IF()
								
							//! BEGIN_REMOVE()
								};
							//! END_REMOVE()
							
							//! IF_SET("serverSide")
								//! INJECT("global.console.warn(raw)") // force stderr
							//! END_IF()
						};
					}),
					info: doodad.OVERRIDE(ioInterfaces.IConsole, function info(raw, /*optional*/options) {
						if (global.console) {
							//! BEGIN_REMOVE()
								if ((typeof process === 'object') && (typeof module === 'object')) {
									global.console.warn(raw); // force stderr
								} else {
							//! END_REMOVE()
							
							//! IF_UNSET("serverSide")
									if (global.console.info) {
										global.console.info(raw);
									} else {
										global.console.log(raw);
									};
							//! END_IF()
								
							//! BEGIN_REMOVE()
								};
							//! END_REMOVE()
							
							//! IF_SET("serverSide")
								//! INJECT("global.console.warn(raw)") // force stderr
							//! END_IF()
						};
					}),
					warn: doodad.OVERRIDE(ioInterfaces.IConsole, function warn(raw, /*optional*/options) {
						if (global.console) {
							if (global.console.warn) {
								global.console.warn(raw);
							} else {
								global.console.log(raw);
							};
						};
					}),
					error: doodad.OVERRIDE(ioInterfaces.IConsole, function error(raw, /*optional*/options) {
						if (global.console) {
							if (global.console.error) {
								global.console.error(raw);
							} else if (global.console.exception) {
								global.console.exception(raw);
							} else {
								global.console.log(raw);
							};
						};
					}),
					
				}));
				
				
				
				io.REGISTER(io.OutputStream.$extend(
				{
					$TYPE_NAME: 'NullOutputStream',
					
					onData: doodad.OVERRIDE(function onData(ev) {
						ev.preventDefault();
						return this._super(ev);
					}),
				}));
				
				
				
				io.ADD('setStds', function setStds(stds) {
					if (types.has(stds, 'stdin')) {
						doodad.ASSERT && doodad.ASSERT(types._implements(stds.stdin, ioMixIns.InputStream), "");
						__Internal__.stdin = stds.stdin;
					};
					if (types.has(stds, 'stdout')) {
						doodad.ASSERT && doodad.ASSERT(types._implements(stds.stdout, ioMixIns.OutputStream), "");
						__Internal__.stdout = stds.stdout;
					};
					if (types.has(stds, 'stderr')) {
						doodad.ASSERT && doodad.ASSERT(types._implements(stds.stderr, ioMixIns.OutputStream), "");
						__Internal__.stderr = stds.stderr;
					};
					if (!types.hasDefinePropertyEnabled()) {
						io.stdin = __Internal__.stdin;
						io.stdout = __Internal__.stdout;
						io.stderr = __Internal__.stderr;
					};
				});

				if (types.hasDefinePropertyEnabled()) {
					types.defineProperty(io, 'stdin', {
						configurable: true,
						enumerable: true,
						get: function get() {
							return __Internal__.stdin;
						},
					});
					types.defineProperty(io, 'stdout', {
						configurable: true,
						enumerable: true,
						get: function get() {
							return __Internal__.stdout;
						},
					});
					types.defineProperty(io, 'stderr', {
						configurable: true,
						enumerable: true,
						get: function get() {
							return __Internal__.stderr;
						},
					});
				} else {
					io.stdin = null;
					io.stdout = null;
					io.stderr = null;
				};
					
					
				//===================================
				// Init
				//===================================
				return function init(/*optional*/options) {
					// NOTE: Every "std" must be a stream.
					io.setStds({
						stdout: (new io.ConsoleOutputStream({name: 'log', flushMode: 'half', bufferSize: 1024})),
						stderr: (new io.ConsoleOutputStream({name: 'error', flushMode: 'half', bufferSize: 1024})),
					});
					
					_shared.consoleHook = function consoleHook(level, message) {
						// NOTE: Every "std" must be a stream.
						if (types._implements(io.stderr, ioInterfaces.IConsole)) {
							var _interface = io.stderr.getInterface(ioInterfaces.IConsole);
							var fn;
							if (level === tools.LogLevels.Info) {
								fn = 'info';
							} else if (level === tools.LogLevels.Warning) {
								fn = 'warn';
							} else if (level === tools.LogLevels.Error) {
								fn = 'error';
							} else {
								fn = 'log';
							};
							_interface[fn](message);
						} else if (types._implements(io.stderr, ioMixIns.TextOutput)) {
							io.stderr.writeLine(message);
						} else if (types._implements(io.stderr, ioMixIns.OutputStream)) {
							io.stderr.write(message);
						};
					};
				};
			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()