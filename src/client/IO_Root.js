//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2018 Claude Petit, licensed under Apache License version 2.0\n", true)
	// doodad-js - Object-oriented programming framework
	// File: IO_Root.js - Client IO Root
	// Project home: https://github.com/doodadjs/
	// Author: Claude Petit, Quebec city
	// Contact: doodadjs [at] gmail.com
	// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
	// License: Apache V2
	//
	//	Copyright 2015-2018 Claude Petit
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

//! IF_SET("mjs")
//! ELSE()
	"use strict";
//! END_IF()

exports.add = function add(modules) {
	modules = (modules || {});
	modules['Doodad.IO/root'] = {
		version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
		dependencies: [
			'Doodad.IO',
		],

		create: function create(root, /*optional*/_options, _shared) {
			const doodad = root.Doodad,
				types = doodad.Types,
				tools = doodad.Tools,
				//mixIns = doodad.MixIns,
				io = doodad.IO,
				//ioInterfaces = io.Interfaces,
				ioMixIns = io.MixIns;

			tools.complete(_shared.Natives, {
				windowTextEncoder: (types.isFunction(global.TextEncoder) ? global.TextEncoder : null),
				windowTextDecoder: (types.isFunction(global.TextDecoder) ? global.TextDecoder : null),
			});


			//=========================================
			// Data objects (continued)
			//=========================================

			io.ADD('EncodingAliases', types.freezeObject(tools.nullObject({
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

					toString: function toString() {
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
							if (encoding === 'raw') {
								// Raw binary. We assume UTF-8 like Node.Js.
								encoding = 'utf-8';
							};
							const decoder = new _shared.Natives.windowTextDecoder(encoding);
							const text = decoder.decode(buf, {stream: false}) || '';
							return text;
						};
					},
				}
			));

			//=====================================================
			// Interfaces (continued)
			//=====================================================

			ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.TransformableBase.$extend(
				ioMixIns.StreamBase,
				{
					$TYPE_NAME: 'TextTransformableBase',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextTransformableBaseMixInBase')), true) */,

					$isValidEncoding: doodad.OVERRIDE(function(encoding) {
						if (io.TextData.$validateEncoding(encoding, true) !== null) {
							this.overrideSuper();
							return true;
						} else {
							return this._super(encoding);
						};
					}),

					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'encoding', types.getIn(this.options, 'encoding', 'utf-8'));

						this._super(options);
					}),
				}))));


			ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextTransformableBase.$extend(
				{
					$TYPE_NAME: 'TextTransformableIn',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextTransformableInMixIn')), true) */,

					__decoderIn: doodad.PROTECTED( null ),
					__decoderInEncoding: doodad.PROTECTED( null ),

					transformIn: doodad.REPLACE(function transformIn(raw, /*optional*/options) {
						let encoding = types.get(options, 'encoding');
						if (encoding) {
							encoding = io.TextData.$validateEncoding(encoding);
						} else {
							encoding = this.options.encoding || 'raw';
						};
						if (encoding === 'raw') {
							// Raw binary. We assume UTF-8 like Node.Js.
							encoding = 'utf-8';
						};

						if (types._instanceof(raw, io.Signal)) {
							let trailing = null;
							const decoder = this.__decoderIn;
							if (decoder) {
								trailing = decoder.decode(null, {stream: false}) || null;
							};
							this.__decoderIn = null;
							this.__decoderInEncoding = null;
							if (!options) {
								options = {};
							};
							options.encoding = encoding;
							const dta = new io.TextData(raw, options);
							dta.trailing = trailing;
							return dta;
						} else {
							if (types.isArrayBuffer(raw) || types.isTypedArray(raw)) {
								let text = '';
								let decoder = this.__decoderIn;
								const decoderEncoding = this.__decoderInEncoding;
								if (decoderEncoding !== encoding) {
									if (decoder) {
										text = decoder.decode(null, {stream: false}) || '';
										this.__decoderIn = null;
										this.__decoderInEncoding = null;
									};
									decoder = new _shared.Natives.windowTextDecoder(encoding);
									this.__decoderIn = decoder;
									this.__decoderInEncoding = encoding;
								};
								text += decoder.decode(raw, {stream: true}) || '';
								if (!options) {
									options = {};
								};
								options.encoding = encoding;
								return new io.TextData(text || null, options);
							} else {
								const text = (types.isNothing(raw) ? null : types.toString(raw) || null);
								if (!options) {
									options = {};
								};
								options.encoding = encoding;
								return new io.TextData(text, options);
							};
						};
					}),

					clear: doodad.OVERRIDE(function clear() {
						this._super();

						this.__decoderIn = null;
						this.__decoderInEncoding = null;
					}),

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__decoderIn = null;
						this.__decoderInEncoding = null;
					}),
				})));

			ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextTransformableBase.$extend(
				{
					$TYPE_NAME: 'TextTransformableOut',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextTransformableOutMixIn')), true) */,

					__decoderOut: doodad.PROTECTED( null ),
					__decoderOutEncoding: doodad.PROTECTED( null ),

					transformOut: doodad.REPLACE(function transformOut(data, /*optional*/options) {
						if (types._instanceof(data, io.TextData)) {
							return data.toString() || null;
						} else if (types._instanceof(data, io.BinaryData)) {
							const eof = (data.raw === io.EOF);
							const value = data.valueOf();
							let encoding = types.get(options, 'encoding');
							if (encoding) {
								encoding = io.TextData.$validateEncoding(encoding);
							} else {
								encoding = this.options.encoding || 'raw';
							};
							if (encoding === 'raw') {
								// Raw binary. We assume UTF-8 like Node.Js.
								encoding = 'utf-8';
							};
							if (types.isArrayBuffer(value) || types.isTypedArray(value)) {
								let decoder = this.__decoderOut;
								const decoderEncoding = this.__decoderOutEncoding;
								let text = '';
								if (decoderEncoding !== encoding) {
									if (decoder) {
										text = decoder.decode(null, {stream: false}) || '';
										this.__decoderOut = null;
										this.__decoderOutEncoding = null;
									};
									decoder = new _shared.Natives.windowTextDecoder(encoding);
									if (!eof) {
										this.__decoderOut = decoder;
										this.__decoderOutEncoding = encoding;
									};
								};
								if (eof) {
									text += decoder.decode(value, {stream: false}) || '';
								} else if (!types.isNothing(value)) {
									text += decoder.decode(value, {stream: true}) || '';
								};
								return text || null;
							} else {
								const text = (types.isNothing(value) ? null : types.toString(value) || null);
								return text;
							};
						} else if (types._instanceof(data, io.Data)) {
							return data.toString() || null;
						};
						return undefined;
					}),

					clear: doodad.OVERRIDE(function clear() {
						this._super();

						this.__decoderOut = null;
						this.__decoderOutEncoding = null;
					}),

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__decoderOut = null;
						this.__decoderOutEncoding = null;
					}),
				})));


			//=====================================================
			// Basic implementations
			//=====================================================

			ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
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
							//transform = ev.handlerData[1],
							end = ev.handlerData[2],  // 'true' permits EOF. 'false' just write the trailing data if there are.
							isBuffered = ev.handlerData[3],
							isInputOnly = ev.handlerData[4];

						if (_shared.DESTROYED(stream)) {
							return;
						};

						if (isInputOnly || isBuffered) {
							ev.preventDefault();
						};

						const data = ev.data;
						const eof = end && (data.raw === io.EOF);
						const bof = !eof && (data.raw === io.BOF);

						// TODO: Re-Implement
						//if (transform) {
						//	const retval = transform(raw);
						//	if (retval !== undefined) {
						//		raw = retval;
						//		eof = false;
						//		bof = false;
						//		if (raw === io.EOF) {
						//			eof = end;
						//			raw = null;
						//		} else if (raw === io.BOF) {
						//			bof = true;
						//		};
						//	};
						//};

						const raw = (this._implements(ioMixIns.TextTransformableOut) && !stream._implements(ioMixIns.TextTransformableIn) ? data.valueOf() : this.transformOut(data));
						try {
							const data2 = stream.write(raw, {eof: eof, bof: bof});
							if (!data2.consumed) {
								data2.chain(data.defer());
							};
						} catch(ex) {
							this.onError(ex);
						};
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
						this.onError(ev);
					}),

					__pipeStreamOnListen: doodad.PROTECTED(function __pipeStreamOnListen(ev) {
						this.listen();
					}),

					__pipeStreamOnStopListening: doodad.PROTECTED(function __pipeStreamOnStopListening(ev) {
						this.stopListening();
					}),

					pipe: doodad.REPLACE(function pipe(stream, /*optional*/options) {
						if (tools.indexOf(this.__pipes, stream) >= 0) {
							// Stream already piped
							return stream;
						};

						const transform = types.get(options, 'transform'),
							end = types.get(options, 'end', true),
							autoListen = types.get(options, 'autoListen', true),
							isListener = this._implements(ioMixIns.Listener),
							isInput = this._implements(ioMixIns.InputStreamBase),
							isOutput = this._implements(ioMixIns.OutputStreamBase),
							isInputOnly = isInput && !isOutput,
							isBuffered = this._implements(ioMixIns.BufferedStreamBase);

						if (types._implements(stream, ioMixIns.OutputStreamBase)) { // doodad-js streams
							const datas = [stream, transform, end, isBuffered, isInputOnly];
							if (isInput) {
								this.onReady.attach(this, this.__pipeOnData, 40, datas);
							} else {
								this.onData.attach(this, this.__pipeOnData, 40, datas);
							};
							if (isBuffered && stream._implements(ioMixIns.BufferedStreamBase)) {
								this.onFlush.attach(this, this.__pipeOnFlush, 40, [stream]);
							};
							stream.onError.attachOnce(this, this.__pipeStreamOnError);
							stream.onDestroy.attachOnce(this, this.__pipeStreamOnDestroy);
							if (isListener && stream._implements(ioMixIns.Listener)) {
								stream.onListen.attach(this, this.__pipeStreamOnListen);
								stream.onStopListening.attach(this, this.__pipeStreamOnStopListening);
							};
						} else {
							throw new types.ValueError("'stream' must implement 'Doodad.IO.MixIns.OutputStreamBase'.");
						};

						this.__pipes[this.__pipes.length] = stream;

						if (autoListen && isListener) {
							this.listen();
						};

						return stream;
					}),

					unpipe: doodad.REPLACE(function unpipe(/*optional*/stream) {
						let pos = -1;
						if (stream) {
							pos = tools.indexOf(this.__pipes, stream);
							if (pos < 0) {
								// Stream not piped
								return this;
							};
						};
						const isListener = this._implements(ioMixIns.Listener),
							isInput = this._implements(ioMixIns.InputStreamBase),
							//isOutput = this._implements(ioMixIns.OutputStreamBase),
							//isInputOnly = isInput && !isOutput,
							isBuffered = this._implements(ioMixIns.BufferedStreamBase);
						if (isListener) {
							this.stopListening();
						};
						if (stream) {
							if (types._implements(stream, ioMixIns.OutputStreamBase)) { // doodad-js streams
								const datas = [stream];
								if (isInput) {
									this.onReady.detach(this, this.__pipeOnData, datas);
								} else {
									this.onData.detach(this, this.__pipeOnData, datas);
								};
								if (isBuffered && stream._implements(ioMixIns.BufferedStreamBase)) {
									this.onFlush.detach(this, this.__pipeOnFlush, datas);
								};
								stream.onError.detach(this, this.__pipeStreamOnError);
								stream.onDestroy.detach(this, this.__pipeStreamOnDestroy);
								if (isListener && stream._implements(ioMixIns.Listener)) {
									stream.onListen.detach(this, this.__pipeStreamOnListen);
									stream.onStopListening.detach(this, this.__pipeStreamOnStopListening);
								};
							};
						} else {
							if (isInput) {
								this.onReady.detach(this, this.__pipeOnData);
							} else {
								this.onData.detach(this, this.__pipeOnData);
							};
							if (isBuffered) {
								this.onFlush.detach(this, this.__pipeOnFlush);
							};
							tools.forEach(this.__pipes, function(stream) {
								if (types._implements(stream, ioMixIns.OutputStreamBase)) {
									stream.onError.detach(this, this.__pipeStreamOnError);
									stream.onDestroy.detach(this, this.__pipeStreamOnDestroy);
								};
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
				})));


			ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
				ioMixIns.InputStreamBase,
				ioMixIns.BufferedStream,
				{
					$TYPE_NAME: 'BufferedInputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedInputStreamMixIn')), true) */,

					__pushInternal: doodad.REPLACE(function __pushInternal(data, /*optional*/options) {
						if (data.consumed) {
							throw new types.Error("Data object has been consumed.");
						};

						const callback = types.get(options, 'callback'),
							next = types.get(options, 'next', false),
							buffer = this.__buffer;

						if (buffer.length >= this.options.bufferSize) {
							throw new types.BufferOverflow();
						};

						data.detach();

						if (next) {
							buffer.unshift(data);
						} else {
							buffer.push(data);
						};

						if (buffer.length >= this.options.bufferSize) {
							if (this.options.flushMode === 'auto') {
								this.flush({callback: callback});
							} else {
								callback && data.chain(callback);
							};
						} else {
							callback && callback(null);
						};
					}),

					__pullInternal: doodad.REPLACE(function __pullInternal(/*optional*/options) {
						const next = types.get(options, 'next', false),
							buffer = this.__buffer;

						if (buffer.length <= 0) {
							return null;
						};

						let data;

						if (next) {
							data = buffer.pop();
						} else {
							data = buffer.shift();
						};

						data.attach(this);

						return data;
					}),
				})));


			ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
				ioMixIns.OutputStreamBase,
				{
					$TYPE_NAME: 'OutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('OutputStreamMixIn')), true) */,
				})));


			ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
				ioMixIns.OutputStreamBase,
				ioMixIns.BufferedStream,
				{
					$TYPE_NAME: 'BufferedOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedOutputStreamMixIn')), true) */,

					__submitInternal: doodad.REPLACE(function __submitInternal(data, /*optional*/options) {
						if (data.consumed) {
							throw new types.Error("Data object has been consumed.");
						};

						const callback = types.get(options, 'callback'),
							next = types.get(options, 'next', false),
							buffer = this.__buffer;

						if (buffer.length >= this.options.bufferSize) {
							throw new types.BufferOverflow();
						};

						data.detach();

						if (next) {
							buffer.unshift(data);
						} else {
							buffer.push(data);
						};

						if (buffer.length >= this.options.bufferSize) {
							if (this.options.flushMode === 'auto') {
								this.flush({callback: callback});
							} else {
								callback && data.chain(callback);
							};
						} else {
							callback && callback(null);
						};
					}),

					canWrite: doodad.REPLACE(function canWrite() {
						return !this.__flushing && (this.__buffer.length < this.options.bufferSize);
					}),
				})));


			ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
				ioMixIns.InputOutputStreamBase,
				{
					$TYPE_NAME: 'InputOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('InputOutputStreamMixIn')), true) */,
				})));

			ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.InputOutputStream.$extend(
				ioMixIns.BufferedInputStream,
				ioMixIns.BufferedOutputStream,
				{
					$TYPE_NAME: 'BufferedInputOutputStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedInputOutputStreamMixIn')), true) */,

					__pushInternal: doodad.REPLACE(function __pushInternal(data, /*optional*/options) {
						const callback = types.get(options, 'callback'),
							next = types.get(options, 'next', false);

						if (next) {
							throw new types.NotAvailable("The option 'next' is not available.");
						};

						if (callback) {
							data.chain(callback);
						};

						data.consume();
					}),
				})));


			//===================================
			// Init
			//===================================
			//return function init(/*optional*/options) {
			//};
		},
	};
	return modules;
};

//! END_MODULE()
