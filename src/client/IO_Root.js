//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: IO_Root.js - Client IO Root
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
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.BufferedStream.$extend(
				{
					$TYPE_NAME: 'Stream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('StreamMixInBase')), true) */,

					__pipes: doodad.PROTECTED(null),

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__pipes = [];
					}),

					destroy: doodad.OVERRIDE(function destroy() {
						this.unpipe();

						this._super();
					}),

					__pipeOnReady: doodad.PROTECTED(function __pipeOnReady(ev) {
						var stream = ev.handlerData[0],
							transform = ev.handlerData[1],
							end = ev.handlerData[2];

						if (stream.isDestroyed()) {
							this.unpipe(stream);
							return;
						};

						var data = ev.data;

						if (transform) {
							var retval = transform(data);
							if (retval !== undefined) {
								data = retval;
							};
						};

						var hasCallback = !!types.get(data.options, 'callback');

						ev.preventDefault();
						data.delayed = true; // Will be consumed later

						var eof = (data.raw === io.EOF);

						var __consume = function consume() {
							this.__consumeData(data);
						};


						if (eof) {
							var value = data.valueOf();
							if (end) {
								var consumeCb = doodad.AsyncCallback(this, __consume);
								if (types.isNothing(value)) {
									stream.write(io.EOF, {callback: consumeCb});
								} else {
									stream.write(value, {callback: doodad.Callback(this, function() {
										stream.write(io.EOF, {callback: consumeCb});
									})});
								};
							} else if (types.isNothing(value)) {
								__consume.call(this);
							} else {
								var consumeCb = doodad.AsyncCallback(this, __consume);
								stream.write(value, {callback: consumeCb});
							};
						} else if (data.raw instanceof io.Signal) {
							__consume.call(this);
						} else {
							var consumeCb = doodad.AsyncCallback(this, __consume);
							stream.write(data.valueOf(), types.extend({}, data.options, {callback: consumeCb}));
						};
					}),
					
					__pipeOnFlush: doodad.PROTECTED(function __pipeOnFlush(ev) {
						var stream = ev.handlerData[0];
						if (!stream.isDestroyed()) {
							if (stream.options.flushMode !== 'manual') {
								stream.flush(stream.options.autoFlushOptions);
							};
						};
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
							return stream;
						};
						var transform = types.get(options, 'transform');
						var end = types.get(options, 'end', true);
						var autoListen = types.get(options, 'autoListen', true);
						if (types._implements(stream, ioMixIns.OutputStreamBase)) { // doodad-js streams
							this.onReady.attach(this, this.__pipeOnReady, null, [stream, transform, end]);
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
						return stream;
					}),
					
					unpipe: doodad.OVERRIDE(function unpipe(/*optional*/stream) {
						var pos = -1;
						if (stream) {
							pos = tools.indexOf(this.__pipes, stream);
							if (pos < 0) {
								// Stream not piped
								return this;
							};
						};
						if (this._implements(ioMixIns.Listener)) {
							this.stopListening();
						};
						if (stream) {
							this.onReady.detach(this, this.__pipeOnReady, [stream]);
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onFlush.detach(this, this.__pipeOnFlush, [stream]);
							};
							stream.onError.detach(this, this.__pipeStreamOnError);
							if (stream._implements(ioMixIns.Listener)) {
								stream.onListen.detach(this, this.__pipeStreamOnListen);
								stream.onStopListening.detach(this, this.__pipeStreamOnStopListening);
							};
						} else {
							this.onReady.detach(this, this.__pipeOnReady);
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onFlush.detach(this, this.__pipeOnFlush);
							};
							tools.forEach(this.__pipes, function(stream) {
								stream.onError.detach(this, this.__pipeStreamOnError);
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
						return this;
					}),
				}))));


				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
									ioMixIns.InputStreamBase,
				{
					$TYPE_NAME: 'InputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('InputStreamMixIn')), true) */,

					read: doodad.OVERRIDE(function read(/*optional*/options) {
						if (this.getCount() > 0) {
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('OutputStreamMixIn')), true) */,

					canWrite: doodad.OVERRIDE(function canWrite() {
						//return !this.__flushing && (this.getCount() < this.options.bufferSize);
						return (this.getCount() < this.options.bufferSize);
					}),

					write: doodad.OVERRIDE(function write(raw, /*optional*/options) {
						var data = this.transform({raw: raw}, options);

						var ev = new doodad.Event(data);
						this.onWrite(ev);

						if (ev.prevent) {
							if (!data.delayed) {
								this.__consumeData(data);
							};
						} else {
							this.push(data);

							if (this.options.flushMode === 'half') {
								this.flush(this.options.autoFlushOptions);
							};
						};
					}),

				})));

				
				//=====================================================
				// Text transformable client implementation
				//=====================================================

				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextTransformableBase.$extend(
											ioMixIns.Stream,
				{
					$TYPE_NAME: 'TextTransformable',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextTransformableMixIn')), true) */,
					
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

					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'encoding', types.getIn(this.options, 'encoding', 'utf-8'));

						this._super(options);
						
						if (!types.getType(this).$isValidEncoding(this.options.encoding)) {
							throw new types.Error("Invalid encoding : '~0~'.", [this.options.encoding]);
						};
					}),
					
					transform: doodad.REPLACE(function transform(data, /*optional*/options) {
						var encoding = types.getDefault(options, 'encoding', this.options.encoding);
						if (encoding && _shared.Natives.windowTextDecoder && types.isTypedArray(data.raw)) {
							var text = '';
							if (!(data.raw instanceof io.Signal) && (!this.__decoder || (this.__decoderEncoding !== encoding))) {
								if (this.__decoder) {
									text = this.__decoder.decode(null, {stream: false});
								};
								this.__decoder = new _shared.Natives.windowTextDecoder(encoding);
								this.__decoderEncoding = encoding;
							};
							if (this.__decoder) {
								if (data.raw === io.EOF) {
									text += this.__decoder.decode(null, {stream: false});
								} else if (!(data.raw instanceof io.Signal)) {
									text += this.__decoder.decode(data.raw, {stream: true});
								};
							};
							data.text = text;
						} else if (!(data.raw instanceof io.Signal)) {
							data.text = types.toString(data.raw);
						};
						
						data.valueOf = function valueOf() {
							return this.text || null;
						};
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