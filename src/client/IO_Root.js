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

				const doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					mixIns = doodad.MixIns,
					client = doodad.Client,
					io = doodad.IO,
					ioMixIns = io.MixIns,
					ioInterfaces = io.Interfaces;
				

				types.complete(_shared.Natives, {
					windowUint8Array: (types.isNativeFunction(global.Uint8Array) ? global.Uint8Array : undefined),
					windowTextEncoder: (types.isNativeFunction(global.TextEncoder) ? global.TextEncoder : undefined),
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

					__pipeOnData: doodad.PROTECTED(function __pipeOnData(ev) {
						const stream = ev.handlerData[0],
							transform = ev.handlerData[1],
							end = ev.handlerData[2];  // 'true' permits EOF. 'false' just write the trailing data if there are.

						if (stream && _shared.DESTROYED(stream)) {
							this.unpipe(stream);
							return;
						};

						ev.preventDefault();

						const data = ev.data;
						let eof = end && (ev.data.raw === io.EOF);
						let raw = this.transform(data);

						if (transform) {
							const retval = transform(raw);
							if (retval !== undefined) {
								raw = retval;
								if (raw === io.EOF) {
									eof = end;
									raw = null;
								} else {
									eof = false;
								};
							};
						};

						stream.write(raw, {callback: data.defer(), end: eof});
					}),
					
					__pipeOnFlush: doodad.PROTECTED(function __pipeOnFlush(ev) {
						const stream = ev.handlerData[0];
						if (!_shared.DESTROYED(stream)) {
							if (stream.options.flushMode !== 'manual') {
								stream.flush();
							};
						};
					}),
						
					__pipeStreamOnError: doodad.PROTECTED(function __pipeStreamOnError(ev) {
						this.unpipe(ev.obj);
						this.onError(ev);
					}),

					__pipeStreamOnListen: doodad.PROTECTED(function __pipeStreamOnListen(ev) {
						this.listen();
					}),

					__pipeStreamOnStopListening: doodad.PROTECTED(function __pipeStreamOnStopListening(ev) {
						this.stopListening();
					}),

					__pipeStreamOnDestroy: doodad.PROTECTED(function __pipeStreamOnDestroy(ev) {
						this.unpipe(ev.obj);
					}),

					pipe: doodad.OVERRIDE(function pipe(stream, /*optional*/options) {
						if (tools.indexOf(this.__pipes, stream) >= 0) {
							// Stream already piped
							return stream;
						};
						const transform = types.get(options, 'transform'),
							end = types.get(options, 'end', true),
							autoListen = types.get(options, 'autoListen', true),
							isBuffered = this._implements(ioMixIns.BufferedStreamBase),
							isListener = this._implements(ioMixIns.Listener);
						if (types._implements(stream, ioMixIns.OutputStreamBase)) { // doodad-js streams
							if (isBuffered) {
								this.onReady.attach(this, this.__pipeOnData, null, [stream, transform, end]);
								this.onFlush.attach(this, this.__pipeOnFlush, null, [stream]);
							} else {
								this.onData.attach(this, this.__pipeOnData, null, [stream, transform, end]);
							};
							stream.onError.attachOnce(this, this.__pipeStreamOnError);
							stream.onDestroy.attachOnce(this, this.__pipeStreamOnDestroy);
							if (isListener && stream._implements(ioMixIns.Listener)) {
								stream.onListen.attach(this, this.__pipeStreamOnListen);
								stream.onStopListening.attach(this, this.__pipeStreamOnStopListening);
							};
						} else {
							throw new types.TypeError("'stream' must implement 'Doodad.IO.MixIns.OutputStreamBase'.");
						};
						if (autoListen && isListener) {
							this.listen();
						};
						this.__pipes[this.__pipes.length] = stream;
						return stream;
					}),
					
					unpipe: doodad.OVERRIDE(function unpipe(/*optional*/stream) {
						let pos = -1;
						if (stream) {
							pos = tools.indexOf(this.__pipes, stream);
							if (pos < 0) {
								// Stream not piped
								return this;
							};
						};
						const isBuffered = this._implements(ioMixIns.BufferedStreamBase),
							isListener = this._implements(ioMixIns.Listener);
						if (isListener) {
							this.stopListening();
						};
						if (stream) {
							let datas = [stream];
							if (isBuffered) {
								this.onReady.detach(this, this.__pipeOnData, datas);
								this.onFlush.detach(this, this.__pipeOnFlush, datas);
							} else {
								this.onData.detach(this, this.__pipeOnData, datas);
							};
							stream.onError.detach(this, this.__pipeStreamOnError);
							stream.onDestroy.detach(this, this.__pipeStreamOnDestroy);
							if (isListener && stream._implements(ioMixIns.Listener)) {
								stream.onListen.detach(this, this.__pipeStreamOnListen);
								stream.onStopListening.detach(this, this.__pipeStreamOnStopListening);
							};
						} else {
							if (isBuffered) {
								this.onReady.detach(this, this.__pipeOnData);
								this.onFlush.detach(this, this.__pipeOnFlush);
							} else {
								this.onData.detach(this, this.__pipeOnData);
							};
							tools.forEach(this.__pipes, function(stream) {
								stream.onError.detach(this, this.__pipeStreamOnError);
								stream.onDestroy.detach(this, this.__pipeStreamOnDestroy);
								if (isListener && types._implements(stream, ioMixIns.Listener)) {
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
							let data = this.pull(options);
							return this.transform(data, options);
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
						return !this.__flushing && (this.getCount() < this.options.bufferSize);
					}),

					write: doodad.OVERRIDE(function write(raw, /*optional*/options) {
						const callback = types.get(options, 'callback');

						let end = types.get(options, 'end'),
							eof = false,
							bof = !end && types.get(options, 'bof'),
							data = null;

						if (types.isNothing(raw)) {
							if (end) {
								raw = io.EOF;
							} else if (bof) {
								raw = io.BOF;
							} else {
								callback && callback(null);
								return;
							};
						};

						const encoding = types.get(options, 'encoding', this.options.encoding);

						if (types._instanceof(raw, io.Data)) {
							if (raw.stream) {
								eof = (raw.raw === io.EOF);
								bof = !eof && (raw.raw === io.BOF);
								raw = raw.stream.transform(raw);
								data = this.transform(raw, {encoding: encoding}); //, options);
							} else {
								// A detached data-object has been written.
								data = raw;
								eof = (data.raw === io.EOF);
								bof = !eof && (data.raw === io.BOF);
							};
						} else {
							data = this.transform(raw, {encoding: encoding}); //, options);
							eof = (data.raw === io.EOF);
							bof = !eof && (data.raw === io.BOF);
						};

						if (types.isNothing(end)) {
							end = eof;
						};

						data.attach(this);

						if (callback) {
							data.chain(callback);
						};

						const ev = new doodad.Event(data);
						this.onWrite(ev);

						if (ev.prevent) {
							if (!data.consumed) {
								data.consume();
							};
						} else {
							if (this.options.flushMode === 'half') {
								if (end) {
									if (eof) {
										this.push(data);
										this.flush();
									} else {
										this.push(data);
										this.push(new io.Data(io.EOF));
										this.flush();
									};
								} else if (eof) {
									data.consume();
								} else if (bof && (data.raw !== io.BOF)) {
									this.push(data);
									this.push(new io.Data(io.BOF));
									this.flush();
								} else {
									this.push(data);
									this.flush();
								};
							} else {
								if (end) {
									if (eof) {
										this.push(data);
									} else {
										data.chain(doodad.Callback(this, function(err) {
											if (!err) {
												this.push(new io.Data(io.EOF));
											};
										}));
										this.push(data);
									};
								} else if (eof) {
									data.consume();
								} else if (bof && (data.raw !== io.BOF)) {
									data.chain(doodad.Callback(this, function(err) {
										if (!err) {
											this.push(new io.Data(io.BOF));
										};
									}));
									this.push(data);
								} else {
									this.push(data);
								};
							};
						};
					}),

				})));


				//=====================================================
				// Text transformable client implementation
				//=====================================================

				io.ADD('EncodingAliases', types.freezeObject(types.nullObject({
					// TODO: Add other aliases.
					'utf8': 'utf-8',
					//'latin1': 'iso-8859-1',
				})));


				io.REGISTER(io.BinaryData.$inherit(
					/*typeProto*/
					{
						$TYPE_NAME: 'TextData',
						$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextData')), true) */,

						$validateEncoding: function $validateEncoding(encoding, /*optional*/dontThrow) {
							encoding = encoding.toLowerCase();
							if (encoding in io.EncodingAliases) {
								encoding = io.EncodingAliases[encoding];
							};
							if ((encoding !== 'raw') && (encoding !== 'utf-8')) {
								if (dontThrow) {
									return null;
								} else {
									throw new types.NotSupported("At the time of writing, text encoding other than 'utf-8' was not supported in browsers by default, without the need of loading a huge library.");
								};
							};
							return encoding;
						},

						$encode: function $encode(str, encoding, /*optional*/options) {
							// NOTE: You must call "$validateEncoding" before if not already done.
							// NOTE: Since the W3C spec has been written for "TextEncoder", support for formats other than 'utf-8' has been removed !!!!
							// FUTURE: See if the W3C has finally changed their mind.
							// TODO: Maybe allow the use of the "text-encoding" package from NPM.
							if (types.isString(str)) {
								if (encoding !== 'utf-8') {
									throw new types.Error("Only 'utf-8' text encoding is supported.");
								};
								const encoder = new _shared.Natives.windowTextEncoder(/*encoding*/);
								return encoder.encode(str);
							} else {
								throw new types.Error("Invalid string.");
							};
						},

						$decode: function $decode(buf, encoding, /*optional*/options) {
							// NOTE: You must call "$validateEncoding" before if not already done.
							const isView = types.isTypedArray(buf);
							if (isView || types.isArrayBuffer(buf)) {
								if (isView) {
									buf = buf.buffer;
								};
								const decoder = new _shared.Natives.windowTextDecoder(encoding);
								return decoder.decode(buf, {stream: false});
							} else {
								throw new types.Error("Invalid 'raw' data.");
							};
						},
					},
					/*instanceProto*/
					{
						_new: types.SUPER(function _new(/*optional*/raw, /*optional*/options) {
							const encoding = types.get(options, 'encoding');
							if (encoding === 'raw') {
								throw new types.Error("Invalid encoding for text data.");
							};
							this._super(raw, options);
 						}),
					}
				));
				

				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Transformable.$extend(
											ioMixIns.Stream,
				{
					$TYPE_NAME: 'TextTransformable',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextTransformableMixIn')), true) */,
					
					__decoder: doodad.PROTECTED( null ),
					__decoderEncoding: doodad.PROTECTED( null ),
					
					$isValidEncoding: doodad.REPLACE(doodad.TYPE(function(encoding) {
						return (io.TextData.$validateEncoding(encoding, true) !== null);
					})),

					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'encoding', types.getIn(this.options, 'encoding', 'utf-8'));

						this._super(options);
					}),
					
					transform: doodad.REPLACE(function transform(raw, /*optional*/options) {
						if (!options) {
							options = {};
						};
						let encoding = types.get(options, 'encoding');
						if (encoding) {
							encoding = io.TextData.$validateEncoding(encoding);
						} else {
							encoding = this.options.encoding || 'utf-8';
						};
						options.encoding = encoding;
						let returnText = false;
						if (types._instanceof(raw, io.Data)) {
							raw = raw.valueOf('raw');
							returnText = true;
						};
						if (types._instanceof(raw, io.Signal)) {
							let trailing = null;
							if (this.__decoder) {
								trailing = this.__decoder.decode(null, {stream: false}) || null;
							};
							this.__decoder = null;
							this.__decoderEncoding = null;
							if (returnText) {
								return trailing;
							} else {
								const dta = new io.TextData(raw, options);
								dta.trailing = trailing;
								return dta;
							};
						} else if (encoding && (types.isArrayBuffer(raw) || types.isTypedArray(raw))) {
							let text = '';
							if (this.__decoderEncoding !== encoding) {
								if (this.__transformDecoder) {
									text = this.__decoder.decode(null, {stream: false}) || '';
									this.__decoder = null;
								};
								this.__decoder = new _shared.Natives.windowTextDecoder(encoding);
								this.__decoderEncoding = encoding;
							};
							text += this.__decoder.decode(raw, {stream: true}) || '';
							if (returnText) {
								return text || null;
							} else {
								return new io.TextData(text || null, options);
							};
						} else {
							const text = types.toString(raw);
							if (returnText) {
								return text;
							} else {
								return new io.TextData(text, options);
							};
						};
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this._super();
						
						this.__decoder = null;
						this.__decoderEncoding = null;
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.__decoder = null;
						this.__decoderEncoding = null;
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