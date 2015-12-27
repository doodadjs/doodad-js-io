//! REPLACE_BY("// Copyright 2015 Claude Petit, licensed under Apache License version 2.0\n")
// dOOdad - Object-oriented programming framework with some extras
// File: IO.js - IO tools
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

	var exports = {};
	if (global.process) {
		module.exports = exports;
	};
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.IO'] = {
			type: null,
			version: '0b',
			namespaces: ['MixIns', 'Interfaces'],
			dependencies: ['Doodad'],

			create: function create(root, /*optional*/_options) {
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
					
					

				io.REGISTER(types.SINGLETON(doodad.Class.$extend(
				{
					$TYPE_NAME: 'EOF',

					toString: function toString() {
						return null;
					},
				})));
				
					
				
				ioMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
									mixIns.Creatable,
									mixIns.Events,
				{
					$TYPE_NAME: 'Stream',

					options: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					onError: doodad.ERROR_EVENT(), // function onError(ev)
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super();
						
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						
						if (!options) {
							options = {};
						};
						
						this.setAttribute('options', options);
					}),
					
					reset: doodad.PUBLIC(doodad.MUST_OVERRIDE()),
					clear: doodad.PUBLIC(doodad.MUST_OVERRIDE()),
					
					__pipeOnReady: doodad.PROTECTED(function __pipeOnReady(ev) {
						var stream = ev.handlerData[0],
							transform = ev.handlerData[1],
							data = ev.data.raw;
						if (transform) {
							var retval = transform(ev.data);
							if (retval !== undefined) {
								data = retval;
							};
						};
						stream.write(data, ev.data.options);
						ev.preventDefault();
					}),
						
					__pipeOnFlush: doodad.PROTECTED(function __pipeOnFlush(ev) {
						var stream = ev.handlerData[0];
						stream.flush(ev.data.options);
					}),
						
					pipe: doodad.PUBLIC(function pipe(stream, /*optional*/transform) {
						// TODO: Pipe to NodeJS streams directly
						root.DD_ASSERT && root.DD_ASSERT(types._implements(stream, ioMixIns.OutputStream));
						if (types._implements(this, ioMixIns.ReadStream)) {
							this.onReady.attach(this, this.__pipeOnReady, null, [stream, transform]);
						} else if (types._implements(this, ioMixIns.OutputStream)) {
							this.onWrite.attach(this, this.__pipeOnReady, null, [stream, transform]);
							this.onFlush.attach(this, this.__pipeOnFlush, null, [stream]);
						};
						if (types._implements(this, ioInterfaces.Listener)) {
							this.listen();
						};
					}),
					
					unpipe: doodad.PUBLIC(function unpipe(/*optional*/stream) {
						if (types._implements(this, ioInterfaces.Listener)) {
							this.stopListening();
						};
						if (stream) {
							if (types._implements(this, ioMixIns.ReadStream)) {
								this.onReady.detach(this, this.__pipeOnReady, [stream]);
							} else if (types._implements(this, ioMixIns.OutputStream)) {
								this.onWrite.attach(this, this.__pipeOnReady, [stream]);
								this.onFlush.detach(this, this.__pipeOnFlush, [stream]);
							};
						} else {
							if (types._implements(this, ioMixIns.ReadStream)) {
								this.onReady.detach(this, this.__pipeOnReady);
							} else if (types._implements(this, ioMixIns.OutputStream)) {
								this.onWrite.attach(this, this.__pipeOnReady);
								this.onFlush.detach(this, this.__pipeOnFlush);
							};
						};
					}),
				})));
					
				io.REGISTER(doodad.BASE(doodad.Object.$extend(
									ioMixIns.Stream,
				{
					$TYPE_NAME: 'Stream',
				})));
				
				
				ioInterfaces.REGISTER(doodad.INTERFACE(doodad.Class.$extend(
				{
					$TYPE_NAME: 'Listener',

					listen: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					stopListening: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
				})));
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
									ioInterfaces.Listener,
				{
					$TYPE_NAME: 'InputStream',

					onReady: doodad.EVENT(false), // function onReady(ev)

					create: doodad.OVERRIDE(function create(/*paramarray*/) {
						this._super.apply(this, arguments);
						
						var bufferSize = types.getDefault(this.options, 'bufferSize', 1024);

						root.DD_ASSERT && root.DD_ASSERT(types.isInteger(bufferSize), "Invalid buffer size.");
					}),
						
					// Raw
					read: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					getCount: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
				})));
					
				io.REGISTER(doodad.BASE(io.Stream.$extend(
									ioMixIns.InputStream,
				{
					$TYPE_NAME: 'InputStream',
				})));
				
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.InputStream.$extend(
				{
					$TYPE_NAME: 'TextInput',
					
					__lineBuffer: doodad.PROTECTED(null),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);

						var newLine = types.getDefault(this.options, 'newLine', '\n');
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(newLine) || types.isString(newLine), "Invalid new line string.");
						};
						
						this.__lineBuffer = "";
					}),
					
					// Non-formatted text
					readText: doodad.PUBLIC(function readText(/*optional*/options) {
						return tools.reduce(this.read(options), function(result, data) {
							return result + data.text;
						}, "");
					}),

					// Non-formatted text + newline
					readLine: doodad.PUBLIC(function readLine(/*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");

						options = types.extend({}, this.options, options);
							
						if (this.options.newLine) {
							var str,
								line = this.__lineBuffer,
								index;
							
							options.offset = (types.isNothing(options.offset) ? 0 : options.offset);
							options.count = Math.max((types.isNothing(options.count) ? 0 : options.count), this.options.newLine.length);
							
							while (str = this.readText(options)) {
								options.offset += str.length;
								line += str;
								index = tools.search(line, this.options.newLine);
								if (index >= 0) {
									this.__lineBuffer = line.slice(index + this.options.newLine.length);
									return line.slice(0, index);
								} else {
									this.__lineBuffer += str;
								};
							};
						};
						
						return null;
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this._super();
						this.__lineBuffer = "";
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						this.__lineBuffer = "";
					}),
				})));
				
				
				
				io.REGISTER(doodad.BASE(io.InputStream.$extend(
									ioMixIns.TextInput,
				{
					$TYPE_NAME: 'TextInputStream',
				})));
				

				
				io.KeyboardFunctionKeys = {
					Shift: 1,
					Ctrl: 2,
					Alt: 4,
					Meta: 8,
				};
				
				// Source: http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
				io.KeyboardScanCodes = {
					Backspace: 8,
					Tab: 9,
					Enter: 13,
					Shift: 16,
					Ctrl: 17,
					Alt: 18,
					PauseBreak: 19,
					CapsLock: 20,
					Escape: 27,
					PageUp: 33,
					PageDown: 34,
					End: 35,
					Home: 36,
					LeftArrow: 37,
					UpArrow: 38,
					RightArrow: 39,
					DownArrow: 40,
					Insert: 45,
					Delete: 46,
					Zero: 48,
					One: 49,
					Two: 50,
					Three: 51,
					Four: 52,
					Five: 53,
					Six: 54,
					Seven: 55,
					Eight: 56,
					Nine: 57,
					A: 65,
					B: 66,
					C: 67,
					D: 68,
					E: 69,
					F: 70,
					G: 71,
					H: 72,
					I: 73,
					J: 74,
					K: 75,
					L: 76,
					M: 77,
					N: 78,
					O: 79,
					P: 80,
					Q: 81,
					R: 82,
					S: 83,
					T: 84,
					U: 85,
					V: 86,
					W: 87,
					X: 88,
					Y: 89,
					Z: 90,
					LeftWindow: 91,
					RightWindow: 92,
					Select: 93,
					Numpad0: 96,
					Numpad1: 97,
					Numpad2: 98,
					Numpad3: 99,
					Numpad4: 100,
					Numpad5: 101,
					Numpad6: 102,
					Numpad7: 103,
					Numpad8: 104,
					Numpad9: 105,
					Multiply: 106,
					Add: 107,
					Subtract: 109,
					DecimalPoint: 110,
					Divide: 111,
					F1: 112,
					F2: 113,
					F3: 114,
					F4: 115,
					F5: 116,
					F6: 117,
					F7: 118,
					F8: 119,
					F9: 120,
					F10: 121,
					F11: 122,
					F12: 123,
					NumLock: 144,
					ScrollLock: 145,
					SemiColon: 186,
					EqualSign: 187,
					Comma: 188,
					Dash: 189,
					Period: 190,
					ForwardSlash: 191,
					GraveAccent: 192,
					OpenBracket: 219,
					BackSlash: 220,
					CloseBraket: 221,
					SingleQuote: 222,
				};
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextInput.$extend(
				{
					$TYPE_NAME: 'KeyboardInput',
				})));
					
				
				
				
				ioMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
									mixIns.Events,
									mixIns.Creatable,
				{
					$TYPE_NAME: 'OutputStream',

					onWrite: doodad.EVENT(false),
					onFlush: doodad.EVENT(false),
					
					create: doodad.OVERRIDE(function create(/*paramarray*/) {
						this._super.apply(this, arguments);

						types.getDefault(this.options, 'autoFlush', false);
						types.getDefault(this.options, 'bufferSize', 1024);
					}),
					destroy: doodad.OVERRIDE(function destroy() {
						this.flush();
						this._super();
					}),

					write: doodad.PUBLIC(doodad.MUST_OVERRIDE()), //function write(raw, /*optional*/options)
					flush: doodad.PUBLIC(doodad.MUST_OVERRIDE()), //function(/*optional*/options)
				})));
					
				io.REGISTER(doodad.BASE(io.Stream.$extend(
									ioMixIns.OutputStream,
				{
					$TYPE_NAME: 'OutputStream',
				})));



				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
				{
					$TYPE_NAME: 'NestedStream',

					openStream: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function openStream(/*optional*/options)
				})));
				
				
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.OutputStream.$extend(
				{
					$TYPE_NAME: 'TextOutput',
					
					create: doodad.BEFORE(io.Stream, doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						var newLine = types.getDefault(this.options, 'newLine', tools.getOS().newLine);
						
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(newLine) || types.isString(newLine), "Invalid new line string.");
					})),
					
					onWrite: doodad.OVERRIDE(function(ev) {
						ev.data.text = types.toString(ev.data.raw);
						return this._super(ev);
					}),
					
					// Non-formatted text
					writeText: doodad.PUBLIC(function writeText(text, /*optional*/options) {
						this.write(text, options);
					}),
					
					// Non-formatted text + newline
					writeLine: doodad.PUBLIC(function writeLine(text, /*optional*/options) {
						if (types.isNothing(text)) {
							text = '';
						};
						this.writeText(text + this.options.newLine, options);
					}),
					
					// Formatted text + newline
					print: doodad.PUBLIC(function print(text, /*optional*/options) {
						this.writeLine(text, options);
					}),
				}))));
				
				io.REGISTER(doodad.BASE(io.OutputStream.$extend(
									ioMixIns.TextOutput,
				{
					$TYPE_NAME: 'TextOutputStream',
				})));
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextOutput.$extend(
									ioMixIns.NestedStream,
				{
					$TYPE_NAME: 'HtmlOutput',
					
					__buffer: doodad.PROTECTED(null),
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
						
						this.__buffer = [];
						this.__tags = [];
					}),
					
					write: doodad.OVERRIDE(function write(html, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isString(html), "Invalid html.");
						
						var buffer = this.__buffer;

						var write = function write() {
							var bufferLen = buffer.length,
								last = bufferLen - 1,
								data = buffer[last],
								htmlType = types.getType(this).$__bufferTypes.Html;
								
							if (!data || (data[0] !== htmlType)) {
								buffer[bufferLen] = [htmlType, html, false];
							} else {
								data[1] += html;
							};
							
							this.onWrite(new doodad.Event({
								raw: html,
								options: options,
							}));
						};

						var bufferSize = this.options.bufferSize;
						if (buffer.length < bufferSize) {
							write.apply(this);
							write = null;
						};
						if (buffer.length >= bufferSize) {
							if (this.options.autoFlush) {
								this.flush(types.extend({}, options, {flushElement: true}));
								if (this.__buffer.length > bufferSize) {
									throw new types.BufferOverflow();
								} else {
									write && write.apply(this);
								};
							} else {
								throw new types.BufferOverflow();
							};
						};
					}),
					print: doodad.REPLACE(function print(text, /*optional*/options) {
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isString(text), "Invalid text.");
							root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						};
						
						options = types.extend({}, this.options, options);

						var attrs = types.get(options, 'attrs', null);
						
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(attrs) || types.isString(attrs), "Invalid attributes.");
						
						var html;
						
						if (attrs) {
							html = ('<' + this.options.printTag + ' ' + attrs.trim());
						} else {
							html = ('<' + this.options.printTag);
						};
						
						html += ('>' + tools.escapeHtml(text) + '</' + this.options.printTag + '>');
						
						this.writeLine(html);
					}),
					prepareFlushState: doodad.PROTECTED(function prepareFlushState(options) {
						return {
							html: '',
							buffer: this.__buffer,
							newLine: options.newLine,
							flushElement: types.get(options, 'flushElement', false), // boolean
							flushElementChunk: null,
							bufferTypes: types.getType(this).$__bufferTypes,
							ignoreClose: false,
							identCount: 0,
							identIncrement: 0,
							idented: false,
						};
					}),
					handleBufferData: doodad.PROTECTED(doodad.JS_METHOD(function handleBufferData(bufferIndex, state) {
						var data = state.buffer[bufferIndex],
							type = data[0];
						
						if (type === state.bufferTypes.Html) {
							data = data[1];
							state.idented = data[2];
						} else if (type === state.bufferTypes.Open) {
							var attrs = data[2];
							if (attrs) {
								attrs = attrs.trim();
							};
							if (attrs && attrs.length) {
								data = ('<' + data[1] + ' ' + attrs + '>' + state.newLine);
							} else {
								data = ('<' + data[1] + '>' + state.newLine);
							};
							state.identIncrement = 1;
						} else if (type === state.bufferTypes.Close) {
							root.DD_ASSERT && root.DD_ASSERT(!state.flushElement, "Element not opened.");
							if (state.ignoreClose) {
								state.ignoreClose = false;
								data = null;
							} else {
								data = ('</' + data[1] + '>' + state.newLine);
							};
							state.identIncrement = -1;
						} else if (type === state.bufferTypes.Stream) {
							data = data[1];
							state.idented = data.options.identLines;
							data.flush();
							data = this.handleBufferData(bufferIndex, state);
						} else if (type === state.bufferTypes.Flush) {
							state.ignoreClose = true;
							data = null;
						} else {
							data = null;
						};
						
						return data;
					})),
					flush: doodad.OVERRIDE(function flush(/*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						
						options = types.extend({}, this.options, options);
						
						var state = this.prepareFlushState(options),
							bufferStart = 0,
							bufferLen = state.buffer.length,
							identLines = types.getDefault(options, 'identLines', false), // boolean
							identStr = types.getDefault(options, 'identStr', '\t'),
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
								data = state.buffer[i];
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
							data = this.handleBufferData(i, state);
							
							if (data) {
								root.DD_ASSERT && root.DD_ASSERT(types.isString(data), "Invalid data.");
								
								if (data.length) {
									if (state.idented) {
										state.idented = false;
										state.html += data;
									} else if (identLines) {
										if (state.identIncrement < 0) {
											state.identCount--;
											state.identIncrement = 0;
										};
										lines = data.split(state.newLine);
										identSpace = tools.repeat(identStr, state.identCount);
										linesLen = lines.length;
										for (var j = 0; j < linesLen; j++) {
											line = lines[j].trim(identStr);
											if (line.length) {
												state.html += (identSpace + line + state.newLine);
											};
										};
										if (state.identIncrement > 0) {
											state.identCount++;
											state.identIncrement = 0;
										};
									} else {
										state.html += data;
									};
								};
							};
						};
						
						if (state.flushElementChunk) {
							if (bufferStart < bufferLen) {
								// Replace everything after the "Open" chunk by the "Flush" chunk.
								state.flushElementChunk[1] = state.html;
								state.buffer.splice(bufferStart + 1, state.buffer.length - bufferStart - 1, state.flushElementChunk);
							};
						} else {
							this.__buffer = [];
						};
						
						this.onFlush(new doodad.Event({
							options: options,
						}));
					}),
					__streamOnFlushHandler: doodad.PROTECTED(function streamOnFlushHandler(ev) {
						var data = ev.data;
						
						if (!data.options.flushElement) {
							var buffer = ev.handlerData[0],
								bufferIndex = ev.handlerData[1];
								
							buffer[bufferIndex] = [types.getType(this).$__bufferTypes.Html, data.text, ev.obj.options.identLines];
							
							ev.obj.onFlush.detach(this, this.__streamOnFlushHandler, ev.handlerData);
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
							stream = cls.$createInstance(options),
							buffer = this.__buffer;
							
						stream.onFlush.attach(this, this.__streamOnFlushHandler, 50, [buffer, buffer.length + 1]);
						
						buffer.push(
							/*buffer.length + 0*/ [bufferTypes.Open, tag, attrs],
							/*buffer.length + 1*/ [bufferTypes.Stream, stream],  // <--- Will get replaced on flush
							/*buffer.length + 2*/ [bufferTypes.Close, tag]
						);
						
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
						
						var buffer = this.__buffer;
						buffer[buffer.length] = [types.getType(this).$__bufferTypes.Open, tag, attrs];
					}),
					closeElement: doodad.PUBLIC(function closeElement() {
						var tags = this.__tags;
						
						root.DD_ASSERT && root.DD_ASSERT((tags.length > 0), "No more elements opened.");
						
						var buffer = this.__buffer;
						buffer[buffer.length] = [types.getType(this).$__bufferTypes.Close, tags.pop()[0]];
					}),
					reset: doodad.OVERRIDE(function reset() {
						this.__tags = [];
					}),
					clear: doodad.OVERRIDE(function clear() {
						this.__buffer = [];
					}),
				})));
				

				io.REGISTER(io.TextOutputStream.$extend(
									ioMixIns.HtmlOutput,
				{
					$TYPE_NAME: 'HtmlOutputStream',
				}));



				ioInterfaces.REGISTER(doodad.ISOLATED(doodad.INTERFACE(doodad.Class.$extend(
				{
					$TYPE_NAME: 'IConsole',
					
					info: doodad.PUBLIC(doodad.METHOD()), //function info(raw, /*optional*/options)
					warn: doodad.PUBLIC(doodad.METHOD()), //function warn(raw, /*optional*/options)
					error: doodad.PUBLIC(doodad.METHOD()), //function error(raw, /*optional*/options)
					exception: doodad.PUBLIC(doodad.METHOD()), //function exception(raw, /*optional*/options)
					log: doodad.PUBLIC(doodad.METHOD()), //function log(raw, /*optional*/options)
				}))));
				
				io.REGISTER(io.OutputStream.$extend(
										ioInterfaces.IConsole,
				{
					$TYPE_NAME: 'ConsoleOutputStream',
					
					__fn: doodad.PROTECTED(null),
					__buffer: doodad.PROTECTED(null),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						var name = types.get(this.options, 'name', 'log');
						
						root.DD_ASSERT && root.DD_ASSERT(types.isString(name) && (tools.findItem(['log', 'debug', 'error', '_exception', 'info', 'warn'], name) !== null), "Invalid name.");

						this.__fn = global.console[name];
						
						this.__buffer = [];
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this.__buffer = [];
					}),
					clear: doodad.OVERRIDE(function reset() {
						this.__buffer = [];
					}),
					
					write: doodad.OVERRIDE(function write(raw, /*optional*/options) {
						var buffer = this.__buffer;
						
						var write = function write() {
							buffer.push({
								raw : raw,
								text: (raw + ''),
							});
							this.onWrite(new doodad.Event({
								raw: raw,
								options: options,
							}));
						};

						var bufferSize = this.options.bufferSize;
						if (buffer.length < bufferSize) {
							write.apply(this);
							write = null;
						};
						if (buffer.length >= bufferSize) {
							if (this.options.autoFlush) {
								this.flush(options);
								if (this.__buffer.length > bufferSize) {
									throw new types.BufferOverflow();
								} else {
									write && write.apply(this);
								};
							} else {
								throw new types.BufferOverflow();
							};
						};
					}),
					
					flush: doodad.OVERRIDE(function(/*optional*/options) {
						var data;
						var buffer = this.__buffer;
						while (data = buffer.shift()) {
							// <PRB> Chrome requires the context of "console"
							//this.__fn(raw);
							//??? this.__fn.call(global.console, raw);
							this.__fn.call(console, data.text);
						};
						
						this.onFlush(new doodad.Event({
							options: options,
						}));
					}),
					
					// Console hook
					log: doodad.OVERRIDE(ioInterfaces.IConsole, function log(raw, /*optional*/options) {
						var fn = console.log;
						fn.call(console, raw);
					}),
					info: doodad.OVERRIDE(ioInterfaces.IConsole, function info(raw, /*optional*/options) {
						var fn = (console.info || console.log);
						fn.call(console, raw);
					}),
					warn: doodad.OVERRIDE(ioInterfaces.IConsole, function warn(raw, /*optional*/options) {
						var fn = (console.warn || console.log);
						fn.call(console, raw);
					}),
					error: doodad.OVERRIDE(ioInterfaces.IConsole, function error(raw, /*optional*/options) {
						var fn = (console.error || console.exception || console.log);
						fn.call(console, raw);
					}),
					exception: doodad.OVERRIDE(ioInterfaces.IConsole, function exception(raw, /*optional*/options) {
						var fn = (console.exception || console.error || console.log);
						fn.call(console, raw);
					}),
					
				}));
				
				
				
				io.setStds = function setStds(stds) {
					if (types.hasKey(stds, 'stdin')) {
						doodad.ASSERT && doodad.ASSERT(types._implements(stds.stdin, ioMixIns.InputStream), "");
						__Internal__.stdin = stds.stdin;
					};
					if (types.hasKey(stds, 'stdout')) {
						doodad.ASSERT && doodad.ASSERT(types._implements(stds.stdout, ioMixIns.OutputStream), "");
						__Internal__.stdout = stds.stdout;
					};
					if (types.hasKey(stds, 'stderr')) {
						doodad.ASSERT && doodad.ASSERT(types._implements(stds.stderr, ioMixIns.OutputStream), "");
						__Internal__.stderr = stds.stderr;
					};
					if (!types.hasDefinePropertyEnabled()) {
						io.stdin = __Internal__.stdin;
						io.stdout = __Internal__.stdout;
						io.stderr = __Internal__.stderr;
					};
				};

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
					
				return function init(/*optional*/options) {
					// NOTE: Every "std" must be a stream.
					io.setStds({
						stdout: (new io.ConsoleOutputStream({name: 'log', autoFlush: true, bufferSize: 1})),
						stderr: (new io.ConsoleOutputStream({name: 'error', autoFlush: true, bufferSize: 1})),
					});
					
					tools.options.hooks.console = function consoleHook(fn, message) {
						// NOTE: Every "std" must be a stream. For output to a widget (by example), replace this hook by another.
						if (types._implements(io.stderr, ioInterfaces.IConsole)) {
							var _interface = io.stderr.getInterface(ioInterfaces.IConsole);
							fn = _interface[fn];
							fn.call(_interface, message);
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
	};
	
	if (!global.process) {
		// <PRB> export/import are not yet supported in browsers
		global.DD_MODULES = exports.add(global.DD_MODULES);
	};
})();