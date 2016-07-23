//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// dOOdad - Object-oriented programming framework
// File: IO_Root.js - Client IO Root
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
			
			create: function create(root, /*optional*/_options, _shared) {
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
				

				types.complete(_shared.Natives, {
					windowTextDecoder: (types.isNativeFunction(global.TextDecoder) ? global.TextDecoder : undefined),
				});
				
				
				//=====================================================
				// Basic implementations
				//=====================================================
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
				{
					$TYPE_NAME: 'Stream',

					__inputBuffer: doodad.PROTECTED(null),
					__outputBuffer: doodad.PROTECTED(null),

					destroy: doodad.OVERRIDE(function destroy() {
						if (this._implements(ioInterfaces.Listener)) {
							this.stopListening();
						};

						this._super();
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
						if (this.getCount(options) >= this.options.bufferSize) {
							throw new types.BufferOverflow();
						};

						var next = types.get(options, 'next', false),
							buffer = this.getBuffer(options);

						if (next) {
							buffer.unshift(data);
						} else {
							buffer.push(data);
						};

						// Consumed
						var callback = types.get(data.options, 'callback');
						if (callback) {
							var cbObj = types.get(data.options, 'callbackObj');
							delete data.options.callbackObj;
							delete data.options.callback;
							callback = new doodad.Callback(cbObj, callback);
							callback(); // sync
						};
					}),
					
					push: doodad.OVERRIDE(function push(data, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(data));
						
						var noEvents = (this._implements(ioInterfaces.Listener) && !this.isListening()) || types.get(options, 'noEvents', false);
						if (!noEvents) {
							var ev = new doodad.Event(data);
							
							var isOutput = types.get(options, 'output');
							if (isOutput) {
								this.onWrite(ev);
							} else {
								this.onReady(ev);
							};
							
							if (ev.prevent) {
								// Consumed
								var callback = types.get(ev.data.options, 'callback');
								if (callback) {
									var cbObj = types.get(ev.data.options, 'callbackObj');
									delete ev.data.options.callbackObj;
									delete ev.data.options.callback;
									callback = new doodad.Callback(cbObj, callback);
									callback(); // sync
								};
								return null;
							};
						};
						
						this.__pushInternal(data, options);
						
						if (this.options.autoFlush) {
							if ((data.raw === io.EOF) || (this.getCount(options) >= this.options.bufferSize)) {
								this.flush();
							};
						};
					}),
					
					__pullInternal: doodad.PROTECTED(function __pullInternal(/*optional*/options) {
						if (this.getCount(options) <= 0) {
							throw new types.BufferOverflow();
						};

						var next = types.get(options, 'next', false),
							buffer = this.getBuffer(options);

						var data;

						if (next) {
							data = buffer.pop();
						} else {
							data = buffer.shift();
						};

						// Consumed
						var callback = types.get(data.options, 'callback');
						if (callback) {
							var cbObj = types.get(data.options, 'callbackObj');
							callback = new doodad.Callback(cbObj, callback);
							delete data.options.callbackObj;
							delete data.options.callback;
							callback(); // sync
						};

						return data;
					}),
					
					pull: doodad.OVERRIDE(function(/*optional*/options) {
						var data = this.__pullInternal(options);

						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(data));

						return data;
					}),

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
						
					pipe: doodad.OVERRIDE(function pipe(stream, /*optional*/transform) {
						if (!types._implements(stream, ioMixIns.OutputStreamBase)) {
							throw new types.TypeError("Stream must implement 'Doodad.IO.MixIns.OutputStreamBase'.");
						};
						if (this._implements(ioMixIns.InputStreamBase)) {
							this.onReady.attach(this, this.__pipeOnReady, null, [stream, transform]);
						} else if (this._implements(ioMixIns.OutputStreamBase)) {
							this.onWrite.attach(this, this.__pipeOnReady, null, [stream, transform]);
						};
						if (this._implements(ioMixIns.OutputStreamBase)) {
							this.onFlush.attach(this, this.__pipeOnFlush, null, [stream]);
						};
						if (this._implements(ioInterfaces.Listener)) {
							this.listen();
						};
					}),
					
					unpipe: doodad.OVERRIDE(function unpipe(/*optional*/stream) {
						if (this._implements(ioInterfaces.Listener)) {
							this.stopListening();
						};
						if (stream) {
							if (types._implements(stream, ioMixIns.OutputStreamBase)) {
								if (this._implements(ioMixIns.InputStreamBase)) {
									this.onReady.detach(this, this.__pipeOnReady, [stream]);
								} else if (this._implements(ioMixIns.OutputStreamBase)) {
									this.onWrite.detach(this, this.__pipeOnReady, [stream]);
								};
								if (this._implements(ioMixIns.OutputStreamBase)) {
									this.onFlush.detach(this, this.__pipeOnFlush, [stream]);
								};
							};
						} else {
							if (this._implements(ioMixIns.InputStreamBase)) {
								this.onReady.detach(this, this.__pipeOnReady);
							} else if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onWrite.detach(this, this.__pipeOnReady);
							};
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onFlush.detach(this, this.__pipeOnFlush);
							};
						};
					}),
				}))));
		
		
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.InputStreamBase.$extend(
				{
					$TYPE_NAME: 'InputStream',

					read: doodad.OVERRIDE(function read(/*optional*/options) {
						options = types.extend({}, options, {output: false});
						if (this.getCount(options) > 0) {
							return this.pull(options);
						} else {
							return null;
						};
					}),
				})));
				
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.OutputStreamBase.$extend(
				{
					$TYPE_NAME: 'OutputStream',

					write: doodad.OVERRIDE(function write(raw, /*optional*/options) {
						options = types.extend({}, options, {output: true});
						var data = this.transform({raw: raw}, options);
						this.push(data, options);
					}),
				})));

				
				//=====================================================
				// Text transformable client implementation
				//=====================================================

				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextTransformableBase.$extend(
											ioMixIns.Stream,
											mixIns.Creatable,
				{
					$TYPE_NAME: 'TextTransformable',
					
					__decoder: doodad.PROTECTED( null ),
					__decoderEncoding: doodad.PROTECTED( null ),
					
					$isValidEncoding: doodad.OVERRIDE(function isValidEncoding(encoding) {
						// TODO: Find a better way
						try {
							new _shared.Natives.windowTextDecoder(encoding, {fatal: true});
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
						if (types.isTypedArray(data.raw) && encoding && _shared.Natives.windowTextDecoder) {
							var text = '';
							if ((data.raw !== io.EOF) && (!this.__decoder || (this.__decoderEncoding !== encoding))) {
								if (this.__decoder) {
									text = this.__decoder.decode(null, {stream: false});
								};
								this.__decoder = new _shared.Natives.windowTextDecoder(encoding);
								this.__decoderEncoding = encoding;
							};
							if ((data.raw === io.EOF) && this.__decoder) {
								text += this.__decoder.decode(null, {stream: false});
							} else {
								text += this.__decoder.decode(data.raw, {stream: true});
							};
							data.text = text;
						} else {
							data.text = types.toString(data.raw);
						};
						
						data.valueOf = function valueOf() {
							return this.text;
						};
						
						data.options = options;

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