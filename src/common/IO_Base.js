//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: IO_Baqse.js - IO Base Tools
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
		DD_MODULES['Doodad.IO'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
			namespaces: ['MixIns', 'Interfaces'],

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
				};
					

				io.REGISTER(doodad.Class.$extend(
				{
					$TYPE_NAME: 'Signal',

					toString: doodad.REPLACE(function toString() {
						return '';
					}),
				}));
				
					
				io.REGISTER(types.SINGLETON(io.Signal.$extend(
				{
					$TYPE_NAME: 'BOF',
				})));
				
					
				io.REGISTER(types.SINGLETON(io.Signal.$extend(
				{
					$TYPE_NAME: 'EOF',
				})));
				
					
				//=====================================================
				// Interfaces
				//=====================================================
				
				ioMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
				{
					$TYPE_NAME: 'Transformable',
					
					transform: doodad.PUBLIC(doodad.CALL_FIRST(doodad.RETURNS(types.isJsObject, function transform(data, /*optional*/options) {
						root.ASSERT && root.ASSERT(types.isJsObject(data));
						root.ASSERT && root.ASSERT(types.has(data, 'raw'));

						data.valueOf = function valueOf() {
							if (this.raw instanceof io.Signal) {
								return null;
							} else {
								return this.raw;
							};
						};

						data.options = types.nullObject(options);
						data.consumed = false;
						data.delayed = false;

						this._super(data, options);

						return data;
					}))),
				})));
				
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.Transformable.$extend(
				{
					$TYPE_NAME: 'TextTransformableBase',
					
					$isValidEncoding: doodad.PUBLIC(doodad.TYPE(doodad.MUST_OVERRIDE())),
				}))));
				
				
				ioMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
									mixIns.Events,
				{
					$TYPE_NAME: 'Listener',
					
					onListen: doodad.EVENT(), // function(ev)
					onStopListening: doodad.EVENT(), // function(ev)
					
					isListening: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					listen: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					stopListening: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
				})));
				

				io.KeyboardFunctionKeys = types.freezeObject({
					Shift: 1,
					Ctrl: 2,
					Alt: 4,
					Meta: 8,
				});
				
				// Source: http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
				io.KeyboardScanCodes = types.freezeObject({
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
				});
				
				ioInterfaces.REGISTER(doodad.ISOLATED(doodad.INTERFACE(doodad.Class.$extend(
				{
					$TYPE_NAME: 'IConsole',
					
					info: doodad.PUBLIC(doodad.METHOD()), //function info(raw, /*optional*/options)
					warn: doodad.PUBLIC(doodad.METHOD()), //function warn(raw, /*optional*/options)
					error: doodad.PUBLIC(doodad.METHOD()), //function error(raw, /*optional*/options)
					log: doodad.PUBLIC(doodad.METHOD()), //function log(raw, /*optional*/options)
				}))));
				


				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(doodad.Class.$extend(
									mixIns.Creatable,
									mixIns.Events,
									ioMixIns.Transformable,
				{
					$TYPE_NAME: 'StreamBase',

					options: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					onError: doodad.ERROR_EVENT(), // function onError(ev)
					onData: doodad.EVENT(false), // function(ev)
					onBOF: doodad.EVENT(false), // function(ev)
					onEOF: doodad.EVENT(false), // function(ev)

					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super();
						
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isJsObject(options), "Invalid options.");
						
						_shared.setAttribute(this, 'options', types.nullObject());
						
						if (types.isNothing(options)) {
							this.setOptions({});
						} else {
							this.setOptions(options);
						};

						this.reset();
					}),

					setOptions: doodad.PUBLIC(function setOptions(options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(options), "Invalid options.");

						types.extend(this.options, options);
					}),
					
					reset: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					clear: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					pipe: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(stream, /*optional*/transform)
					unpipe: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/stream)
				}))));
					
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
				{
					$TYPE_NAME: 'BufferedStreamBase',

					onFlush: doodad.EVENT(false), // function(ev)

					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'flushMode', types.getIn(this.options, 'flushMode', 'auto')); // 'auto', 'manual', 'half'
						if (options.flushMode === 'auto') {
							types.getDefault(options, 'bufferSize', 1);
						} else {
							types.getDefault(options, 'bufferSize', 1024);
						};

						types.getDefault(options, 'autoFlushOptions', null);

						this._super(options);
					}),

					clearBuffer: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()

					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.clearBuffer();
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this._super();

						this.clearBuffer();
					}),
					
					getCount: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()

					push: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(data, /*optional*/options)

					pull: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)

					flush: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)

					flushAsync: doodad.PUBLIC(doodad.ASYNC(function flushAsync(/*optional*/options) {
						var Promise = types.getPromise();
						var callback = types.get(options, 'callback');
						return Promise.create(function flushAsyncPromise(resolve, reject) {
							function errorHandler(ev) {
								detach.call(this);
								ev.preventDefault();
								reject(ev.error);
							};
							function detach() {
								this.onError.detach(this, errorHandler);
							};
							this.onError.attachOnce(this, errorHandler);
							this.flush(types.extend({}, options, {callback: doodad.Callback(this, function() {
								detach.call(this);
								callback && callback();
								resolve(this);
							})}));
						}, this);
					})),
				}))));

				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
				{
					$TYPE_NAME: 'TextStreamBase',
					
					setOptions: doodad.OVERRIDE(function setOptions(options) {
						this._super(options);

						var newLine = types.getDefault(this.options, 'newLine', tools.getOS().newLine);
						
						root.DD_ASSERT && root.DD_ASSERT(types.isString(newLine), "Invalid new line string.");
					}),
				})));
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
									ioMixIns.Listener,
				{
					$TYPE_NAME: 'InputStreamBase',

					read: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					readAsync: doodad.PUBLIC(doodad.ASYNC(function readAsync(/*optional*/options) {
						var Promise = types.getPromise();
						var result = this.read(options);
						if (!types.isNothing(result)) {
							return result;
						} else if (this.isListening()) {
							return this.onData.promise()
								.then(function(ev) {
									return this.read(options);
								});
						};
					})),
				}))));
				
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.InputStreamBase.$extend(
									ioMixIns.TextStreamBase,
				{
					$TYPE_NAME: 'TextInputStreamBase',
					
					// Non-formatted text
					readText: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					// Non-formatted text + newline
					readLine: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					readTextAsync: doodad.PUBLIC(doodad.ASYNC(function readTextAsync(/*optional*/options) {
						var Promise = types.getPromise();
						var result = this.readText(options);
						if (!types.isNothing(result)) {
							return result;
						} else if (this.isListening()) {
							return this.onData.promise()
								.then(function(ev) {
									return this.readText(options);
								});
						};
					})),
						
					readLineAsync: doodad.PUBLIC(doodad.ASYNC(function readLineAsync(/*optional*/options) {
						var Promise = types.getPromise();
						var result = this.readLine(options);
						if (!types.isNothing(result)) {
							return result;
						} else if (this.isListening()) {
							return this.onData.promise()
								.then(function(ev) {
									return this.readLine(options);
								});
						};
					})),
				}))));
				
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
				{
					$TYPE_NAME: 'OutputStreamBase',

					onWrite: doodad.EVENT(false),

					canWrite: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function canWrite()

					write: doodad.PUBLIC(doodad.MUST_OVERRIDE()), //function write(raw, /*optional*/options)
					
					writeAsync: doodad.PUBLIC(doodad.ASYNC(function writeAsync(raw, /*optional*/options) {
						var Promise = types.getPromise();
						return Promise.create(function writeAsyncPromise(resolve, reject) {
							function errorHandler(ev) {
								detach.call(this);
								ev.preventDefault();
								reject(ev.error);
							};
							function detach() {
								this.onError.detach(this, errorHandler);
							};
							this.onError.attachOnce(this, errorHandler);
							this.write(raw, types.extend({}, options, {callback: doodad.Callback(this, function(err) {
								detach.call(this);
								if (err) {
									reject(err);
								} else {
									resolve(this);
								};
							})}));
						}, this);
					})),

				}))));
				
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.OutputStreamBase.$extend(
									ioMixIns.TextStreamBase,
				{
					$TYPE_NAME: 'TextOutputStreamBase',
					
					// Non-formatted text
					writeText: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(text, /*optional*/options)
					
					// Non-formatted text + newline
					writeLine: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(text, /*optional*/options)
					
					// Formatted text + newline
					print: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(text, /*optional*/options)
					
					writeTextAsync: doodad.PUBLIC(doodad.ASYNC(function writeTextAsync(text, /*optional*/options) {
						var Promise = types.getPromise();
						return Promise.create(function writeTextAsyncPromise(resolve, reject) {
							function errorHandler(ev) {
								detach.call(this);
								ev.preventDefault();
								reject(ev.error);
							};
							function detach() {
								this.onError.detach(this, errorHandler);
							};
							this.onError.attachOnce(this, errorHandler);
							this.writeText(text, types.extend({}, options, {callback: doodad.Callback(this, function(err) {
								detach.call(this);
								if (err) {
									reject(err);
								} else {
									resolve(this);
								};
							})}));
						}, this);
					})),
					
					writeLineAsync: doodad.PUBLIC(doodad.ASYNC(function writeLineAsync(text, /*optional*/options) {
						var Promise = types.getPromise();
						return Promise.create(function writeLineAsyncPromise(resolve, reject) {
							function errorHandler(ev) {
								detach.call(this);
								ev.preventDefault();
								reject(ev.error);
							};
							function detach() {
								this.onError.detach(this, errorHandler);
							};
							this.onError.attachOnce(this, errorHandler);
							this.writeLine(text, types.extend({}, options, {callback: doodad.Callback(this, function(err) {
								detach.call(this);
								if (err) {
									reject(err);
								} else {
									resolve(this);
								};
							})}));
						}, this);
					})),
					
					printAsync: doodad.PUBLIC(doodad.ASYNC(function printAsync(text, /*optional*/options) {
						var Promise = types.getPromise();
						return Promise.create(function printAsyncPromise(resolve, reject) {
							function errorHandler(ev) {
								detach.call(this);
								ev.preventDefault();
								reject(ev.error);
							};
							function detach() {
								this.onError.detach(this, errorHandler);
							};
							this.onError.attachOnce(this, errorHandler);
							this.print(text, types.extend({}, options, {callback: doodad.Callback(this, function(err) {
								detach.call(this);
								if (err) {
									reject(err);
								} else {
									resolve(this);
								};
							})}));
						}, this);
					})),
				}))));
				

				
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.BufferedStreamBase.$extend(
				{
					$TYPE_NAME: 'BufferedStream',

					onReady: doodad.EVENT(false), // function(ev)

					__buffer: doodad.PROTECTED(null),
					__flushing: doodad.PROTECTED(false),

					clearBuffer: doodad.OVERRIDE(function clearBuffer() {
						this.__buffer = [];
					}),

					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.__flushing = false;
					}),
					
					getCount: doodad.OVERRIDE(function getCount() {
						return this.__buffer.length;
					}),

					__consumeData: doodad.PUBLIC(function __consumeData(data) {
						if (!data.consumed) {
							data.consumed = true;

							// Consumed
							var callback = types.get(data.options, 'callback');
							if (callback) {
								data.options.callback = null; // Free memory
								callback();
							};

							if (data.raw === io.BOF) {
								var ev = new doodad.Event(data);
								this.onBOF(ev);
							} else if (data.raw === io.EOF) {
								var ev = new doodad.Event(data);
								this.onEOF(ev);
							};
						};
					}),

					__pushInternal: doodad.PROTECTED(function __pushInternal(data, /*optional*/options) {
						var next = types.get(options, 'next', false),
							buffer = this.__buffer;

						if (buffer.length >= this.options.bufferSize) {
							throw new types.BufferOverflow();
						};

						if (next) {
							buffer.unshift(data);
						} else {
							buffer.push(data);
						};
					}),
					
					push: doodad.OVERRIDE(function push(data, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(data));
						root.DD_ASSERT && root.DD_ASSERT(!data.consumed);

						var callback = types.get(options, 'callback');

						var ev = new doodad.Event(data);

						this.onData(ev);

						if (ev.prevent) {
							if (!data.delayed) {
								this.__consumeData(data);
							};
							callback && callback();
						} else {
							this.__pushInternal(data, options);

							if (this.options.flushMode === 'auto') {
								if (this.getCount() >= this.options.bufferSize) {
									this.flush(types.extend({}, this.options.autoFlushOptions, {callback: callback}));
								} else {
									callback && callback();
								};
							} else {
								callback && callback();
							};
						};
					}),
					
					__pullInternal: doodad.PROTECTED(function __pullInternal(/*optional*/options) {
						var next = types.get(options, 'next', false),
							buffer = this.__buffer;

						if (buffer.length <= 0) {
							throw new types.BufferOverflow();
						};

						var data;

						if (next) {
							data = buffer.pop();
						} else {
							data = buffer.shift();
						};

						return data;
					}),

					pull: doodad.OVERRIDE(function pull(/*optional*/options) {
						var data = this.__pullInternal(options);

						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(data));
						root.DD_ASSERT && root.DD_ASSERT(!data.consumed);

						return data;
					}),

					flush: doodad.OVERRIDE(function flush(/*optional*/options) {
						var callback = types.get(options, 'callback');
						var count = types.get(options, 'count', Infinity);
						var listening = !this._implements(ioMixIns.Listener) || this.isListening();

						var MAX_LOOP_COUNT = 30;  // TODO: Make it a stream option

						if (this.__flushing) {
							 if (callback) {
								this.onFlush.attachOnce(null, callback);
							};
						} else if (listening && (count > 0)) {
							var state = {count: 0, delayed: false};
							var __flushCbSync, __flushCbAsync;
							var __flush = function flush() {
								var finished = false;
								for (var i = 0; i < MAX_LOOP_COUNT; i++) {
									if ((state.count++ < count) && (this.getCount() > 0)) {
										var data = this.pull();

										var dataCb = types.get(data.options, 'callback');

										if (state.count < count) {
											if (!types.get(data, 'options')) {
												data.options = {};
											};
											data.options.callback = function() {
												dataCb && dataCb();
												if (state.delayed) {
													state.delayed = false;
													__flushCbSync();
												};
											};
										};

										var ev = new doodad.Event(data);

										this.onReady(ev);

										if (ev.prevent) {
											if (data.delayed) {
												state.delayed = true;
												break;
											} else {
												this.__consumeData(data);
											};
										} else {
											if (!data.delayed && !data.consumed) {
												data.options.callback = dataCb;
												this.__pushInternal(data, {next: true});
											} else {
												// A consumed data object was about to be pushed back in the buffer ! Did you forget to call 'ev.preventDefault' ?
												debugger;
											};
											finished = true;
											break;
										};

									} else {
										finished = true;
										break;
									};
								};

								if (!state.delayed) {
									if (finished) {
										this.__flushing = false;
										callback && callback();
										this.onFlush();
									} else {
										// After each X data objects, we continue on another tick
										__flushCbAsync();
									};
								};
							};

							__flushCbSync = doodad.Callback(this, __flush);
							__flushCbAsync = doodad.AsyncCallback(this, __flush);

							this.__flushing = true;
							__flush.call(this);

						} else {
							callback && callback();

							this.onFlush(new doodad.Event());
						};
					}),

				})));



				
				//return function init(/*optional*/options) {
				//};
			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()