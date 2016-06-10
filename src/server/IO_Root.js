//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// dOOdad - Object-oriented programming framework
// File: NodeJs_IO.js - Node.js IO Tools
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
		DD_MODULES['Doodad.IO/root'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE() */,
			dependencies: [
				'Doodad.NodeJs.IO',
			],
			
			create: function create(root, /*optional*/_options) {
				"use strict";
				
				const doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					mixIns = doodad.MixIns,
					io = doodad.IO,
					ioInterfaces = io.Interfaces,
					ioMixIns = io.MixIns,
					nodejs = doodad.NodeJs,
					nodejsMixIns = nodejs.MixIns,
					nodejsInterfaces = nodejs.Interfaces,
					nodejsIO = nodejs.IO,
					nodejsIOMixIns = nodejsIO.MixIns,
					nodejsIOInterfaces = nodejsIO.Interfaces,

					nodeStringDecoder = require('string_decoder').StringDecoder;
				

				var __Natives__ = {
					globalBuffer: global.Buffer,
				};
				
				
				//=====================================================
				// Basic implementations
				//=====================================================
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
				{
					$TYPE_NAME: 'Stream',

					__inputBuffer: doodad.PROTECTED(null),
					__outputBuffer: doodad.PROTECTED(null),
					
					_new: types.SUPER(function _new(/*paramarray*/) {
						if (types.isType(this) && !this._implements(nodejsIOInterfaces.IStream)) {
							const isInput = this._implements(ioMixIns.InputStreamBase),
								isOutput = this._implements(ioMixIns.OutputStreamBase);
							let _interface = null;
							if (isInput && isOutput) {
								_interface = nodejsIOInterfaces.ITransform;
							} else if (isInput) {
								_interface = nodejsIOInterfaces.IReadable;
							} else if (isOutput) {
								_interface = nodejsIOInterfaces.IWritable;
							};
							if (!_interface) {
								return this;
							};
							return types.INIT(this.$extend(_interface, {
								$TYPE_NAME: types.getTypeName(this),
							}), arguments);
						} else {
							return this._super.apply(this, arguments);
						};
					}),

					onError: doodad.OVERRIDE(function onError(ev) {
						const retval = this._super(ev);
						const istream = this.getInterface(nodejsIOInterfaces.IStream);
						if (istream) {
							istream.emit('error', err);
						};
						return retval;
					}),
					
					getBuffer: doodad.PROTECTED(function getBuffer(/*optional*/options) {
						return (types.get(options, 'output') ? this.__outputBuffer : this.__inputBuffer);
					}),
					
					clearBuffer: doodad.PROTECTED(function clearBuffer(/*optional*/options) {
						if (types.get(options, 'output')) {
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.__outputBuffer = [];
							};
						} else {
							if (this._implements(ioMixIns.InputStreamBase)) {
								this.__inputBuffer = [];
							};
						};
					}),
					
					clearBuffers: doodad.PROTECTED(function clearBuffers() {
						const isInput = this._implements(ioMixIns.InputStreamBase),
							isOutput = this._implements(ioMixIns.OutputStreamBase);
						
						if (isInput) {
							this.__inputBuffer = [];
						};
						
						if (isOutput) {
							this.__outputBuffer = [];
						};
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.clearBuffers();
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this._super();

						this.clearBuffers();
					}),
					
					getCount: doodad.OVERRIDE(function getCount(/*optional*/options) {
						const buffer = this.getBuffer(options);
						return buffer && buffer.length || 0;
					}),

					__pushInternal: doodad.PROTECTED(function __pushInternal(data, /*optional*/options) {
						const next = types.get(options, 'next', false),
							buffer = this.getBuffer(options);

						if (next) {
							buffer.unshift(data);
						} else {
							buffer.push(data);
						};
					}),
					
					push: doodad.OVERRIDE(function push(data, /*optional*/options) {
						if (!types.get(options, 'transformed')) {
							data = this.transform({raw: data}, options) || data;
						};
						
						const noEvents = (this._implements(ioInterfaces.Listener) && !this.isListening()) || types.get(options, 'noEvents', false),
							buffer = this.getBuffer(options),
							isOutput = types.get(options, 'output');
							//ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
							
						if (!noEvents) {
							const ev = new doodad.Event(data);
							
							if (isOutput) {
								this.onWrite(ev);
							} else {
								this.onReady(ev);
							};
							
							if (ev.prevent) {
								// Consumed
								return null;
							};
						};
						
						if (buffer.length < this.options.bufferSize) {
							this.__pushInternal(data, options);
							// !noEvents && !isOutput && ireadable && ireadable.emit('readable');
						} else {
							throw new types.BufferOverflow();
						};
						
						return data;
					}),
				}))));
				
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.InputStreamBase.$extend(
				{
					$TYPE_NAME: 'InputStream',

					onReady: doodad.OVERRIDE(function onReady(ev) {
						const retval = this._super(ev);
						const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
						let emitted = false;
						if (ireadable) {
							if (ev.data.raw === io.EOF) {
								emitted = ireadable.emit('end');
							} else {
								emitted = ireadable.emit('data', ev.data.valueOf());
							};
						};
						if (emitted) {
							ev.preventDefault();
						};
						return retval;
					}),
					
					read: doodad.OVERRIDE(function read(/*optional*/options) {
						const buffer = this.getBuffer(types.extend({}, options, {output: false})),
							count = types.get(options, 'count');
						if (types.isNothing(count)) {
							return buffer.shift();
						} else {
							return buffer.splice(0, count);
						};
					}),
				})));
					
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.OutputStreamBase.$extend(
				{
					$TYPE_NAME: 'OutputStream',

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);
						const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
						if (iwritable) {
							if (ev.data.raw === io.EOF) {
								iwritable.emit('finish');
							};
						};
						return retval;
					}),
					
					onFlush: doodad.OVERRIDE(function onFlush(ev) {
						const retval = this._super(ev);
						const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
						if (iwritable) {
							iwritable.emit('drain');
						};
						return retval;
					}),
					
					write: doodad.OVERRIDE(function write(raw, /*optional*/options) {
						const bufferSize = this.options.bufferSize,
							pushOpt = types.extend({}, options, {output: true, transformed: false});

						if (this.options.autoFlush) {
							const _push = function() {
								const data = this.push(raw, pushOpt);
								
								if ((data.raw === io.EOF) || (this.getCount(pushOpt) >= bufferSize)) {
									this.flush(options);
								} else {
									let callback = types.get(options, 'callback');
									if (callback) {
										const cbObj = types.get(options, 'callbackObj');
										callback = new doodad.AsyncCallback(cbObj, callback);
										callback(); // async
									};
								};
							};
							
							if (this.getCount(pushOpt) >= bufferSize) {
								this.flush(types.extend({}, options, {callbackObj: this, callback: _push})); // async
							} else {
								_push.call(this); // sync
							};
							
						} else {
							this.push(raw, pushOpt);
							
							let callback = types.get(options, 'callback');
							if (callback) {
								const cbObj = types.get(options, 'callbackObj');
								callback = new doodad.AsyncCallback(cbObj, callback);
								callback(); // async
							};
						};
					}),

					__flushInternal: doodad.PROTECTED(function(state, data, /*optional*/options) {
						this.onFlushData(new doodad.Event(data));

						let callback = types.get(options, 'callback');
						if (callback) {
							const cbObj = types.get(options, 'callbackObj');
							callback = new doodad.Callback(cbObj, callback);
							callback(); // sync
						};
					}),
					
					flush: doodad.OVERRIDE(function flush(/*optional*/options) {
						const bufferOpts = types.extend({}, options, {output: true});
							
						let callback = types.get(options, 'callback');
						if (callback) {
							const cbObj = types.get(options, 'callbackObj');
							callback = new doodad.Callback(cbObj, callback);
						};

						const _flush = function _flush() {
							let state = {
								ok: true,
							};
							const buffer = this.getBuffer(bufferOpts);
							
							while (state.ok && buffer.length) {
								var data = buffer.shift();
								this.__flushInternal(state, data, types.extend({}, options, { // sync/async
										callbackObj: this,
										callback: function(err) {
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
										},
									}));
							};
							
							if (state.ok && !buffer.length) {
								this.onFlush(new doodad.Event({options: options}));
								if (callback) {
									callback(); // sync
								};
							};
						};

						_flush.call(this); // sync
					}),
				})));


				//=====================================================
				// TextTransformable server implementation
				//=====================================================

				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextTransformable.$extend(
											ioMixIns.Stream,
											mixIns.Creatable,
				{
					$TYPE_NAME: 'TextTransformable',
					
					__transformEncoding: doodad.PROTECTED(  null  ),
					__transformDecoder: doodad.PROTECTED(  null  ),
					
					$isValidEncoding: doodad.OVERRIDE(function isValidEncoding(encoding) {
						return __Natives__.globalBuffer.isEncoding(encoding);
					}),
					
					create: doodad.OVERRIDE(function create(/*paramarray*/) {
						this._super.apply(this, arguments);
						
						types.getDefault(this.options, 'encoding', 'utf-8');
					}),
					
					transform: doodad.REPLACE(function transform(data, /*optional*/options) {
						let encoding = types.get(options, 'encoding', this.options.encoding);
						let startingText = '';
						if (encoding && (this.__transformEncoding !== encoding)) {
							if (this.__transformDecoder) {
								startingText = this.__transformDecoder.end();
								this.__transformDecoder = null;
							};
							this.__transformDecoder = new nodeStringDecoder(encoding);
							this.__transformEncoding = encoding;
						};
						data.text = startingText;
						if (data.raw === io.EOF) {
							if (this.__transformDecoder) {
								data.text += this.__transformDecoder.end();
								this.__transformDecoder = null;
							};
						} else {
							if (this.__transformDecoder && (types.isTypedArray(data.raw) || types.isBuffer(data.raw))) {
								data.text += this.__transformDecoder.write(data.raw);
							} else {
								data.text += String(data.raw);
							};
						};
						data.valueOf = function valueOf() {
							if (this.raw === io.EOF) {
								return null;
							} else {
								return this.text;
							};
						};
						
						return data;
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this._super();
						
						this.__transformDecoder = null;
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.__transformDecoder = null;
					}),
				})));

				
				
				//===================================
				// Init
				//===================================
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