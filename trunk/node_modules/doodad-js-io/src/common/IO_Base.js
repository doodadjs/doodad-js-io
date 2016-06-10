//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
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
		DD_MODULES['Doodad.IO'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE() */,
			namespaces: ['MixIns', 'Interfaces'],

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
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(doodad.Class.$extend(
				{
					$TYPE_NAME: 'Transformable',
					
					transform: doodad.PUBLIC(function transform(data, /*optional*/options) {
						data.valueOf = function valueOf() {
							return this.raw;
						};
						
						return data;
					}),
				}))));
				
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.Transformable.$extend(
				{
					$TYPE_NAME: 'TextTransformable',
					
					$isValidEncoding: doodad.PUBLIC(doodad.TYPE(doodad.MUST_OVERRIDE())),
				}))));
				
				
				ioInterfaces.REGISTER(doodad.INTERFACE(doodad.Class.$extend(
									mixIns.Events,
				{
					$TYPE_NAME: 'Listener',
					
					onListen: doodad.EVENT(), // function(ev)
					onStopListening: doodad.EVENT(), // function(ev)
					
					isListening: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					listen: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					stopListening: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
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
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super();
						
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						
						if (!options) {
							options = {};
						};
						
						types.getDefault(options, 'bufferSize', 1024);

						types.setAttribute(this, 'options', options);
						
						this.reset();
					}),
					
					getCount: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					push: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(data, /*optional*/options)
					reset: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					clear: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					
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

						if (data.raw === io.EOF) {
							stream.write(io.EOF, data.options);
						} else {
							stream.write(data.valueOf(), data.options);
						};
					}),
					
					__pipeOnFlush: doodad.PROTECTED(function __pipeOnFlush(ev) {
						var stream = ev.handlerData[0];
						stream.flush();
					}),
						
					pipe: doodad.PUBLIC(function pipe(stream, /*optional*/transform) {
						if (!types._implements(stream, ioMixIns.OutputStreamBase)) {
							throw new types.TypeError("Stream must implement 'Doodad.IO.MixIns.OutputStreamBase'.");
						};
						if (types._implements(this, ioMixIns.InputStreamBase)) {
							this.onReady.attach(this, this.__pipeOnReady, null, [stream, transform]);
						} else if (types._implements(this, ioMixIns.OutputStreamBase)) {
							this.onWrite.attach(this, this.__pipeOnReady, null, [stream, transform]);
						};
						if (types._implements(this, ioMixIns.OutputStreamBase)) {
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
							if (types._implements(this, ioMixIns.InputStreamBase)) {
								this.onReady.detach(this, this.__pipeOnReady, [stream]);
							} else if (types._implements(this, ioMixIns.OutputStreamBase)) {
								this.onWrite.detach(this, this.__pipeOnReady, [stream]);
							};
							if (types._implements(this, ioMixIns.OutputStreamBase)) {
								this.onFlush.detach(this, this.__pipeOnFlush, [stream]);
							};
						} else {
							if (types._implements(this, ioMixIns.InputStreamBase)) {
								this.onReady.detach(this, this.__pipeOnReady);
							} else if (types._implements(this, ioMixIns.OutputStreamBase)) {
								this.onWrite.detach(this, this.__pipeOnReady);
							};
							if (types._implements(this, ioMixIns.OutputStreamBase)) {
								this.onFlush.detach(this, this.__pipeOnFlush);
							};
						};
					}),
				}))));
					
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
									ioInterfaces.Listener,
				{
					$TYPE_NAME: 'InputStreamBase',

					onReady: doodad.EVENT(false), // function onReady(ev)

					read: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					readAsync: doodad.PUBLIC(function readAsync(/*optional*/options) {
						var Promise = types.getPromise();
						var result = this.read(options);
						if (result) {
							return Promise.resolve(result);
						} else if (this.isListening()) {
							var self = this;
							return new Promise(function(resolve, reject) {
								function readyHandler(ev) {
									detach();
									ev.preventDefault();
									resolve(ev.data);
								};
								function errorHandler(ev) {
									detach();
									reject(ev.error);
								};
								function stopHandler(ev) {
									detach();
									resolve();
								};
								function detach() {
									self.onReady.detach(self, readyHandler);
									self.onError.detach(self, errorHandler);
									self.onStopListening.detach(self, stopHandler);
								};
								self.onReady.attachOnce(self, readyHandler);
								self.onError.attachOnce(self, errorHandler);
								self.onStopListening.attachOnce(self, stopHandler);
							});
						} else {
							return Promise.resolve();
						};
					}),
				}))));
				
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.InputStreamBase.$extend(
				{
					$TYPE_NAME: 'TextInputStreamBase',
					
					// Non-formatted text
					readText: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					// Non-formatted text + newline
					readLine: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					readTextAsync: doodad.PUBLIC(function readTextAsync(/*optional*/options) {
						var Promise = types.getPromise();
						var result = this.readText(options);
						if (result) {
							return Promise.resolve(result);
						} else if (this.isListening()) {
							var self = this;
							return new Promise(function(resolve, reject) {
								function readyHandler(ev) {
									detach();
									ev.preventDefault();
									resolve(ev.data);
								};
								function errorHandler(ev) {
									detach();
									reject(ev.error);
								};
								function stopHandler(ev) {
									detach();
									resolve();
								};
								function detach() {
									self.onReady.detach(self, readyHandler);
									self.onError.detach(self, errorHandler);
									self.onStopListening.detach(self, stopHandler);
								};
								self.onReady.attachOnce(self, readyHandler);
								self.onError.attachOnce(self, errorHandler);
								self.onStopListening.attachOnce(self, stopHandler);
							});
						} else {
							return Promise.resolve();
						};
					}),
						
					readLineAsync: doodad.PUBLIC(function readLineAsync(/*optional*/options) {
						var Promise = types.getPromise();
						var result = this.readLine(options);
						if (result) {
							return Promise.resolve(result);
						} else if (this.isListening()) {
							var self = this;
							return new Promise(function(resolve, reject) {
								function readyHandler(ev) {
									detach();
									ev.preventDefault();
									resolve(ev.data);
								};
								function errorHandler(ev) {
									detach();
									reject(ev.error);
								};
								function stopHandler(ev) {
									detach();
									resolve();
								};
								function detach() {
									self.onReady.detach(self, readyHandler);
									self.onError.detach(self, errorHandler);
									self.onStopListening.detach(self, stopHandler);
								};
								self.onReady.attachOnce(self, readyHandler);
								self.onError.attachOnce(self, errorHandler);
								self.onStopListening.attachOnce(self, stopHandler);
							});
						} else {
							return Promise.resolve();
						};
					}),
				}))));
				
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
									mixIns.Creatable,
				{
					$TYPE_NAME: 'OutputStreamBase',

					onWrite: doodad.EVENT(false),
					onFlushData: doodad.EVENT(false),
					onFlush: doodad.EVENT(false),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						types.getDefault(this.options, 'autoFlush', false);
					}),
					
					write: doodad.PUBLIC(doodad.MUST_OVERRIDE()), //function write(raw, /*optional*/options)
					flush: doodad.PUBLIC(doodad.MUST_OVERRIDE()), //function(/*optional*/options)
					
					writeAsync: doodad.PUBLIC(function writeAsync(raw, /*optional*/options) {
						var Promise = types.getPromise();
						var self = this;
						return new Promise(function(resolve, reject) {
							function errorHandler(ev) {
								detach();
								reject(ev.error);
							};
							function detach() {
								self.onError.detach(self, errorHandler);
							};
							self.onError.attachOnce(self, errorHandler);
							self.write(raw, types.extend({}, options, {callback: function(err) {
								if (err) {
									reject(err);
								} else {
									resolve();
								};
							}}));
						});
					}),
						
					flushAsync: doodad.PUBLIC(function flushAsync(/*optional*/options) {
						var Promise = types.getPromise();
						var self = this;
						return new Promise(function(resolve, reject) {
							function errorHandler(ev) {
								detach();
								reject(ev.error);
							};
							function detach() {
								self.onError.detach(self, errorHandler);
							};
							self.onError.attachOnce(self, errorHandler);
							self.flush(types.extend({}, options, {callback: function(err) {
								if (err) {
									reject(err);
								} else {
									resolve();
								};
							}}));
						});
					}),
				}))));
				
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.OutputStreamBase.$extend(
				{
					$TYPE_NAME: 'TextOutputStreamBase',
					
					// Non-formatted text
					writeText: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(text, /*optional*/options)
					
					// Non-formatted text + newline
					writeLine: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(text, /*optional*/options)
					
					// Formatted text + newline
					print: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(text, /*optional*/options)
					
					writeTextAsync: doodad.PUBLIC(function writeTextAsync(text, /*optional*/options) {
						var Promise = types.getPromise();
						var self = this;
						return new Promise(function(resolve, reject) {
							function errorHandler(ev) {
								detach();
								reject(ev.error);
							};
							function detach() {
								self.onError.detach(self, errorHandler);
							};
							self.onError.attachOnce(self, errorHandler);
							self.writeText(text, types.extend({}, options, {callback: function(err) {
								if (err) {
									reject(err);
								} else {
									resolve();
								};
							}}));
						});
					}),
					
					writeLineAsync: doodad.PUBLIC(function writeLineAsync(text, /*optional*/options) {
						var Promise = types.getPromise();
						var self = this;
						return new Promise(function(resolve, reject) {
							function errorHandler(ev) {
								detach();
								reject(ev.error);
							};
							function detach() {
								self.onError.detach(self, errorHandler);
							};
							self.onError.attachOnce(self, errorHandler);
							self.writeLine(text, types.extend({}, options, {callback: function(err) {
								if (err) {
									reject(err);
								} else {
									resolve();
								};
							}}));
						});
					}),
					
					printAsync: doodad.PUBLIC(function printAsync(text, /*optional*/options) {
						var Promise = types.getPromise();
						var self = this;
						return new Promise(function(resolve, reject) {
							function errorHandler(ev) {
								detach();
								reject(ev.error);
							};
							function detach() {
								self.onError.detach(self, errorHandler);
							};
							self.onError.attachOnce(self, errorHandler);
							self.print(text, types.extend({}, options, {callback: function(err) {
								if (err) {
									reject(err);
								} else {
									resolve();
								};
							}}));
						});
					}),
				}))));
				
				
				
				
				//return function init(/*optional*/options) {
				//};
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