//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// dOOdad - Object-oriented programming framework
// File: Client_IO.js - Client IO functions
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
				'Doodad.IO', 
			],
			
			create: function create(root, /*optional*/_options) {
				"use strict";

				//===================================
				// Get namespaces
				//===================================

				var doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					mixIns = doodad.MixIns,
					client = doodad.Client,
					io = doodad.IO,
					ioMixIns = io.MixIns,
					ioInterfaces = io.Interfaces;
				

				var __Natives__ = {
					windowTextDecoder: (types.isNativeFunction(global.TextDecoder) ? global.TextDecoder : undefined),
				};
				
				
				//=====================================================
				// Basic implementations
				//=====================================================
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
				{
					$TYPE_NAME: 'Stream',

					__inputBuffer: doodad.PROTECTED(null),
					__outputBuffer: doodad.PROTECTED(null),

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
						var isInput = this._implements(ioMixIns.InputStreamBase),
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
						var buffer = this.getBuffer(options);
						return buffer && buffer.length || 0;
					}),

					__pushInternal: doodad.PROTECTED(function __pushInternal(data, /*optional*/options) {
						var next = types.get(options, 'next', false),
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
						
						var noEvents = (this._implements(ioInterfaces.Listener) && !this.isListening()) || types.get(options, 'noEvents', false),
							buffer = this.getBuffer(options),
							isOutput = types.get(options, 'output');
							
						if (!noEvents) {
							var ev = new doodad.Event(data);
							
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
						} else {
							throw new types.BufferOverflow();
						};
						
						return data;
					}),
				}))));
		
		
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.InputStreamBase.$extend(
				{
					$TYPE_NAME: 'InputStream',

					read: doodad.OVERRIDE(function read(/*optional*/options) {
						var buffer = this.getBuffer(types.extend({}, options, {output: false})),
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

					write: doodad.OVERRIDE(function write(raw, /*optional*/options) {
						var bufferSize = this.options.bufferSize,
							pushOpt = types.extend({}, options, {output: true, transformed: false});

						if (this.options.autoFlush) {
							var _push = function() {
								var data = this.push(raw, pushOpt);
								
								if ((data.raw === io.EOF) || (this.getCount(pushOpt) >= bufferSize)) {
									this.flush(options);
								} else {
									var callback = types.get(options, 'callback');
									if (callback) {
										var cbObj = types.get(options, 'callbackObj');
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
							
							var callback = types.get(options, 'callback');
							if (callback) {
								var cbObj = types.get(options, 'callbackObj');
								callback = new doodad.AsyncCallback(cbObj, callback);
								callback(); // async
							};
						};
					}),

					__flushInternal: doodad.PROTECTED(function(state, data, /*optional*/options) {
						this.onFlushData(new doodad.Event(data));

						var callback = types.get(options, 'callback');
						if (callback) {
							var cbObj = types.get(options, 'callbackObj');
							callback = new doodad.Callback(cbObj, callback);
							callback(); // sync
						};
					}),
					
					flush: doodad.OVERRIDE(function flush(/*optional*/options) {
						var bufferOpts = types.extend({}, options, {output: true});
							
						var callback = types.get(options, 'callback');
						if (callback) {
							var cbObj = types.get(options, 'callbackObj');
							callback = new doodad.Callback(cbObj, callback);
						};

						var _flush = function _flush() {
							var state = {
								ok: true,
							};
							var buffer = this.getBuffer(bufferOpts);
							
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
				// Text transformable client implementation
				//=====================================================

				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextTransformable.$extend(
											ioMixIns.Stream,
											mixIns.Creatable,
				{
					$TYPE_NAME: 'TextTransformable',
					
					__decoder: doodad.PROTECTED( null ),
					__decoderEncoding: doodad.PROTECTED( null ),
					
					$isValidEncoding: doodad.OVERRIDE(function isValidEncoding(encoding) {
						// TODO: Find a better way
						try {
							new __Natives__.windowTextDecoder(encoding, {fatal: true});
							return true;
						} catch(o) {
							return false;
						};
					}),
					
					create: doodad.OVERRIDE(function create(/*paramarray*/) {
						this._super.apply(this, arguments);
						
						types.getDefault(this.options, 'encoding', 'utf-8');
					}),
					
					transform: doodad.REPLACE(function transform(data, /*optional*/options) {
						var encoding = types.get(options, 'encoding', this.options.encoding);
						if (types.isTypedArray(data.raw) && encoding && __Natives__.windowTextDecoder) {
							var text = '';
							if ((data.raw !== io.EOF) && (!this.__decoder || (this.__decoderEncoding !== encoding))) {
								if (this.__decoder) {
									text = this.__decoder.decode(null, {stream: false});
								};
								this.__decoder = new __Natives__.windowTextDecoder(encoding);
								this.__decoderEncoding = encoding;
							};
							if ((data.raw === io.EOF) && this.__decoder) {
								text += this.__decoder.decode(null, {stream: false});
							} else {
								text += this.__decoder.decode(data.raw, {stream: true});
							};
							data.text = text;
						} else {
							data.text = String(data.raw);
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
						
						this.__decoder = null;
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.__decoder = null;
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