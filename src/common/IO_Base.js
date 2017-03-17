//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: IO_Baqse.js - IO Base Tools
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
		DD_MODULES['Doodad.IO'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
			namespaces: ['MixIns', 'Interfaces'],

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


				//const __Internal__ = {
				//};
				
				//types.complete(_shared.Natives, {
				//});


				io.REGISTER(doodad.Class.$extend(
				{
					$TYPE_NAME: 'Signal',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('Signal')), true) */,

					toString: doodad.REPLACE(function toString() {
						return '';
					}),
				}));
				
					
				io.REGISTER(types.SINGLETON(io.Signal.$extend(
				{
					$TYPE_NAME: 'BOF',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BOFSingleton')), true) */,
				})));
				
					
				io.REGISTER(types.SINGLETON(io.Signal.$extend(
				{
					$TYPE_NAME: 'EOF',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('EOFSingleton')), true) */,
				})));
				

				io.ADD('DeferCallback', function() {});

				io.REGISTER(types.Type.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'Data',
						$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('Data')), true) */,

						$validateEncoding: function $validateEncoding(encoding, /*optional*/dontThrow) {
							encoding = encoding.toLowerCase();
							if (encoding !== 'raw') {
								if (dontThrow) {
									return null;
								} else {
									throw new types.Error("Invalid encoding. ");
								};
							};
							return encoding;
						},

						$encode: function $encode(str, encoding, /*optional*/options) {
							throw new types.NotSupported();
						},

						$decode: function $decode(buf, encoding, /*optional*/options) {
							throw new types.NotSupported();
						},
					},
					/*instanceProto*/
					{
						raw: null,
						options: null,
						consumed: false,
						deferred: 0,
						stream: null,
						timeoutObj: null,
						trailing: null, // Trailing text/buffer on EOF. IMPORTANT: Must be a buffer if raw is a buffer, or a string if raw is a string
						hasError: false,

						_new: types.SUPER(function _new(/*optional*/raw, /*optional*/options) {
							this._super();
							const type = types.getType(this);
							const encoding = type.$validateEncoding(types.get(options, 'encoding') || 'raw');
							this.raw = raw;
							this.options = types.nullObject(options);
							this.options.encoding = encoding;
							const timeout = types.get(options, 'timeout', (root.getOptions().debug ? 120000 : Infinity));
							if (types.isFinite(timeout) && (timeout > 1000)) {
								this.timeoutObj = tools.callAsync(function dataTimeout() {
									// Data object looks like stalled.
									debugger;
									if (!this.consumed) {
										this.timeoutObj = null;
										const err = new types.TimeoutError("Data object has not been consumed.");
										this.consume(err);
									};
								}, timeout, this, null, true);
							};
 						}),

						valueOf: function valueOf(/*optional*/encoding) {
							if (!types.isNothing(encoding) && (encoding !== 'raw')) {
								throw new types.NotSupported("This Data object only supports 'raw' encoding.");
							};
							if (types._instanceof(this.raw, io.Signal)) {
								return null;
							} else {
								return this.raw;
							};
						},

						attach: function attach(stream) {
							if (this.consumed) {
								throw new types.NotAvailable("Data object has been consumed.");
							} else if (this.stream) {
								throw new types.NotAvailable("Data object has already been attached.");
							} else {
								//stream.onError.attachOnce(this, function(ev) {
								//	//ev.preventDefault();
								//	this.consume(ev.error);
								//});
								this.stream = stream;
							};
						},

						defer: function defer() {
							if (this.consumed) {
								throw new types.NotAvailable("Data object has been consumed.");
							} else if (!this.stream) {
								throw new types.NotAvailable("Data object has not been attached to its stream.");
							} else {
								this.deferred++;
								const cb = types.INHERIT(io.DeferCallback, this.consume.bind(this)); // doodad.AsyncCallback(this, this.consume);
								cb.data = this;
								return cb;
							};
						},

						consume: function consume(/*optional*/err) {
							if (!err && !this.hasError) {
								if (this.consumed) {
									throw new types.NotAvailable("Data object has been consumed.");
								} else if (!this.stream) {
									throw new types.NotAvailable("Data object has not been attached to its stream.");
								};
							};
							if (!this.consumed && (err || (--this.deferred <= 0))) {
								this.consumed = true;
								this.hasError = !!err;
								if (this.timeoutObj) {
									this.timeoutObj.cancel();
									this.timeoutObj = null;  // Free memory
								};
								const cbChain = this.options.callback;
								if (types.isArray(cbChain)) {
									const len = cbChain.length;
									for (let i = 0; i < len; i++) {
										cbChain[i](err);
									};
								} else if (!types.isNothing(cbChain)) {
									cbChain(err);
								};
								this.options.callback = null; // Free memory
								if (!_shared.DESTROYED(this.stream)) {
									//this.stream.onError.detach(this);
									this.stream.consumeData(this, err);
									this.stream = null; // Free memory
								};
								this.raw = null; // Free memory
								this.trailing = null; // Free memory
								this.options = null; // Free memory
							};
						},

						chain: function chain(callback) {
							if (!types.isNothing(callback)) {
								if (types.baseof(io.DeferCallback, callback) && (callback.data === this)) {
									throw new types.Error("Callback can't be chained.");
								};
								if (this.consumed) {
									callback();
								} else {
									let cbChain = this.options.callback;
									if (types.isNothing(cbChain)) {
										this.options.callback = callback;
									} else {
										if (!types.isArray(cbChain)) {
											this.options.callback = cbChain = [cbChain];
										};
										if (root.DD_ASSERT) {
											root.DD_ASSERT(tools.findItem(cbChain, callback) === null, "Callback has already been chained.");
										};
										cbChain.push(callback);
									};
								};
							};
						},

						unchain: function chain(callback) {
							if (!this.consumed && !types.isNothing(callback)) {
								let cbChain = this.options.callback;
								if (types.isArray(cbChain)) {
									types.popItem(cbChain, callback);
									if (!cbChain.length) {
										this.options.callback = null;
									};
								} else if (cbChain === callback) {
									this.options.callback = null;
								};
							};
						},
					}
				));
				

				io.REGISTER(io.Data.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'BinaryData',
						$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BinaryData')), true) */,

						$encode: function $encode(str, encoding, /*optional*/options) {
							if (encoding !== 'raw') {
								throw new types.Error("Invalid encoding.");
							};
							return types.stringToBytes(str, types.get(options, 'size'));
						},

						$decode: function $decode(buf, encoding, /*optional*/options) {
							if (encoding !== 'raw') {
								throw new types.Error("Invalid encoding.");
							};
							return types.bytesToString(buf);
						},
					},
					/*instanceProto*/
					{
						valueOf: function valueOf(/*optional*/encoding) {
							let buf = (types._instanceof(this.raw, io.Signal) ? null : this.raw);
							if (types.isNothing(encoding)) {
								if (types.isString(buf) || types.isString(this.trailing)) {
									return (this.trailing ? (buf || '') + this.trailing : buf) || null;
								} else {
									const type = types.getType(this);
									if (this.trailing) {
										// TODO: Concat buf and trailing.
										//buf = (buf ? buf.concat(this.trailing) : this.trailing);
										if (buf) {
											throw new types.Error("'ArrayBuffer' doesn't support concatenation.");
										} else {
											buf = this.trailing;
										};
									};
									return type.$decode(buf, this.options.encoding, this.options) || null;
								};
							} else {
								const type = types.getType(this);
								encoding = type.$validateEncoding(encoding);
								let thisEncoding = this.options.encoding;
								if (thisEncoding === 'raw') {
									thisEncoding = this.stream.options.encoding;
								};
								if ((encoding === 'raw') || (encoding === thisEncoding)) {
									if (types.isString(buf) || types.isString(this.trailing)) {
										return type.$encode((this.trailing ? (buf || '') + this.trailing : buf) || '', thisEncoding, this.options);
									} else {
										if (this.trailing) {
											// TODO: Concat buf and trailing.
											//buf = (buf ? buf.concat(this.trailing) : this.trailing);
											if (buf) {
												throw new types.Error("'ArrayBuffer' doesn't support concatenation.");
											} else {
												buf = this.trailing;
											};
										};
										return buf || null;
									};
								} else {
									if (types.isString(buf) || types.isString(this.trailing)) {
										buf = (this.trailing ? (buf || '') + this.trailing : buf) || '';
									} else {
										if (this.trailing) {
											// TODO: Concat buf and trailing.
											//buf = (buf ? buf.concat(this.trailing) : this.trailing);
											if (buf) {
												throw new types.Error("'ArrayBuffer' doesn't support concatenation.");
											} else {
												buf = this.trailing;
											};
										};
										buf = type.$decode(buf, thisEncoding, this.options);
									};
									return (buf ? type.$encode(buf, encoding, this.options) || null : null);
								};
							};
						},
					}
				));
				

				//=====================================================
				// Interfaces
				//=====================================================
				
				ioMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
				{
					$TYPE_NAME: 'Transformable',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TransformableMixIn')), true) */,

					$isValidEncoding: doodad.PUBLIC(doodad.TYPE(function(encoding) {
						return (io.Data.$validateEncoding(encoding, true) !== null);
					})),

					transform: doodad.PUBLIC(function transform(raw, /*optional*/options) {
						if (!options) {
							options = {};
						};
						let encoding = types.get(options, 'encoding');
						if (encoding) {
							encoding = io.TextData.$validateEncoding(encoding);
						} else {
							encoding = this.options.encoding || 'raw';
						};
						options.encoding = encoding;
						if (types._instanceof(raw, io.Data)) {
							return raw.valueOf(options.encoding);
						} else {
							return new io.Data(raw, options);
						};
					}),
				})));
				

				ioMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
									mixIns.Events,
				{
					$TYPE_NAME: 'Listener',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ListenerMixIn')), true) */,
					
					onListen: doodad.EVENT(), // function(ev)
					onStopListening: doodad.EVENT(), // function(ev)
					
					isListening: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					listen: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					stopListening: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
				})));
				

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
				
				ioInterfaces.REGISTER(doodad.ISOLATED(doodad.INTERFACE(doodad.Class.$extend(
				{
					$TYPE_NAME: 'IConsole',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('IConsoleIsolated')), true) */,
					
					info: doodad.PUBLIC(doodad.METHOD()), //function info(raw, /*optional*/options)
					warn: doodad.PUBLIC(doodad.METHOD()), //function warn(raw, /*optional*/options)
					error: doodad.PUBLIC(doodad.METHOD()), //function error(raw, /*optional*/options)
					log: doodad.PUBLIC(doodad.METHOD()), //function log(raw, /*optional*/options)
				}))));
				


				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(doodad.Class.$extend(
									mixIns.Creatable,
									mixIns.Events,
				{
					$TYPE_NAME: 'StreamBase',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('StreamBaseMixIn')), true) */,

					options: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					onDestroy: doodad.EVENT(false), // function(ev)
					onError: doodad.ERROR_EVENT(), // function onError(ev)
					onData: doodad.EVENT(false), // function(ev)
					onBOF: doodad.EVENT(false), // function(ev)
					onEOF: doodad.EVENT(false), // function(ev)

					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super();
						
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isJsObject(options), "Invalid options.");
						
						if (types.isNothing(options)) {
							this.setOptions({});
						} else {
							this.setOptions(options);
						};

						this.reset();
					}),

					destroy: doodad.OVERRIDE(function destroy(/*optional*/options) {
						this.onDestroy();

						this._super();
					}),

					setOptions: doodad.PUBLIC(function setOptions(options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(options), "Invalid options.");

						types.getDefault(options, 'encoding', types.getIn(this.options, 'encoding', 'raw'));

						_shared.setAttribute(this, 'options', types.freezeObject(types.nullObject(this.options, options)));
					}),
					
					reset: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					clear: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					pipe: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(stream, /*optional*/transform)
					unpipe: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/stream)
				}))));
					
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
				{
					$TYPE_NAME: 'BufferedStreamBase',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedStreamBaseMixIn')), true) */,

					onFlush: doodad.EVENT(false), // function(ev)

					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'flushMode', types.getIn(this.options, 'flushMode', 'auto')); // 'auto', 'manual', 'half'
						if (options.flushMode === 'auto') {
							types.getDefault(options, 'bufferSize', types.getIn(this.options, 'bufferSize', 1));
						} else {
							types.getDefault(options, 'bufferSize', types.getIn(this.options, 'bufferSize', 1024));
						};

						//////types.getDefault(options, 'autoFlushOptions', types.getIn(this.options, 'autoFlushOptions', null));

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
						const Promise = types.getPromise();
						const callback = types.get(options, 'callback');
						return Promise.create(function flushAsyncPromise(resolve, reject) {
							let errorHandler, destroyHandler;
							const cleanup = function cleanup() {
								this.onError.detach(this, errorHandler);
								this.onDestroy.detach(this, destroyHandler);
							};
							errorHandler = function errorHandler(ev) {
								cleanup.call(this);
								ev.preventDefault();
								reject(ev.error);
							};
							destroyHandler = function destroyHandler(ev) {
								cleanup.call(this);
								reject(new types.NotAvailable("Target object is about to be destroyed."));
							};
							this.onError.attachOnce(this, errorHandler);
							this.onDestroy.attachOnce(this, destroyHandler);
							this.flush(types.extend({}, options, {callback: doodad.Callback(this, function(err) {
								cleanup.call(this);
								callback && callback(err);
								if (err) {
									reject(err);
								} else {
									resolve(this);
								};
							})}));
						}, this);
					})),
				}))));

				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
				{
					$TYPE_NAME: 'TextStreamBase',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextStreamBaseMixIn')), true) */,
					
					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'newLine', types.getIn(this.options, 'newLine', tools.getOS().newLine));
						types.getDefault(options, 'encoding', types.getIn(this.options, 'encoding', 'utf-8'));

						options.encoding = io.TextData.$validateEncoding(options.encoding, false);

						this._super(options);
						
						root.DD_ASSERT && root.DD_ASSERT(types.isString(this.options.newLine), "Invalid new line string.");
					}),

				})));
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
									ioMixIns.Listener,
				{
					$TYPE_NAME: 'InputStreamBase',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('InputStreamBaseMixIn')), true) */,

					read: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					readAsync: doodad.PUBLIC(doodad.ASYNC(function readAsync(/*optional*/options) {
						const Promise = types.getPromise();
						const result = this.read(options);
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextInputStreamBaseMixIn')), true) */,
					
					// Non-formatted text
					readText: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					// Non-formatted text + newline
					readLine: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					readTextAsync: doodad.PUBLIC(doodad.ASYNC(function readTextAsync(/*optional*/options) {
						const Promise = types.getPromise();
						const result = this.readText(options);
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
						const Promise = types.getPromise();
						const result = this.readLine(options);
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('OutputStreamBaseMixIn')), true) */,

					onWrite: doodad.EVENT(false),

					canWrite: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function canWrite()

					write: doodad.PUBLIC(doodad.MUST_OVERRIDE()), //function write(raw, /*optional*/options)
					
					writeAsync: doodad.PUBLIC(doodad.ASYNC(function writeAsync(raw, /*optional*/options) {
						const Promise = types.getPromise();
						return Promise.create(function writeAsyncPromise(resolve, reject) {
							let errorHandler, destroyHandler;
							const cleanup = function cleanup() {
								this.onError.detach(this, errorHandler);
								this.onDestroy.detach(this, destroyHandler);
							};
							errorHandler = function errorHandler(ev) {
								cleanup.call(this);
								ev.preventDefault();
								reject(ev.error);
							};
							destroyHandler = function destroyHandler(ev) {
								cleanup.call(this);
								reject(new types.NotAvailable("Target object is about to be destroyed."));
							};
							this.onError.attachOnce(this, errorHandler);
							this.onDestroy.attachOnce(this, destroyHandler);
							this.write(raw, types.extend({}, options, {callback: doodad.Callback(this, function(err) {
								cleanup.call(this);
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextOutputStreamBaseMixIn')), true) */,
					
					// Non-formatted text
					writeText: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(text, /*optional*/options)
					
					// Non-formatted text + newline
					writeLine: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(text, /*optional*/options)
					
					// Formatted text + newline
					print: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(text, /*optional*/options)
					
					writeTextAsync: doodad.PUBLIC(doodad.ASYNC(function writeTextAsync(text, /*optional*/options) {
						const Promise = types.getPromise();
						return Promise.create(function writeTextAsyncPromise(resolve, reject) {
							let errorHandler, destroyHandler;
							const cleanup = function cleanup() {
								this.onError.detach(this, errorHandler);
								this.onDestroy.detach(this, destroyHandler);
							};
							errorHandler = function errorHandler(ev) {
								cleanup.call(this);
								ev.preventDefault();
								reject(ev.error);
							};
							destroyHandler = function destroyHandler(ev) {
								cleanup.call(this);
								reject(new types.NotAvailable("Target object is about to be destroyed."));
							};
							this.onError.attachOnce(this, errorHandler);
							this.onDestroy.attachOnce(this, destroyHandler);
							this.writeText(text, types.extend({}, options, {callback: doodad.Callback(this, function(err) {
								cleanup.call(this);
								if (err) {
									reject(err);
								} else {
									resolve(this);
								};
							})}));
						}, this);
					})),
					
					writeLineAsync: doodad.PUBLIC(doodad.ASYNC(function writeLineAsync(text, /*optional*/options) {
						const Promise = types.getPromise();
						return Promise.create(function writeLineAsyncPromise(resolve, reject) {
							let errorHandler, destroyHandler;
							const cleanup = function cleanup() {
								this.onError.detach(this, errorHandler);
								this.onDestroy.detach(this, destroyHandler);
							};
							errorHandler = function errorHandler(ev) {
								cleanup.call(this);
								ev.preventDefault();
								reject(ev.error);
							};
							destroyHandler = function destroyHandler(ev) {
								cleanup.call(this);
								reject(new types.NotAvailable("Target object is about to be destroyed."));
							};
							this.onError.attachOnce(this, errorHandler);
							this.onDestroy.attachOnce(this, destroyHandler);
							this.writeLine(text, types.extend({}, options, {callback: doodad.Callback(this, function(err) {
								cleanup.call(this);
								if (err) {
									reject(err);
								} else {
									resolve(this);
								};
							})}));
						}, this);
					})),
					
					printAsync: doodad.PUBLIC(doodad.ASYNC(function printAsync(text, /*optional*/options) {
						const Promise = types.getPromise();
						return Promise.create(function printAsyncPromise(resolve, reject) {
							let errorHandler, destroyHandler;
							const cleanup = function cleanup() {
								this.onError.detach(this, errorHandler);
								this.onDestroy.detach(this, destroyHandler);
							};
							errorHandler = function errorHandler(ev) {
								cleanup.call(this);
								ev.preventDefault();
								reject(ev.error);
							};
							destroyHandler = function destroyHandler(ev) {
								cleanup.call(this);
								reject(new types.NotAvailable("Target object is about to be destroyed."));
							};
							this.onError.attachOnce(this, errorHandler);
							this.onDestroy.attachOnce(this, destroyHandler);
							this.print(text, types.extend({}, options, {callback: doodad.Callback(this, function(err) {
								cleanup.call(this);
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedStreamMixIn')), true) */,

					onReady: doodad.EVENT(false), // function(ev)

					onError: doodad.OVERRIDE(function onError(ev) {
						const cancelled = this._super(ev);

						const buffer = this.__buffer,
							len = buffer.length,
							err = ev.error;

						for (let i = 0; i < len; i++) {
							const data = buffer[i];
							data.consume(err);
						};

						this.clearBuffer();

						return cancelled;
					}),

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

					consumeData: doodad.PUBLIC(function consumeData(data, /*optional*/err) {
						if (err) {
							if (types.isEntrant(this, 'onError')) {
								this.onError(err);
							};
						} else {
							if (data.raw === io.BOF) {
								this.onBOF();
							} else if (data.raw === io.EOF) {
								this.onEOF();
							};
						};
					}),

					__pushInternal: doodad.PROTECTED(function __pushInternal(data, /*optional*/options) {
						const next = types.get(options, 'next', false),
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
						root.DD_ASSERT && root.DD_ASSERT(types._instanceof(data, io.Data), "Invalid Data object.");

						if (data.consumed) {
							throw new types.Error("Data object has been consumed.");
						};

						const callback = types.get(options, 'callback');

						if (data.stream !== this) {
							data.attach(this);
						};

						if (callback) {
							data.chain(callback);
						};

						const ev = new doodad.Event(data);

						this.onData(ev);

						if (ev.prevent) {
							if (!data.consumed) {
								data.consume();
							};
						} else {
							this.__pushInternal(data, options);

							if (this.options.flushMode === 'auto') {
								if (this.getCount() >= this.options.bufferSize) {
									this.flush();
								};
							};
						};
					}),
					
					__pullInternal: doodad.PROTECTED(function __pullInternal(/*optional*/options) {
						const next = types.get(options, 'next', false),
							buffer = this.__buffer;

						if (buffer.length <= 0) {
							throw new types.BufferOverflow();
						};

						let data;

						if (next) {
							data = buffer.pop();
						} else {
							data = buffer.shift();
						};

						return data;
					}),

					pull: doodad.OVERRIDE(function pull(/*optional*/options) {
						const data = this.__pullInternal(options);

						root.DD_ASSERT && root.DD_ASSERT(types._instanceof(data, io.Data), "Invalid Data object.");

						if (data.consumed) {
							throw new types.Error("Data object has been consumed.");
						};

						return data;
					}),

					flush: doodad.OVERRIDE(function flush(/*optional*/options) {
						const callback = types.get(options, 'callback'),
							count = types.get(options, 'count', Infinity);

						const listening = !this._implements(ioMixIns.Listener) || this.isListening();

						const MAX_LOOP_COUNT = 30;  // TODO: Make it a stream option

						if (this.__flushing) {
							if (callback) {
								let flushCb, errorCb;
								this.onFlush.attachOnce(this, flushCb = function(ev) {
									this.onError.detach(this, errorCb);
									callback(null);
								});
								this.onError.attachOnce(this, errorCb = function(ev) {
									this.onFlush.detach(this, flushCb);
									callback(ev.error);
								});
							};
						} else if (listening && (count > 0)) {
							const state = {count: 0, deferred: false, error: null};
							let __flushCbSync, __flushCbAsync;
							const __flush = function flush() {
								let finished = false;
								try {
									for (let i = 0; i < MAX_LOOP_COUNT; i++) {
										if ((state.count++ < count) && (this.getCount() > 0)) {
											const data = this.pull();

											let continueCb = null;

											data.chain(continueCb = function continueFlush(err) {
												if (err) {
													callback && callback(err);
												} else if (err || state.deferred) {
													state.deferred = false;
													__flushCbSync();
												};
											});

											const ev = new doodad.Event(data);

											this.onReady(ev);

											if (ev.prevent) {
												if (!data.consumed) {
													data.consume();
													if (data.deferred > 0) {
														state.deferred = true;
														break;
													};
												};
											} else {
												if (!data.consumed && (data.deferred === 0)) {
													data.unchain(continueCb);
													this.__pushInternal(data, {next: true});
												} else {
													// A consumed or deferred data object was about to be pushed back in the buffer ! Did you forget to call 'ev.preventDefault' ?
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

									if (!finished && !state.deferred) {
										// After each X data objects, we continue on another tick
										__flushCbAsync();
									};
								} catch(ex) {
									state.error = ex;
									finished = true;
									throw ex;
								} finally {
									if (finished) {
										this.__flushing = false;

										callback && callback(state.error);

										if (!state.error) {
											tools.callAsync(this.onFlush, -1, this);
										};
									};
								};
							};

							__flushCbSync = doodad.Callback(this, __flush, true);
							__flushCbAsync = doodad.AsyncCallback(this, __flush, this.onError);

							this.__flushing = true;

							__flush.call(this);

						} else {
							callback && callback(null);

							tools.callAsync(this.onFlush, -1, this);
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