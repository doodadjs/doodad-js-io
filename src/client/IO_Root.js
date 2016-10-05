//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: IO_Root.js - Client IO Root
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
		DD_MODULES['Doodad.IO/root'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
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

					//__pipes: doodad.PROTECTED(null),

					destroy: doodad.OVERRIDE(function destroy() {
						if (this._implements(ioMixIns.Listener)) {
							this.stopListening();
						};

						this._super();
					}),

					getBuffer: doodad.PROTECTED(doodad.MUST_OVERRIDE()), // function getBuffer(/*optional*/options)
					clearBuffer: doodad.PROTECTED(doodad.MUST_OVERRIDE()), // function clearBuffer(/*optional*/options)
					clearBuffers: doodad.PROTECTED(doodad.MUST_OVERRIDE()), // function clearBuffers()
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.clearBuffers();
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this._super();

						this.clearBuffers();
						//this.__pipes = [];
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
							delete data.options.callback;
							callback();
						};
					}),
					
					__emitPushEvent: doodad.PROTECTED(doodad.MUST_OVERRIDE()),  // function(ev, options)

					push: doodad.OVERRIDE(function push(data, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(data));
						
						var noEvents = (this._implements(ioMixIns.Listener) && !this.isListening()) || types.get(options, 'noEvents', false);
						if (!noEvents) {
							var ev = new doodad.Event(data);
							
							this.__emitPushEvent(ev, options);
							if (ev.prevent) {
								// Consumed
								var callback = types.get(ev.data.options, 'callback');
								if (callback) {
									delete ev.data.options.callback;
									callback();
								};
								return;
							};
						};
						
						this.__pushInternal(data, options);
						
						const output = types.get(options, 'output', false);
						if (output) {
							if (data.raw === io.EOF) {
								this.onEOF(new doodad.Event({output: output}));
							};
						};

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
							delete data.options.callback;
							callback(); // sync
						};

						return data;
					}),
					
					pull: doodad.OVERRIDE(function(/*optional*/options) {
						var data = this.__pullInternal(options);

						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(data));

						const output = types.get(options, 'output', false);
						if (!output) {
							if (data.raw === io.EOF) {
								this.onEOF(new doodad.Event({output: output}));
							};
						};

						return data;
					}),

					__pipeOnReady: doodad.PROTECTED(function __pipeOnReady(ev) {
						ev.preventDefault();
						
						var stream = ev.handlerData[0],
							transform = ev.handlerData[1],
							end = ev.handlerData[2],
							data = ev.data;
							
						if (transform) {
							var retval = transform(data);
							if (retval !== undefined) {
								data = retval;
							};
						};

						if (data.raw === io.EOF) {
							if (end) {
								stream.write(io.EOF, data.options);
							};
						} else {
							stream.write(data.valueOf(), data.options);
						};
					}),
					
					__pipeOnFlush: doodad.PROTECTED(function __pipeOnFlush(ev) {
						var stream = ev.handlerData[0];
						stream.flush();
					}),
						
					pipe: doodad.OVERRIDE(function pipe(stream, /*optional*/options) {
						//if (tools.indexOf(this.__pipes, stream) >= 0) {
						//	return;
						//};
						const transform = types.get(options, 'transform');
						const end = types.get(options, 'end', true);
						if (!types._implements(stream, ioMixIns.OutputStreamBase)) {
							throw new types.TypeError("Stream must implement 'Doodad.IO.MixIns.OutputStreamBase'.");
						};
						if (this._implements(ioMixIns.InputStreamBase)) {
							this.onReady.attach(this, this.__pipeOnReady, null, [stream, transform, end]);
						} else if (this._implements(ioMixIns.OutputStreamBase)) {
							this.onWrite.attach(this, this.__pipeOnReady, null, [stream, transform, end]);
						};
						if (this._implements(ioMixIns.OutputStreamBase)) {
							this.onFlush.attach(this, this.__pipeOnFlush, null, [stream]);
						};
						if (this._implements(ioMixIns.Listener)) {
							this.listen();
						};
						//this.__pipes.push(stream);
					}),
					
					unpipe: doodad.OVERRIDE(function unpipe(/*optional*/stream) {
						//const pos = tools.indexOf(this.__pipes, stream);
						//if (pos < 0) {
						//	return;
						//};
						if (this._implements(ioMixIns.Listener)) {
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
						//this.__pipes.splice(pos, 1);
					}),
				}))));


				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
									ioMixIns.InputStreamBase,
				{
					$TYPE_NAME: 'InputStream',

					__inputBuffer: doodad.PROTECTED(null),

					getBuffer: doodad.OVERRIDE(function getBuffer(/*optional*/options) {
						const isOutput = types.get(options, 'output', false);
						
						if (isOutput) {
							return this._super(options);
						} else {
							this.overrideSuper();
							return this.__inputBuffer;
						};
					}),

					clearBuffer: doodad.OVERRIDE(function clearBuffer(/*optional*/options) {
						const isOutput = types.get(options, 'output', false);

						if (!isOutput) {
							this.__inputBuffer = [];
						};
						
						this._super(options);
					}),
					
					clearBuffers: doodad.OVERRIDE(function clearBuffers() {
						this._super();
						
						this.__inputBuffer = [];
					}),

					__emitPushEvent: doodad.OVERRIDE(function __emitPushEvent(ev, options) {
						const isOutput = types.get(options, 'output', false);
						
						if (!isOutput) {
							this.onReady(ev);
						};
						
						this._super(ev, options);
					}),

					read: doodad.OVERRIDE(function read(/*optional*/options) {
						options = types.extend({}, options, {output: false});
						if (this.getCount(options) > 0) {
							return this.pull(options);
						} else {
							return null;
						};
					}),
				})));
				
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
									ioMixIns.OutputStreamBase,
				{
					$TYPE_NAME: 'OutputStream',

					__outputBuffer: doodad.PROTECTED(null),

					getBuffer: doodad.OVERRIDE(function getBuffer(/*optional*/options) {
						const isOutput = types.get(options, 'output', false);
						
						if (isOutput) {
							this.overrideSuper();
							return this.__outputBuffer;
						} else {
							return this._super(options);
						};
					}),

					clearBuffer: doodad.OVERRIDE(function clearBuffer(/*optional*/options) {
						const isOutput = types.get(options, 'output', false);

						if (isOutput) {
							this.__outputBuffer = [];
						};
						
						this._super(options);
					}),

					clearBuffers: doodad.OVERRIDE(function clearBuffers() {
						this._super();
						
						this.__outputBuffer = [];
					}),

					__emitPushEvent: doodad.OVERRIDE(function __emitPushEvent(ev, options) {
						const isOutput = types.get(options, 'output', false);
						
						if (isOutput) {
							this.onWrite(ev);
						};
						
						this._super(ev, options);
					}),

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
	},
};
//! END_MODULE()