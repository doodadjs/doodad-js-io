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
				
				types.complete(_shared.Natives, {
					windowUint8Array: global.Uint8Array,
				});


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
				

				//=========================================
				// Data objects
				//=========================================

				io.ADD('DeferCallback', types.INHERIT(types.Callback, function DeferCallback(data) {
					//return types.INHERIT(io.DeferCallback, function consume(err) {
					//	data.consume(err);
					//});
					const cb = types.INHERIT(io.DeferCallback, data.consume.bind(data));
					_shared.setAttribute(cb, _shared.BoundObjectSymbol, data, {});
					//_shared.setAttribute(cb, _shared.OriginalValueSymbol, data.consume, {});
					return cb;
				}));

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
						callbacks: null,
						deferFn: null,

						_new: types.SUPER(function _new(/*optional*/raw, /*optional*/options) {
							this._super();
							const type = types.getType(this);
							const encoding = type.$validateEncoding(types.get(options, 'encoding') || 'raw');
							this.raw = raw;
							this.options = types.nullObject(options);
							this.options.encoding = encoding;
 						}),

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
								const timeout = types.get(stream.options, 'timeout', (root.getOptions().debug ? 120000 : Infinity));
								if (types.isFinite(timeout) && (timeout >= 1000)) {
									this.timeoutObj = tools.callAsync(function dataTimeout() {
										this.timeoutObj = null;
										if (!this.consumed) {
											// Data object looks like stalled.
											types.DEBUGGER();
											try {
												const err = new types.TimeoutError("Data object has not been consumed.");
												this.consume(err);
											} catch(o) {
											};
										};
									}, timeout, this, null, true);
								};
							};
						},

						detach: function detach() {
							if (this.timeoutObj) {
								this.timeoutObj.cancel();
								this.timeoutObj = null;
							};
							this.stream = null;
						},

						defer: function defer() {
							if (this.consumed) {
								throw new types.NotAvailable("Data object has been consumed.");
							} else if (!this.stream) {
								throw new types.NotAvailable("Data object has not been attached to its stream.");
							} else {
								this.deferred++;
								if (this.deferFn) {
									return this.deferFn;
								} else {
									const cb = this.deferFn = io.DeferCallback(this);
									cb.data = this;
									return cb;
								};
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
							if (!this.consumed && (err || (--this.deferred < 0))) {
								this.consumed = true;

								this.hasError = !!err;

								if (this.timeoutObj) {
									this.timeoutObj.cancel();
									this.timeoutObj = null;  // Free memory
								};

								let failed = false;

								if (!_shared.DESTROYED(this.stream)) {
									//this.stream.onError.detach(this);
									try {
										//this.stream.onError.detach(this);
										this.stream.consumeData(this, err);
									} catch(ex) {
										err = ex;
										failed = true;
									};
								};

								const cbChain = this.callbacks;
								if (types.isArray(cbChain)) {
									const len = cbChain.length;
									for (let i = 0; i < len; i++) {
										try {
											cbChain[i](err);
										} catch(ex) {
											err = ex;
											failed = true;
										};
									};
								} else if (!types.isNothing(cbChain)) {
									try {
										cbChain(err);
									} catch(ex) {
										err = ex;
										failed = true;
									};
								};

								// Free memory
								this.stream = null;
								this.callbacks = null;
								this.raw = null;
								this.trailing = null;
								this.options = null;
								this.deferFn = null;

								if (failed) {
									this.hasError = true;
									throw err;
								};
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
									let cbChain = this.callbacks;
									if (types.isNothing(cbChain)) {
										this.callbacks = callback;
									} else {
										if (!types.isArray(cbChain)) {
											this.callbacks = cbChain = [cbChain];
										};
										if (root.DD_ASSERT) {
											root.DD_ASSERT(tools.findItem(cbChain, callback, null, true) === null, "Callback has already been chained.");
										};
										cbChain.push(callback);
									};
								};
							};
						},

						unchain: function chain(callback) {
							if (!this.consumed && !types.isNothing(callback)) {
								let cbChain = this.callbacks;
								if (types.isArray(cbChain)) {
									types.popItem(cbChain, callback);
									if (!cbChain.length) {
										this.callbacks = null;
									};
								} else if (cbChain === callback) {
									this.callbacks = null;
								};
							};
						},

						valueOf: function valueOf() {
							if (types._instanceof(this.raw, io.Signal)) {
								return null;
							} else {
								return this.raw;
							};
						},

						toString: function toString() {
							if (types._instanceof(this.raw, io.Signal)) {
								return '';
							} else {
								return types.toString(this.raw);
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
						valueOf: function valueOf() {
							// NOTE: That's still binary data.
							const type = types.getType(this);
							const buf = (types._instanceof(this.raw, io.Signal) ? this.trailing : this.raw);
							if (types.isNothing(buf)) {
								return null;
							} else if (types.isString(buf)) {
								let encoding = this.options.encoding || 'raw';
								if (this.stream && (encoding === 'raw')) {
									encoding = this.stream.options.encoding || 'raw';
								};
								return type.$encode(buf, encoding, this.options) || null;
							} else {
								return buf;
							};
						},

						toString: function toString() {
							const type = types.getType(this);
							const buf = (types._instanceof(this.raw, io.Signal) ? this.trailing : this.raw);
							if (types.isNothing(buf)) {
								return '';
							} else if (types.isString(buf)) {
								return buf;
							} else {
								let encoding = this.options.encoding || 'raw';
								if (this.stream && (encoding === 'raw')) {
									encoding = this.stream.options.encoding || 'raw';
								};
								return type.$decode(buf, encoding, this.options) || '';
							};
						},
					}
				));
				

				//=====================================================
				// Interfaces
				//=====================================================
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(doodad.Class.$extend(
				{
					$TYPE_NAME: 'TransformableBase',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TransformableBaseMixInBase')), true) */,

					$isValidEncoding: doodad.PUBLIC(doodad.TYPE(doodad.MUST_OVERRIDE(function(encoding) {
						return false;
					}))),
					transformIn: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function transformIn(raw, /*optional*/options)
					transformOut: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function transformOut(data, /*optional*/options)
				}))));
				

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
									ioMixIns.TransformableBase,
				{
					$TYPE_NAME: 'StreamBase',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('StreamBaseMixIn')), true) */,

					options: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					onDestroy: doodad.EVENT(false), // function(ev)
					onError: doodad.ERROR_EVENT(), // function onError(ev)
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

					reset: doodad.PUBLIC(function() {}),
					clear: doodad.PUBLIC(function() {}),

					pipe: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(stream, /*optional*/transform)
					unpipe: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/stream)
				}))));
				

				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
				{
					$TYPE_NAME: 'BufferedStreamBase',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedStreamBaseMixIn')), true) */,

					onFlush: doodad.EVENT(false), // function(ev)

					destroy: doodad.OVERRIDE(function destroy() {
						this.clearBuffer();

						this._super();
					}),

					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'flushMode', types.getIn(this.options, 'flushMode', 'auto')); // 'auto', 'manual'
						if (options.flushMode === 'auto') {
							types.getDefault(options, 'bufferSize', types.getIn(this.options, 'bufferSize', 1));
						} else {
							types.getDefault(options, 'bufferSize', types.getIn(this.options, 'bufferSize', 1024));
						};

						this._super(options);
					}),

					clearBuffer: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function clearBuffer()

					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.clearBuffer();
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this._super();

						this.clearBuffer();
					}),
					
					getCount: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function getCount()

					flush: doodad.PUBLIC(doodad.CALL_FIRST(doodad.MUST_OVERRIDE(function flush(/*optional*/options) {
						const callback = types.get(options, 'callback', null);

						if (callback) {
							options = types.extend(options, {callback: this.makeOutside(callback)});
						};

						return this._super(options);
					}))),

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
								reject(new types.ScriptInterruptedError("Target object is about to be destroyed."));
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


				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.TransformableBase.$extend(
									ioMixIns.StreamBase,
				{
					$TYPE_NAME: 'ObjectTransformableBase',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ObjectTransformableBaseMixInBase')), true) */,

					$isValidEncoding: doodad.OVERRIDE(function(encoding) {
						if (io.Data.$validateEncoding(encoding, true) !== null) {
							this.overrideSuper();
							return true;
						} else {
							return this._super(encoding);
						};
					}),
				}))));


				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.ObjectTransformableBase.$extend(
				{
					$TYPE_NAME: 'ObjectTransformableIn',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ObjectTransformableInMixIn')), true) */,

					transformIn: doodad.REPLACE(function transformIn(raw, /*optional*/options) {
						return new io.Data(raw, options);
					}),
				})));


				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.ObjectTransformableBase.$extend(
				{
					$TYPE_NAME: 'ObjectTransformableOut',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ObjectTransformableOutMixIn')), true) */,

					transformOut: doodad.REPLACE(function transformOut(data, /*optional*/options) {
						const value = data.valueOf();
						if (types.isNothing(value)) {
							return null;
						} else if (types.isObject(value)) {
							return value;
						} else {
							return types.toObject(value);
						};
					}),
				})));


				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.TransformableBase.$extend(
									ioMixIns.StreamBase,
				{
					$TYPE_NAME: 'BinaryTransformableBase',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BinaryTransformableBaseMixInBase')), true) */,

					$isValidEncoding: doodad.OVERRIDE(function(encoding) {
						if (io.BinaryData.$validateEncoding(encoding, true) !== null) {
							this.overrideSuper();
							return true;
						} else {
							return this._super(encoding);
						};
					}),
				}))));


				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.BinaryTransformableBase.$extend(
				{
					$TYPE_NAME: 'BinaryTransformableIn',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BinaryTransformableInMixIn')), true) */,

					transformIn: doodad.REPLACE(function transformIn(raw, /*optional*/options) {
						return new io.BinaryData(raw, options);
					}),
				})));


				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.BinaryTransformableBase.$extend(
				{
					$TYPE_NAME: 'BinaryTransformableOut',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BinaryTransformableOutMixIn')), true) */,

					transformOut: doodad.REPLACE(function transformOut(data, /*optional*/options) {
						const value = data.valueOf();
						if (types.isNothing(value)) {
							return null;
						} else if (types.isTypedArray(value)) {
							return value;
						} else {
							return new _shared.Natives.windowUint8Array(value);
						};
					}),
				})));


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

					onReady: doodad.EVENT(false), // function(ev)

					__pushInternal: doodad.PROTECTED(function __pushInternal(data, /*optional*/options) {
						if (data.consumed) {
							throw new types.Error("Data object has been consumed.");
						};

						const callback = types.get(options, 'callback');

						if (callback) {
							data.chain(callback);
						};

						data.consume();
					}),

					push: doodad.PUBLIC(function push(data, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types._instanceof(data, io.Data), "Invalid Data object.");

						if (data.consumed) {
							throw new types.Error("Data object has been consumed.");
						};

						if (data.stream !== this) {
							data.attach(this);
						};

						const callback = types.get(options, 'callback');

						let prevent = false;

						if (!this._implements(ioMixIns.BufferedStreamBase)) {
							const ev = new doodad.Event(data);

							try {
								this.onReady(ev);
							} catch(ex) {
								data.consume(ex);
								callback && callback(ex);
								throw ex;
							};

							prevent = ev.prevent;
						};

						if (prevent) {
							if (data.consumed) {
								callback && callback(null);
							} else {
								if (callback) {
									data.chain(callback);
								};
								data.consume();
							};
						} else {
							this.__pushInternal(data, options);
						};
					}),

					__pullInternal: doodad.PROTECTED(function __pullInternal(/*optional*/options) {
					}),

					pull: doodad.PUBLIC(function pull(/*optional*/options) {
						const data = this.__pullInternal(options);

						root.DD_ASSERT && root.DD_ASSERT(types._instanceof(data, io.Data), "Invalid Data object.");

						if (data.consumed) {
							throw new types.Error("Data object has been consumed.");
						};

						return data;
					}),

					read: doodad.PUBLIC(function read(/*optional*/options) {
						const data = this.pull(options);

						let value = null;

						if (data.deferred <= 0) {
							// NOTE: Data should not have been consumed.
							value = this.transformOut(data, options);
							data.consume();
						} else {
							// Not ready yet.
							this.push(data, {next: true});
						};

						return value;
					}),
					
					readAsync: doodad.PUBLIC(doodad.ASYNC(function readAsync(/*optional*/options) {
						const Promise = types.getPromise();
						const result = this.read(options);
						if (!types.isNothing(result)) {
							return result;
						} else if (this.isListening()) {
							return this.onReady.promise()
								.then(function(ev) {
									return this.read(options);
								});
						} else {
							return null;
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
							return this.onReady.promise()
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
							return this.onReady.promise()
								.then(function(ev) {
									return this.readLine(options);
								});
						};
					})),
				}))));
				
				ioMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
				{
					$TYPE_NAME: 'OutputBase',

					submit: doodad.PUBLIC(doodad.CALL_FIRST(doodad.MUST_OVERRIDE(function submit(data, /*optional*/options) {
						const callback = types.get(options, 'callback', null);

						if (callback) {
							options = types.extend(options, {callback: this.makeOutside(callback)});
						};

						return this._super(data, options);
					}))),

					write: doodad.PUBLIC(doodad.CALL_FIRST(doodad.MUST_OVERRIDE(function write(/*optional*/raw, /*optional*/options) {
						const callback = types.get(options, 'callback', null);

						if (callback) {
							options = types.extend(options, {callback: this.makeOutside(callback)});
						};

						return this._super(raw, options);
					}))),
				})));
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
											ioMixIns.OutputBase,
				{
					$TYPE_NAME: 'OutputStreamBase',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('OutputStreamBaseMixIn')), true) */,

					onWrite: doodad.EVENT(false),
					onData: doodad.EVENT(false), // function(ev)

					canWrite: doodad.PUBLIC(function canWrite() {
						return true;
					}),

					__submitInternal: doodad.PROTECTED(function __submitInternal(data, /*optional*/options) {
						if (data.consumed) {
							throw new types.Error("Data object has been consumed.");
						};

						const callback = types.get(options, 'callback');

						if (callback) {
							data.chain(callback);
						};

						data.consume();
					}),

					submit: doodad.REPLACE(function submit(data, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types._instanceof(data, io.Data), "Invalid Data object.");

						if (data.consumed) {
							throw new types.Error("Data object has been consumed.");
						};

						if (data.stream !== this) {
							data.attach(this);
						};

						const callback = types.get(options, 'callback');

						let prevent = false;

						if (!this._implements(ioMixIns.BufferedStreamBase)) {
							const ev = new doodad.Event(data);

							try {
								this.onData(ev);
							} catch(ex) {
								data.consume(ex);
								callback && callback(ex);
								throw ex;
							};

							prevent = ev.prevent;
						};

						if (prevent) {
							if (data.consumed) {
								callback && callback(null);
							} else {
								if (callback) {
									data.chain(callback);
								};
								data.consume();
							};
						} else {
							this.__submitInternal(data, options);
						};
					}),

					write: doodad.REPLACE(function write(/*optional*/raw, /*optional*/options) {
						const callback = types.get(options, 'callback');

						let end = types.get(options, 'eof'),
							start = types.get(options, 'bof');

						const encoding = types.get(options, 'encoding') || this.options.encoding;

						const eof = end || (raw === io.EOF),
							bof = !eof && (start || (raw === io.BOF));

						if (types.isNothing(end)) {
							end = eof;
						};

						if (types.isNothing(start)) {
							start = bof;
						};

						if ((!end && eof) || (!start && bof)) {
							return;
						};

						if (types.isNothing(raw)) {
							if (eof) {
								raw = io.EOF;
							} else if (bof) {
								raw = io.BOF;
							};
						};

						const data = this.transformIn(raw, {encoding: encoding});

						data.attach(this);

						const ev = new doodad.Event(data);

						try {
							this.onWrite(ev);
						} catch(ex) {
							if (callback) {
								data.chain(callback);
							};
							data.consume(ex);
							throw ex;
						};

						if (ev.prevent) {
							if (data.consumed) {
								callback && callback(null);
							} else {
								if (callback) {
									data.chain(callback);
								};
								data.consume();
							};
						} else {
							if (end) {
								if (eof) {
									if (callback) {
										data.chain(callback);
									};
									this.submit(data);
								} else {
									const data2 = new io.Data(io.EOF);
									data.chain(doodad.Callback(this, function(err) {
										if (err) {
											callback && callback(err);
										} else {
											if (callback) {
												data2.chain(callback);
											};
											this.submit(data2);
										};
									}));
									this.submit(data);
									return data2; // will returns Data(EOF)
								};
							} else if (start) {
								if (callback) {
									data.chain(callback);
								};
								if (bof) {
									this.submit(data);
								} else {
									const data2 = new io.Data(io.BOF);
									data2.chain(doodad.Callback(this, function(err) {
										if (!err) {
											this.submit(data);
										};
									}));
									this.submit(data2);
								};
							} else {
								if (callback) {
									data.chain(callback);
								};
								this.submit(data);
							};
						};

						return data;
					}),
					
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
								reject(new types.ScriptInterruptedError("Target object is about to be destroyed."));
							};
							this.onError.attachOnce(this, errorHandler);
							this.onDestroy.attachOnce(this, destroyHandler);
							const data = this.write(raw, types.extend({}, options, {callback: doodad.AsyncCallback(this, function(err) {
								cleanup.call(this);
								if (err) {
									reject(err);
								} else {
									resolve(data);
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
								reject(new types.ScriptInterruptedError("Target object is about to be destroyed."));
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
								reject(new types.ScriptInterruptedError("Target object is about to be destroyed."));
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
								reject(new types.ScriptInterruptedError("Target object is about to be destroyed."));
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
				

				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.BufferedStreamBase.$extend(
				{
					$TYPE_NAME: 'BufferedStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedStreamMixIn')), true) */,

					__buffer: doodad.PROTECTED(null),
					__flushing: doodad.PROTECTED(false),
					__flushPurge: doodad.PROTECTED(false),

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

					clearBuffer: doodad.REPLACE(function clearBuffer() {
						tools.forEach(this.__buffer, function(data) {
							data.detach();
						});
						this.__buffer = [];
					}),

					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.__flushing = false;
						this.__flushPurge = false;
					}),
					
					getCount: doodad.REPLACE(function getCount() {
						return this.__buffer.length;
					}),

					flush: doodad.REPLACE(function flush(/*optional*/options) {
						const callback = types.get(options, 'callback'),
							count = types.get(options, 'count', Infinity),
							purge = types.get(options, 'purge', this.__flushPurge);

						const listening = !this._implements(ioMixIns.Listener) || this.isListening();

						const MAX_LOOP_COUNT = 30;  // TODO: Make it a stream option

						this.__flushPurge = purge;

						if (this.__flushing) {
							if (callback) {
								let flushCb, errorCb, destroyCb;
								const cleanup = function _cleanup() {
									this.onFlush.detach(this, flushCb);
									this.onError.detach(this, errorCb);
									this.onDestroy.detach(this, destroyCb);
								};
								this.onFlush.attachOnce(this, flushCb = function(ev) {
									cleanup.call(this);
									callback(null);
								});
								this.onError.attachOnce(this, errorCb = function(ev) {
									cleanup.call(this);
									callback(ev.error);
								});
								this.onDestroy.attachOnce(this, destroyCb = function(ev) {
									cleanup.call(this);
									callback(new types.ScriptInterruptedError("Target object is about to be destroyed."));
								});
							};
						} else if (listening && (count > 0)) {
							const isInput = this._implements(ioMixIns.InputStreamBase) && !this._implements(ioMixIns.OutputStreamBase);
							const state = {count: 0, deferred: false, error: null};
							let __flushCbSync, __flushCbAsync;
							const __flush = function flush() {
								let finished = false;
								try {
									const buffer = this.__buffer;
									for (let i = 0; i < MAX_LOOP_COUNT; i++) {
										if ((state.count++ < count) && (buffer.length > 0)) {
											const data = buffer.shift();

											let continueCb = null;

											data.chain(continueCb = function continueFlush(err) {
												if (err) {
													callback && callback(err);
												} else if (state.deferred) {
													state.deferred = false;
													__flushCbSync();
												};
											});

											const ev = new doodad.Event(data);

											try {
												if (isInput) {
													this.onReady(ev);
												} else {
													this.onData(ev);
												};
											} catch(ex) {
												data.consume(ex);
												throw ex;
											};

											if (ev.prevent || purge) {
												if (!data.consumed) {
													data.consume();

													if (!data.consumed) {
														state.deferred = true;
														break;
													};
												};
											} else {
												data.unchain(continueCb);
												buffer.unshift(data);
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
				}))));


				
				//return function init(/*optional*/options) {
				//};
			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()