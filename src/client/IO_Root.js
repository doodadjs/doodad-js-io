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

					__pipes: doodad.PROTECTED(null),

					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);

						this.__pipes = [];
					}),

					destroy: doodad.OVERRIDE(function destroy() {
						this.unpipe();

						this._super();
					}),

					__consumeData: doodad.PUBLIC(function __consumeData(data) {
						if (!types.get(data, 'consumed', false)) {
							data.consumed = true;

							// Consumed
							var callback = types.get(data.options, 'callback');
							if (callback) {
								callback();
							};

							if (data.raw === io.BOF) {
								this.onBOF(new doodad.Event(data));
							} else if (data.raw === io.EOF) {
								this.onEOF(new doodad.Event(data));

								this.unpipe();
							};
						};
					}),

					__pushInternal: doodad.PROTECTED(function(data, /*optional*/options) {
						this.__consumeData(data);
					}),
					
					push: doodad.OVERRIDE(function push(data, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(data));

						var prevent = false;
						var noEvents = (this._implements(ioMixIns.Listener) && !this.isListening()) || types.get(options, 'noEvents', false);
						if (!noEvents) {
							prevent = this.__emitPushEvent(data);
						};

						if (prevent) {
							this.__consumeData(data);
						} else {
							if (this.options.autoFlush) {
								if (this.getCount() + 1 >= this.options.bufferSize) {
									this.__pushInternal(data, options);
									this.flush(this.options.autoFlushOptions);
								} else {
									this.__pushInternal(data, options);
								};
							} else {
								this.__pushInternal(data, options);
							};
						};
					}),
					
					__pullInternal: doodad.PROTECTED(doodad.MUST_OVERRIDE()), // function(/*optional*/options) 
					
					pull: doodad.OVERRIDE(function(/*optional*/options) {
						var data = this.__pullInternal(options);

						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(data));

						return data;
					}),

					__pipeOnReady: doodad.PROTECTED(function __pipeOnReady(ev) {
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

						ev.preventDefault();

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
						stream.flush(ev.data.options);
					}),
						
					__pipeStreamOnError: doodad.PROTECTED(function __pipeStreamOnError(ev) {
						this.unpipe(ev.obj);
						this.onError(ev);
					}),

					__pipeStreamOnListen: doodad.PROTECTED(function __pipeStreamOnListen(ev) {
						if (this._implements(ioMixIns.Listener)) {
							this.listen();
						};
					}),

					__pipeStreamOnStopListening: doodad.PROTECTED(function __pipeStreamOnStopListening(ev) {
						if (this._implements(ioMixIns.Listener)) {
							this.stopListening();
						};
					}),

					pipe: doodad.OVERRIDE(function pipe(stream, /*optional*/options) {
						if (tools.indexOf(this.__pipes, stream) >= 0) {
							// Stream already piped
							return;
						};
						var transform = types.get(options, 'transform');
						var end = types.get(options, 'end', true);
						var autoListen = types.get(options, 'autoListen', true);
						if (types._implements(stream, ioMixIns.OutputStreamBase)) { // doodad-js streams
							if (this._implements(ioMixIns.InputStreamBase)) {
								this.onReady.attach(this, this.__pipeOnReady, null, [stream, transform, end]);
							} else if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onWrite.attach(this, this.__pipeOnReady, null, [stream, transform, end]);
							};
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onFlush.attach(this, this.__pipeOnFlush, null, [stream]);
							};
							stream.onError.attachOnce(this, this.__pipeStreamOnError);
							if (stream._implements(ioMixIns.Listener)) {
								stream.onListen.attach(this, this.__pipeStreamOnListen);
								stream.onStopListening.attach(this, this.__pipeStreamOnStopListening);
							};
						} else {
							throw new types.TypeError("'stream' must implement 'Doodad.IO.MixIns.OutputStreamBase'.");
						};
						if (autoListen && this._implements(ioMixIns.Listener)) {
							this.listen();
						};
						this.__pipes[this.__pipes.length] = stream;
					}),
					
					unpipe: doodad.OVERRIDE(function unpipe(/*optional*/stream) {
						var pos = -1;
						if (stream) {
							pos = tools.indexOf(this.__pipes, stream);
							if (pos < 0) {
								// Stream not piped
								return;
							};
						};
						if (this._implements(ioMixIns.Listener)) {
							this.stopListening();
						};
						if (stream) {
							if (types._implements(stream, ioMixIns.OutputStreamBase)) { // doodad-js streams
								if (this._implements(ioMixIns.InputStreamBase)) {
									this.onReady.detach(this, this.__pipeOnReady, [stream]);
								} else if (this._implements(ioMixIns.OutputStreamBase)) {
									this.onWrite.detach(this, this.__pipeOnReady, [stream]);
								};
								if (this._implements(ioMixIns.OutputStreamBase)) {
									this.onFlush.detach(this, this.__pipeOnFlush, [stream]);
								};
							};
							stream.onError.detach(this, this.__pipeStreamOnError);
							if (stream._implements(ioMixIns.Listener)) {
								stream.onListen.detach(this, this.__pipeStreamOnListen);
								stream.onStopListening.detach(this, this.__pipeStreamOnStopListening);
							};
						} else {
							if (this._implements(ioMixIns.InputStreamBase)) {
								this.onReady.detach(this, this.__pipeOnReady);
							};
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onWrite.detach(this, this.__pipeOnReady);
								this.onFlush.detach(this, this.__pipeOnFlush);
							};
							tools.forEach(this.__pipes, function(stream) {
								if (types._implements(stream, ioMixIns.OutputStreamBase)) {
									stream.onError.detach(this, this.__pipeStreamOnError);
								};
								if (types._implements(stream, ioMixIns.Listener)) {
									stream.onListen.detach(this, this.__pipeStreamOnListen);
									stream.onStopListening.detach(this, this.__pipeStreamOnStopListening);
								};
							}, this);
						};
						if (pos >= 0) {
							this.__pipes.splice(pos, 1);
						} else {
							this.__pipes = [];
						};
					}),
				}))));


				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.Stream.$extend(
				{
					$TYPE_NAME: 'BufferedStream',

					__buffer: doodad.PROTECTED(null),

					clearBuffer: doodad.PUBLIC(function clearBuffer() {
						this.__buffer = [];
					}),

					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.clearBuffer();
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this._super();

						this.clearBuffer();
					}),
					
					getCount: doodad.OVERRIDE(function getCount() {
						return this.__buffer.length;
					}),

					__pushInternal: doodad.REPLACE(function __pushInternal(data, /*optional*/options) {
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

						this.__consumeData(data);
					}),
					
					__pullInternal: doodad.OVERRIDE(function __pullInternal(/*optional*/options) {
						if (this.getCount() <= 0) {
							throw new types.BufferOverflow();
						};

						var next = types.get(options, 'next', false),
							buffer = this.__buffer;

						var data;

						if (next) {
							data = buffer.pop();
						} else {
							data = buffer.shift();
						};

						return data;
					}),
				}))));

				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
									ioMixIns.InputStreamBase,
				{
					$TYPE_NAME: 'InputStream',

					__emitPushEvent: doodad.OVERRIDE(function __emitPushEvent(data) {
						var prevent = this._super(data);

						if (!prevent) {
							var ev = new doodad.Event(data);

							this.onReady(ev);

							prevent = ev.prevent;
						};

						return prevent;
					}),

					read: doodad.OVERRIDE(function read(/*optional*/options) {
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

					canWrite: doodad.OVERRIDE(function canWrite() {
						return (this.getCount() < this.options.bufferSize);
					}),

					write: doodad.OVERRIDE(function write(raw, /*optional*/options) {
						var data = this.transform({raw: raw}, options);
						
						var ev = new doodad.Event(data);
						this.onWrite(ev);

						if (ev.prevent) {
							this.__consumeData(data);
						} else {
							if ((data.raw === io.EOF) && !this.canWrite()) {
								this.onFlush.attachOnce(this, function() {
									this.push(data, options);
								});
							} else {
								this.push(data, options);
							};
						};
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
						if (_shared.Natives.windowTextDecoder) {
							try {
								new _shared.Natives.windowTextDecoder(encoding, {fatal: true});
								return true;
							} catch(o) {
								return false;
							};
						} else {
							return true; // !
						};
					}),
					
					$decode: doodad.PUBLIC(function $decode(buf, encoding) {
						if (encoding && _shared.Natives.windowTextDecoder && types.isTypedArray(buf)) {
							var decoder = new _shared.Natives.windowTextDecoder(encoding);
							return decoder.decode(buf, {stream: false});
						} else {
							return types.toString(buf);
						};
					}),

					create: doodad.OVERRIDE(function create(/*paramarray*/) {
						this._super.apply(this, arguments);
						
						types.getDefault(this.options, 'encoding', 'utf-8');

						if (!types.getType(this).$isValidEncoding(this.options.encoding)) {
							throw new types.Error("Invalid encoding : '~0~'.", [this.options.encoding]);
						};
					}),
					
					transform: doodad.REPLACE(function transform(data, /*optional*/options) {
						var encoding = types.get(options, 'encoding', this.options.encoding);
						if (encoding && _shared.Natives.windowTextDecoder && types.isTypedArray(data.raw)) {
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