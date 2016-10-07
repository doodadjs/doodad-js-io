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
					

				io.REGISTER(types.SINGLETON(doodad.Class.$extend(
				{
					$TYPE_NAME: 'EOF',

					toString: doodad.REPLACE(function toString() {
						return '';
					}),
				})));
				
					
				//=====================================================
				// Interfaces
				//=====================================================
				
				ioMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
				{
					$TYPE_NAME: 'Transformable',
					
					transform: doodad.PUBLIC(function transform(data, /*optional*/options) {
						data.valueOf = function valueOf() {
							return this.raw;
						};
						data.options = options;
						return data;
					}),
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
					onFlushData: doodad.EVENT(true),
					onFlush: doodad.EVENT(false),
					onEOF: doodad.EVENT(false),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super();
						
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						
						if (!options) {
							options = {};
						};
						
						types.getDefault(options, 'bufferSize', 1024);

						_shared.setAttribute(this, 'options', options);
						
						this.reset();
					}),
					
					getCount: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					push: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(data, /*optional*/options)
					pull: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					reset: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					clear: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					pipe: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(stream, /*optional*/transform)
					unpipe: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/stream)

					__flushInternal: doodad.PROTECTED(function(state, data, /*optional*/options) {
						var callback = types.get(options, 'callback');
						if (callback) {
							delete options.callback;
							callback();
						};
					}),
					
					flush: doodad.PUBLIC(function flush(/*optional*/options) {
						options = types.extend({}, options);

						var output = types.getDefault(options, 'output', true);
							
						var callback = types.get(options, 'callback');
						if (callback) {
							delete options.callback;
						};

						var state = {};

						var _flush = function _flush() {
							state.ok = true;

							while (state.ok && (this.getCount(options) > 0)) {
								var data = this.pull(options);

								if (data.raw === io.EOF) {
									this.onEOF(new doodad.Event({output: types.get(options, 'output')}));
								};

								var ev = new doodad.Event(data);

								this.onFlushData(ev);

								if (ev.prevent) {
									continue;
								};

								this.__flushInternal(state, data, types.extend({}, options, { // sync/async
										callback: new doodad.Callback(this, function(err) {
											if (err) {
												this.onError(new doodad.ErrorEvent(err));
												if (!state.ok && callback) {
													callback(err); // sync
												};
											} else {
												if (!state.ok) {
													_flush.call(this); // sync
												};
											};
										}),
									}));
							};
							
							if (state.ok && (this.getCount(options) <= 0)) {
								this.onFlush(new doodad.Event({options: options}));
								if (callback) {
									callback(); // sync
								};
							};
						};

						_flush.call(this); // sync
					}),

					flushAsync: doodad.PUBLIC(doodad.ASYNC(function flushAsync(/*optional*/options) {
						var Promise = types.getPromise();
						return Promise.create(function flushAsyncPromise(resolve, reject) {
							function errorHandler(ev) {
								detach.call(this);
								reject(ev.error);
							};
							function detach() {
								this.onError.detach(this, errorHandler);
							};
							this.onError.attachOnce(this, errorHandler);
							this.flush(types.extend({}, options, {callback: new doodad.Callback(this, function(err) {
								detach.call(this);
								if (err) {
									reject(err);
								} else {
									resolve();
								};
							})}));
						}, this);
					})),
				}))));
					
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
				{
					$TYPE_NAME: 'TextStreamBase',
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						var newLine = types.getDefault(this.options, 'newLine', tools.getOS().newLine);
						
						root.DD_ASSERT && root.DD_ASSERT(types.isString(newLine), "Invalid new line string.");
					}),
				})));
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
									ioMixIns.Listener,
				{
					$TYPE_NAME: 'InputStreamBase',

					onReady: doodad.EVENT(false), // function onReady(ev)

					read: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					readAsync: doodad.PUBLIC(doodad.ASYNC(function readAsync(/*optional*/options) {
						var Promise = types.getPromise();
						var result = this.read(options);
						if (result) {
							return result;
						} else if (this.isListening()) {
							return Promise.create(function readAsyncPromise(resolve, reject) {
								function readyHandler(ev) {
									detach.call(this);
									ev.preventDefault();
									resolve(ev.data);
								};
								function errorHandler(ev) {
									detach.call(this);
									reject(ev.error);
								};
								//function stopHandler(ev) {
								//	detach.call(this);
								//	resolve();
								//};
								function detach() {
									this.onReady.detach(this, readyHandler);
									this.onError.detach(this, errorHandler);
									//this.onStopListening.detach(this, stopHandler);
								};
								this.onReady.attachOnce(this, readyHandler);
								this.onError.attachOnce(this, errorHandler);
								//this.onStopListening.attachOnce(this, stopHandler);
							}, this);
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
						if (result) {
							return result;
						} else if (this.isListening()) {
							return Promise.create(function readTextAsyncPromise(resolve, reject) {
								function readyHandler(ev) {
									detach.call(this);
									ev.preventDefault();
									// FIXME: Return text, not a chunk
									resolve(ev.data);
								};
								function errorHandler(ev) {
									detach.call(this);
									reject(ev.error);
								};
								//function stopHandler(ev) {
								//	detach.call(this);
								//	resolve();
								//};
								function detach() {
									this.onReady.detach(this, readyHandler);
									this.onError.detach(this, errorHandler);
									//this.onStopListening.detach(this, stopHandler);
								};
								this.onReady.attachOnce(this, readyHandler);
								this.onError.attachOnce(this, errorHandler);
								//this.onStopListening.attachOnce(this, stopHandler);
							}, this);
						};
					})),
						
					readLineAsync: doodad.PUBLIC(doodad.ASYNC(function readLineAsync(/*optional*/options) {
						var Promise = types.getPromise();
						var result = this.readLine(options);
						if (result) {
							return result;
						} else if (this.isListening()) {
							return Promise.create(function readLineAsyncPromise(resolve, reject) {
								function readyHandler(ev) {
									detach.call(this);
									ev.preventDefault();
									// FIXME: Return a line, not a chunk
									resolve(ev.data);
								};
								function errorHandler(ev) {
									detach.call(this);
									reject(ev.error);
								};
								//function stopHandler(ev) {
								//	detach.call(this);
								//	resolve();
								//};
								function detach() {
									this.onReady.detach(this, readyHandler);
									this.onError.detach(this, errorHandler);
									//this.onStopListening.detach(this, stopHandler);
								};
								this.onReady.attachOnce(this, readyHandler);
								this.onError.attachOnce(this, errorHandler);
								//this.onStopListening.attachOnce(this, stopHandler);
							}, this);
						};
					})),
				}))));
				
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
									mixIns.Creatable,
				{
					$TYPE_NAME: 'OutputStreamBase',

					onWrite: doodad.EVENT(false),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						options = types.nullObject(options);

						types.getDefault(options, 'autoFlush', true);

						if (options.autoFlush) {
							types.getDefault(options, 'bufferSize', 1);
						};

						this._super(options);
					}),
					
					write: doodad.PUBLIC(doodad.MUST_OVERRIDE()), //function write(raw, /*optional*/options)
					
					writeAsync: doodad.PUBLIC(doodad.ASYNC(function writeAsync(raw, /*optional*/options) {
						var Promise = types.getPromise();
						return Promise.create(function writeAsyncPromise(resolve, reject) {
							function errorHandler(ev) {
								detach.call(this);
								reject(ev.error);
							};
							function detach() {
								this.onError.detach(this, errorHandler);
							};
							this.onError.attachOnce(this, errorHandler);
							this.write(raw, types.extend({}, options, {callback: new doodad.Callback(this, function(err) {
								detach.call(this);
								if (err) {
									reject(err);
								} else {
									resolve();
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
								reject(ev.error);
							};
							function detach() {
								this.onError.detach(this, errorHandler);
							};
							this.onError.attachOnce(this, errorHandler);
							this.writeText(text, types.extend({}, options, {callback: new doodad.Callback(this, function(err) {
								detach.call(this);
								if (err) {
									reject(err);
								} else {
									resolve();
								};
							})}));
						}, this);
					})),
					
					writeLineAsync: doodad.PUBLIC(doodad.ASYNC(function writeLineAsync(text, /*optional*/options) {
						var Promise = types.getPromise();
						return Promise.create(function writeLineAsyncPromise(resolve, reject) {
							function errorHandler(ev) {
								detach.call(this);
								reject(ev.error);
							};
							function detach() {
								this.onError.detach(this, errorHandler);
							};
							this.onError.attachOnce(this, errorHandler);
							this.writeLine(text, types.extend({}, options, {callback: new doodad.Callback(this, function(err) {
								detach.call(this);
								if (err) {
									reject(err);
								} else {
									resolve();
								};
							})}));
						}, this);
					})),
					
					printAsync: doodad.PUBLIC(doodad.ASYNC(function printAsync(text, /*optional*/options) {
						var Promise = types.getPromise();
						return Promise.create(function printAsyncPromise(resolve, reject) {
							function errorHandler(ev) {
								detach.call(this);
								reject(ev.error);
							};
							function detach() {
								this.onError.detach(this, errorHandler);
							};
							this.onError.attachOnce(this, errorHandler);
							this.print(text, types.extend({}, options, {callback: new doodad.Callback(this, function(err) {
								detach.call(this);
								if (err) {
									reject(err);
								} else {
									resolve();
								};
							})}));
						}, this);
					})),
				}))));
				
				
				
				
				//return function init(/*optional*/options) {
				//};
			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()