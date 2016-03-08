//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n")
// dOOdad - Object-oriented programming framework
// File: IO.js - IO tools
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
		DD_MODULES['Doodad.IO'] = {
			type: null,
			version: '0.4.0d',
			namespaces: ['MixIns', 'Interfaces'],
			dependencies: [
				{
					name: 'Doodad',
					version: '2.0.0',
				}, 
			],

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

					toString: doodad.REPLACE(function toString() {
						return '';
					}),
				})));
				
					
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(doodad.Class.$extend(
				{
					$TYPE_NAME: 'Transformable',
					
					transform: doodad.PUBLIC(function transform(data) {
						data.valueOf = function valueOf() {
							return this.raw;
						};
					}),
				}))));
				
				
				ioMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
									mixIns.Creatable,
									mixIns.Events,
									ioMixIns.Transformable,
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
						
						types.setAttribute(this, 'options', options);
					}),
					
					reset: doodad.PUBLIC(doodad.MUST_OVERRIDE()),
					clear: doodad.PUBLIC(doodad.MUST_OVERRIDE()),
					
					__pipeOnReady: doodad.PROTECTED(function __pipeOnReady(ev) {
						ev.preventDefault();
						
						var stream = ev.handlerData[0],
							transform = ev.handlerData[1],
							data = ev.data;
							
						if (transform) {
							var retval = transform(data);
							if (retval !== undefined) {
								data = retval;
							};
						};

						stream.write(data.valueOf(), data.options);
					}),
					
					__pipeOnFlush: doodad.PROTECTED(function __pipeOnFlush(ev) {
						var stream = ev.handlerData[0],
							options = ev.data.options;
						stream.flush(options);
					}),
						
					pipe: doodad.PUBLIC(function pipe(stream, /*optional*/transform) {
						// TODO: Pipe to NodeJS streams directly
						if (!types._implements(stream, ioMixIns.OutputStream)) {
							throw new types.TypeError("Stream must implement 'Doodad.IO.MixIns.OutputStream'.");
						};
						if (types._implements(this, ioMixIns.InputStream)) {
							this.onReady.attach(this, this.__pipeOnReady, null, [stream, transform]);
						} else if (types._implements(this, ioMixIns.OutputStream)) {
							this.onWrite.attach(this, this.__pipeOnReady, null, [stream, transform]);
						};
						if (types._implements(this, ioMixIns.OutputStream)) {
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
							if (types._implements(this, ioMixIns.InputStream)) {
								this.onReady.detach(this, this.__pipeOnReady, [stream]);
							} else if (types._implements(this, ioMixIns.OutputStream)) {
								this.onWrite.detach(this, this.__pipeOnReady, [stream]);
							};
							if (types._implements(this, ioMixIns.OutputStream)) {
								this.onFlush.detach(this, this.__pipeOnFlush, [stream]);
							};
						} else {
							if (types._implements(this, ioMixIns.InputStream)) {
								this.onReady.detach(this, this.__pipeOnReady);
							} else if (types._implements(this, ioMixIns.OutputStream)) {
								this.onWrite.detach(this, this.__pipeOnReady);
							};
							if (types._implements(this, ioMixIns.OutputStream)) {
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
					
					isListening: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					listen: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					stopListening: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
				})));
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Transformable.$extend(
				{
					$TYPE_NAME: 'TextTransformable',
					
					transform: doodad.REPLACE(function transform(data) {
						data.text = String(data.raw);
						data.valueOf = function valueOf() {
							if (this.raw === io.EOF) {
								return this.raw;
							} else {
								return this.text;
							};
						};
					}),
				})));
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
									ioInterfaces.Listener,
				{
					$TYPE_NAME: 'InputStream',

					onReady: doodad.EVENT(false), // function onReady(ev)

					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						var bufferSize = types.getDefault(this.options, 'bufferSize', 1024);

						root.DD_ASSERT && root.DD_ASSERT(types.isInteger(bufferSize), "Invalid buffer size.");
					}),
					
					// TODO: Implement
					//push: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(raw, /*optional*/options)

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
									ioMixIns.TextTransformable,
				{
					$TYPE_NAME: 'TextInput',
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);

						var newLine = types.getDefault(this.options, 'newLine', '\n');
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(newLine) || types.isString(newLine), "Invalid new line string.");
						};
					}),
					
					// Non-formatted text
					//readText: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					readText: doodad.PUBLIC(function readText(/*optional*/options) {
						throw new types.Error("This function is in need for a complete review.");
						/*
						return tools.reduce(this.read(options), function(result, data) {
							var val = data.valueOf();
							return result + (val === io.EOF ? '' : val);
						}, "");
						*/
					}),

					// Non-formatted text + newline
					// TODO: Review
					//readLine: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					readLine: doodad.PUBLIC(function readLine(/*optional*/options) {
						throw new types.Error("This function is in need for a complete review.");
						/*
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");

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
						*/
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
					
				
				
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
									mixIns.Events,
									mixIns.Creatable,
				{
					$TYPE_NAME: 'OutputStream',

					onWrite: doodad.EVENT(false),
					onFlush: doodad.EVENT(false),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);

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
									ioMixIns.TextTransformable,
				{
					$TYPE_NAME: 'TextOutput',
					
					create: doodad.BEFORE(ioMixIns.OutputStream, doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						var newLine = types.getDefault(this.options, 'newLine', tools.getOS().newLine);
						
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(newLine) || types.isString(newLine), "Invalid new line string.");
					})),
					
					// Non-formatted text
					writeText: doodad.PUBLIC(function writeText(text, /*optional*/options) {
						this.write(String(text), options);
					}),
					
					// Non-formatted text + newline
					writeLine: doodad.PUBLIC(function writeLine(text, /*optional*/options) {
						if (types.isNothing(text)) {
							text = '';
						};
						this.writeText(String(text) + this.options.newLine, options);
					}),
					
					// Formatted text + newline
					print: doodad.PUBLIC(function print(text, /*optional*/options) {
						this.writeLine(tools.format(String(text), types.get(options, 'params')), options);
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
						
						var data = {
							raw : html,
						};
						data = this.transform(data) || data;

						this.onWrite(new doodad.Event(data));
						
						var buffer = this.__buffer,
							htmlType = types.getType(this).$__bufferTypes.Html,
							value = data.valueOf();

						var write = function write() {
							if (value !== io.EOF) {
								var bufferLen = buffer.length,
									lastItem = buffer[bufferLen - 1];
									
								if (!lastItem || (lastItem[0] !== htmlType)) {
									buffer[bufferLen] = [htmlType, value, false];
								} else {
									lastItem[1] += value;
								};
							};
						};

						// TODO: Review
						var bufferSize = this.options.bufferSize,
							callback = types.get(options, 'callback');
							
						if (this.options.autoFlush) {
							write();
							if ((value === io.EOF) || (buffer.length >= bufferSize)) {
								if (value === io.EOF) {
									this.flush({
										callback: function() {
											//if (this.__buffer.length > bufferSize) {
											//	throw new types.BufferOverflow();
											//};
											if (callback) {
												callback();
											};
										},
									});
								} else {
									this.flush({
										flushElement: true,
										callback: function() {
											//if (this.__buffer.length > bufferSize) {
											//	throw new types.BufferOverflow();
											//};
											if (callback) {
												callback();
											};
										},
									});
								};
							} else {
								if (callback) {
									callback();
								};
							};
						} else if (buffer.length < bufferSize) {
							write();
							if (callback) {
								callback();
							};
						} else {
							throw new types.BufferOverflow();
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
						
						var html = ('<' + this.options.printTag);

						if (attrs) {
							html += (' ' + attrs.trim());
						};
						
						html += ('>' + tools.escapeHtml(tools.format(text, types.get(options, 'params'))) + '</' + this.options.printTag + '>');
						
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
						
						var callback = types.get(options, 'callback');
						if (callback) {
							callback();
						};
					}),
					
					__streamOnFlushHandler: doodad.PROTECTED(function streamOnFlushHandler(ev) {
						var data = ev.data;
						
						if (!data.options.flushElement) {
							var buffer = ev.handlerData[0],
								bufferIndex = ev.handlerData[1],
								bufferTypes = types.getType(this).$__bufferTypes,
								value = data.valueOf();
								
							buffer[bufferIndex] = [bufferTypes.Html, (value === io.EOF ? '' : value), ev.obj.options.identLines];
							
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
										ioMixIns.TextTransformable,
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
						var data = {
							raw : raw,
						};
						data = this.transform(data) || data;

						this.onWrite(new doodad.Event(data));
						
						var buffer = this.__buffer,
							bufferSize = this.options.bufferSize,
							callback = types.get(options, 'callback');
							
						if (this.options.autoFlush) {
							buffer.push(data);
							if ((data.valueOf() === io.EOF) || (buffer.length >= bufferSize)) {
								this.flush({
									callback: function() {
										if (callback) {
											callback();
										};
									},
								});
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
					
					flush: doodad.OVERRIDE(function(/*optional*/options) {
						var data;
						var buffer = this.__buffer;
						while (data = buffer.shift()) {
							var value = data.valueOf();
							if (value !== io.EOF) {
								// <PRB> Chrome requires the context of "console"
								//this.__fn(raw);
								//??? this.__fn.call(global.console, value);
								this.__fn.call(console, value);
							};
						};
						
						this.onFlush(new doodad.Event({
							options: options,
						}));
						
						var callback = types.get(options, 'callback');
						if (callback) {
							callback();
						};
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
					
					tools.setOptions({
						hooks: {
							console: function consoleHook(fn, message) {
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
							},
						},
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