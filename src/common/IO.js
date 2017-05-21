//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: IO.js - IO tools
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
		DD_MODULES['Doodad.IO/common'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
			dependencies: [
				'Doodad.IO/root',
			],

			create: function create(root, /*optional*/_options, _shared) {
				"use strict";

				const doodad = root.Doodad,
					mixIns = doodad.MixIns,
					types = doodad.Types,
					tools = doodad.Tools,
					io = doodad.IO,
					ioMixIns = io.MixIns,
					ioInterfaces = io.Interfaces,
					extenders = doodad.Extenders;

					
					
				const __Internal__ = {
					stdin: null,
					stdout: null,
					stderr: null,
				};

				//=========================================
				// Enums
				//=========================================
					
				io.ADD('KeyboardFunctionKeys', types.freezeObject(types.nullObject({
					Shift: 1,
					Ctrl: 2,
					Alt: 4,
					Meta: 8,
				})));
				
				// Source: http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
				io.ADD('KeyboardScanCodes', types.freezeObject(types.nullObject({
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
				})));
				
				//=====================================================
				// Interfaces (continued)
				//=====================================================
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
				{
					$TYPE_NAME: 'NestedStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('NestedStreamMixIn')), true) */,

					openStream: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function openStream(/*optional*/options)
				})));
					
				//=====================================================
				// Basic implementations (continued)
				//=====================================================
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextInputStreamBase.$extend(
									ioMixIns.TextTransformableOut,
				{
					$TYPE_NAME: 'TextInputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextInputStreamMixIn')), true) */,
					
					// Non-formatted text
					readText: doodad.OVERRIDE(function readText(/*optional*/options) {
						// TODO: Test
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");

						let text = '';
						
						let data;
						
						while (data = this.read(options)) {
							text += types.toString(data);
						};
						
						return text || null;
					}),
					
					// Non-formatted text + newline
					readLine: doodad.OVERRIDE(function readLine(/*optional*/options) {
						// TODO: Test
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");

						let line = '';
						
						if (this.options.newLine) {
							let ok = false;
							
							while (this.getCount() > 0) {
								const data = this.pull(options);

								if (data.raw === io.EOF) {
									ok = true;
									break;
								} else {
									const raw = this.transformOut(data, options) || '';
									line += types.toString(raw);
								};

								const index = tools.search(line, this.options.newLine);
								if (index >= 0) {
									const remaining = line.slice(index + this.options.newLine.length);
									line = line.slice(0, index);

									if (remaining) {
										this.push(new io.TextData(remaining), {next: true});
									};

									ok = true;	
									break;
								};
							};
							
							if (!ok && line) {
								this.push(new io.TextData(line), {next: true});
								line = null;
							};
						};
						
						return line || null;
					}),
				})));

				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.TextOutputStreamBase.$extend(
									ioMixIns.TextTransformableIn,
				{
					$TYPE_NAME: 'TextOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextOutputStreamMixInBase')), true) */,
					
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextInputMixIn')), true) */,
				})));
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextInput.$extend(
				{
					$TYPE_NAME: 'KeyboardInput',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('KeyboardInputMixIn')), true) */,
				})));

				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.OutputStream.$extend(
									ioMixIns.TextOutputStream,
				{
					$TYPE_NAME: 'TextOutput',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextOutputMixIn')), true) */,
				})));
				

				//=====================================================
				// Stream objects
				//=====================================================
				
				io.REGISTER(doodad.BASE(doodad.Object.$extend(
									ioMixIns.Stream,
				{
					$TYPE_NAME: 'Stream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('StreamBase')), true) */,
				})));

				io.REGISTER(doodad.BASE(io.Stream.$extend(
									ioMixIns.InputStream,
				{
					$TYPE_NAME: 'InputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('InputStreamBase')), true) */,
				})));
				
				io.REGISTER(doodad.BASE(io.Stream.$extend(
									ioMixIns.BufferedInputStream,
				{
					$TYPE_NAME: 'BufferedInputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedInputStreamBase')), true) */,
				})));
				
				io.REGISTER(doodad.BASE(io.Stream.$extend(
									ioMixIns.OutputStream,
				{
					$TYPE_NAME: 'OutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('OutputStreamBase')), true) */,
				})));
				
				io.REGISTER(doodad.BASE(io.Stream.$extend(
									ioMixIns.BufferedOutputStream,
				{
					$TYPE_NAME: 'BufferedOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedOutputStreamBase')), true) */,
				})));
				
				io.REGISTER(doodad.BASE(io.InputStream.$extend(
									ioMixIns.TextInput,
				{
					$TYPE_NAME: 'TextInputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextInputStreamBase')), true) */,
				})));

				io.REGISTER(doodad.BASE(io.BufferedInputStream.$extend(
									ioMixIns.TextInput,
				{
					$TYPE_NAME: 'BufferedTextInputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedTextInputStreamBase')), true) */,
				})));

				io.REGISTER(doodad.BASE(io.OutputStream.$extend(
									ioMixIns.TextOutput,
				{
					$TYPE_NAME: 'TextOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextOutputStreamBase')), true) */,
				})));
				
				io.REGISTER(doodad.BASE(io.BufferedOutputStream.$extend(
									ioMixIns.TextOutput,
				{
					$TYPE_NAME: 'BufferedTextOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedTextOutputStreamBase')), true) */,
				})));
				


				io.REGISTER(io.BufferedTextOutputStream.$extend(
									ioMixIns.NestedStream,
									ioMixIns.TextTransformableIn,
									ioMixIns.TextTransformableOut,
				{
					$TYPE_NAME: 'HtmlOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('HtmlOutputStream')), true) */,
					
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
						
						this.__tags = [];
					}),
					
					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'printTag', types.getIn(this.options, 'printTag', 'div')),
						types.getDefault(options, 'identStr', types.getIn(this.options, 'identStr', '\t'));
						
						this._super(options);

						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(this.options.printTag) || types.isString(this.options.printTag), "Invalid print tag name.");
							root.DD_ASSERT(types.isNothing(this.options.identStr) || types.isString(this.options.identStr), "Invalid indentation string.");
						};
					}),
					
					__submitInternal: doodad.OVERRIDE(function __submitInternal(data, /*optional*/options) {
						const next = types.get(options, 'next', false),
							buffer = this.__buffer;

						if (types._instanceof(data, io.TextData)) {
							const value = data.toString();

							const cls = types.getType(this),
								bufferTypes = cls.$__bufferTypes;
							
							let newData = null;

							if (next) {
								const firstItem = buffer[0],
									itemValue = firstItem && firstItem.valueOf();
									
								if (!firstItem || (itemValue[0] !== bufferTypes.Html)) {
									newData = new io.Data([bufferTypes.Html, value, false]);
								} else {
									itemValue[1] = value + firstItem[1];
								};
							} else {
								const lastItem = buffer[buffer.length - 1],
									itemValue = lastItem && lastItem.valueOf();
									
								if (!lastItem || (itemValue[0] !== bufferTypes.Html)) {
									newData = new io.Data([bufferTypes.Html, value, false]);
								} else {
									itemValue[1] += value;
								};
							};

							if (newData) {
								newData.attach(this);
								newData.chain(data.consume.bind(data));

								this._super(newData, options);

							} else {
								const callback = types.get(options, 'callback');

								if (callback) {
									data.chain(callback);
								};

								data.consume();

								this.overrideSuper();
							};

						} else {
							this._super(data, options);
						};
					}),

					print: doodad.REPLACE(function print(text, /*optional*/options) {
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isString(text), "Invalid text.");
							root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						};
						
						const attrs = types.get(options, 'attrs', null);
						
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(attrs) || types.isString(attrs), "Invalid attributes.");
						
						let html = ('<' + this.options.printTag);

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
						data = data.raw;
						
						const type = data[0];

						let html = null;
						
						if (type === state.bufferTypes.Html) {
							html = data[1];
							state.idented = data[2];
						} else if (type === state.bufferTypes.Open) {
							let attrs = data[2];
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
							const stream = data[1];
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
						
						const state = this.prepareFlushState(options),
							buffer = this.__buffer,
							bufferLen = buffer.length,
							identLines = types.get(options, 'identLines', false), // boolean
							identStr = this.options.identStr;

						let bufferStart = 0,
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
							let closed = 0;
							// Get first, not closed, "Open" chunk
							for (let i = bufferLen - 1; i >= 0; i--) {
								data = buffer[i].raw;
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
						
						for (let i = bufferStart; i < bufferLen; i++) {
							const html = this.handleBufferData(buffer[i], state);
							
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
									for (let j = 0; j < linesLen; j++) {
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

							const data = new io.Data(state.flushElementChunk);
							data.attach(this);

							const datas = buffer.splice(bufferStart + 1, buffer.length - bufferStart - 1, data);

							tools.forEach(datas, function(dta) {
								dta.consume();
							});

							const callback = types.get(options, 'callback');
							if (callback) {
								callback(null);
							};
							
							this.onFlush();

							this.overrideSuper();
							
						} else {
							this._super(options);
						};
					}),
					
					__streamOnData: doodad.PROTECTED(function __streamOnData(ev) {
						if (!ev.data.options.flushElement) {
							const streamData = ev.handlerData[0];
								
							if (!streamData.consumed) {
								const cls = types.getType(this),
									bufferTypes = cls.$__bufferTypes,
									value = ev.data.toString(),
									streamValue = streamData.raw;

								if (streamValue[0] === bufferTypes.Stream) {
									streamValue[0] = bufferTypes.Html;
									streamValue[1] = value || '';
									streamValue[2] = ev.obj.options.identLines;
								} else {
									streamValue[1] += value || '';
								};
							};
						};
					}),
					
					openStream: doodad.OVERRIDE(function openStream(/*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						
						options = types.extend({}, this.options, options);
						
						const tag = types.get(options, 'tag', null),
							attrs = types.get(options, 'attrs', null);
						
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isStringAndNotEmptyTrim(tag), "Invalid tag.");
							root.DD_ASSERT(types.isNothing(attrs) || types.isString(attrs), "Invalid attributes.");
						};

						const cls = types.getType(this),
							bufferTypes = cls.$__bufferTypes,
							stream = cls.$createInstance(options);
							
						const noOpenClose = types.get(options, 'noOpenClose', false);
						
						!noOpenClose && this.submit(new io.Data([bufferTypes.Open, tag, attrs]));

						const streamData = new io.Data([bufferTypes.Stream, stream]); // <--- Will get replaced on flush

						this.submit(streamData);

						!noOpenClose && this.submit(new io.Data([bufferTypes.Close, tag]));
						
						stream.onData.attach(this, this.__streamOnData, 50, [streamData]);

						return stream;
					}),
					
					openElement: doodad.PUBLIC(function openElement(/*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						
						options = types.extend({}, this.options, options);

						const tag = types.get(options, 'tag', null),
							attrs = types.get(options, 'attrs', null);
						
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isStringAndNotEmptyTrim(tag), "Invalid tag.");
							root.DD_ASSERT(types.isNothing(attrs) || types.isString(attrs), "Invalid attributes.");
						};

						this.__tags.push([tag]);
						
						const cls = types.getType(this),
							bufferTypes = cls.$__bufferTypes;
						
						this.submit(new io.Data([bufferTypes.Open, tag, attrs]));
					}),
					
					closeElement: doodad.PUBLIC(function closeElement() {
						const tags = this.__tags;
						
						root.DD_ASSERT && root.DD_ASSERT((tags.length > 0), "No more elements opened.");
						
						const cls = types.getType(this),
							bufferTypes = cls.$__bufferTypes;
						
						this.submit(new io.Data([bufferTypes.Close, tags.pop()[0]]));
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.__tags = [];
					}),
				}));


				io.REGISTER(io.TextOutputStream.$extend(
									ioInterfaces.IConsole,
									ioMixIns.TextTransformableIn,
									ioMixIns.TextTransformableOut,
				{
					$TYPE_NAME: 'ConsoleOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ConsoleOutputStream')), true) */,
					
					__fn: doodad.PROTECTED(null),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						const name = types.get(this.options, 'name');
						
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

					__submitInternal: doodad.REPLACE(function __submitInternal(data, /*optional*/options) {
						const value = data.valueOf();

						if (!types.isNothing(value)) {
							global.console[this.__fn](value);
						};

						const callback = types.get(options, 'callback');

						if (callback) {
							data.chain(callback);
						};

						data.consume();
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('NullOutputStream')), true) */,
					
					$isValidEncoding: doodad.OVERRIDE(function $isValidEncoding(encoding) {
						return true;
					}),

					onData: doodad.OVERRIDE(function onData(ev) {
						ev.preventDefault();
						return this._super(ev);
					}),

					transformIn: doodad.REPLACE(function transformIn(raw, /*optional*/options) {
						return new io.Data(raw, options);
					}),

					transformOut: doodad.REPLACE(function transformOut(data, /*optional*/options) {
						return null;
					}),
				}));

				
				
				io.REGISTER(io.TextOutputStream.$extend(
									ioMixIns.TextTransformableIn,
									ioMixIns.TextTransformableOut,
				{
					$TYPE_NAME: 'TextDecoderStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextDecoderStreamNodeJs')), true) */,
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
						stdout: (new io.ConsoleOutputStream({name: 'log'})),
						stderr: (new io.ConsoleOutputStream({name: 'error'})),
					});
					
					_shared.consoleHook = function consoleHook(level, message) {
						// NOTE: Every "std" must be a stream.
						if (types._implements(io.stderr, ioInterfaces.IConsole)) {
							const _interface = io.stderr.getInterface(ioInterfaces.IConsole);
							let fn;
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