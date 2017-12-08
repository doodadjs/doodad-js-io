//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: IO_Root.js - Node.js IO Root
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


//! IF_SET("mjs")
	// TODO: Make "iconv-lite" optional... For the moment, we can't !
	//! INJECT("import {default as nodeIConv} from 'iconv-lite';")

	//! INJECT("import {default as nodeStringDecoder} from 'string_decoder';")
//! ELSE()
	let nodeIConv = null;
	try {
		nodeIConv = require('iconv-lite');
	} catch(ex) {
	};

	const nodeStringDecoder = require('string_decoder');
//! END_IF()


const nodeStringDecoderStringDecoder = nodeStringDecoder.StringDecoder;


exports.add = function add(DD_MODULES) {
	DD_MODULES = (DD_MODULES || {});
	DD_MODULES['Doodad.IO/root'] = {
		version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
		dependencies: [
			'Doodad.NodeJs.IO',
		],
			
		create: function create(root, /*optional*/_options, _shared) {
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
				nodejsIOInterfaces = nodejsIO.Interfaces;

				
			tools.complete(_shared.Natives, {
				windowUint8Array: global.Uint8Array,

				globalBuffer: global.Buffer,
				globalBufferIsEncoding: global.Buffer.isEncoding.bind(global.Buffer),
				globalBufferFrom: global.Buffer.from.bind(global.Buffer),
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
						if (encoding === 'raw') {
							// Internally accepted encoding.
						} else if (nodeIConv) {
							if (!nodeIConv.encodingExists(encoding)) {
								if (dontThrow) {
									return null;
								} else {
									throw new types.NotSupported("The '~0~' text encoding is not supported or recognized by 'iconv-lite'.", [encoding]);
								};
							};
						} else if ((encoding === 'base64') || (encoding === 'hex') || (encoding === 'binary') || !_shared.Natives.globalBufferIsEncoding(encoding)) {
							if (dontThrow) {
								return null;
							} else {
								throw new types.NotSupported("The '~0~' text encoding is not supported or recognized by Node.Js, or not allowed (like 'base64', 'hex' and 'binary'). Please install 'iconv-lite'.", [encoding]);
							};
						};
						return encoding;
					},

					$encode: function $encode(str, encoding, /*optional*/options) {
						// NOTE: You must call "$validateEncoding" before if not already done.
						if (types.isString(str)) {
							if (nodeIConv) {
								// iconv-lite
								return nodeIConv.encode(str, encoding, options);
							} else {
								return _shared.Natives.globalBufferFrom(str, encoding);
							};
						} else {
							throw new types.Error("Invalid string.");
						};
					},

					$decode: function $decode(buf, encoding, /*optional*/options) {
						// NOTE: You must call "$validateEncoding" before if not already done.
						if (types.isTypedArray(buf) || types.isArrayBuffer(buf)) {
							if (nodeIConv) {
								// iconv-lite
								return nodeIConv.decode(buf, encoding, options);
							} else {
								// StringDecoder
								const decoder = new nodeStringDecoderStringDecoder(encoding);
								return decoder.end(buf);
							};
						} else {
							throw new types.Error("Invalid buffer.");
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
							let decoder = null;
							if (nodeIConv) {
								// iconv-lite
								decoder = nodeIConv.getDecoder(encoding);
							} else {
								// StringDecoder
								decoder = new nodeStringDecoderStringDecoder(encoding);
							};
							let text = decoder.write(buf) || '';
							text += decoder.end() || '';
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
							trailing = decoder.end() || null;
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
							let decoder = this.__decoderIn;
							const decoderEncoding = this.__decoderInEncoding;
							let text = '';
							if (decoderEncoding !== encoding) {
								if (decoder) {
									text = decoder.end() || '';
									this.__decoderIn = null;
									this.__decoderInEncoding = null;
								};
								if (nodeIConv) {
									// iconv-lite
									decoder = nodeIConv.getDecoder(encoding);
								} else {
									// StringDecoder
									decoder = new nodeStringDecoderStringDecoder(encoding);
								};
								this.__decoderIn = decoder;
								this.__decoderInEncoding = encoding;
							};
							text += decoder.write(raw) || '';
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
									text = decoder.end() || '';
									this.__decoderOut = null;
									this.__decoderOutEncoding = null;
								};
								if (nodeIConv) {
									// iconv-lite
									decoder = nodeIConv.getDecoder(encoding);
								} else {
									// StringDecoder
									decoder = new nodeStringDecoderStringDecoder(encoding);
								};
								if (!eof) {
									this.__decoderOut = decoder;
									this.__decoderOutEncoding = encoding;
								};
							};
							if (eof) {
								text += decoder.end(value) || '';
							} else if (!types.isNothing(value)) {
								text += decoder.write(value) || '';
							};
							return text || null;
						} else {
							const text = (types.isNothing(value) ? null : types.toString(value) || null);
							return text;
						};
					} else if (types._instanceof(data, io.Data)) {
						return data.toString() || null;
					};
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
							mixIns.NodeEvents,
			{
				$TYPE_NAME: 'Stream',
				$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('StreamMixInBase')), true) */,

				__pipes: doodad.PROTECTED(null),

				$extend: doodad.SUPER(function $extend(/*paramarray*/) {
					const args = types.toArray(arguments);
					const isInput = this._implements(ioMixIns.InputStreamBase) 
									|| 
									tools.some(args, function(arg) {return types._implements(arg, ioMixIns.InputStreamBase); }),
						isOutput = this._implements(ioMixIns.OutputStreamBase) 
									|| 
									tools.some(args, function(arg) {return types._implements(arg, ioMixIns.OutputStreamBase); });
					let _interface = null;
					if (isInput && isOutput) {
						_interface = nodejsIOInterfaces.ITransform;
					} else if (isInput) {
						_interface = nodejsIOInterfaces.IReadable;
					} else if (isOutput) {
						_interface = nodejsIOInterfaces.IWritable;
					};
					if (_interface && !this._implements(_interface)) {
						args.unshift(_interface);
					};
					return this._super.apply(this, args);
				}),

				reset: doodad.OVERRIDE(function reset() {
					this._super();

					this.__pipes = [];
				}),

				destroy: doodad.OVERRIDE(function destroy() {
					this.unpipe();

					this._super();
				}),

				onError: doodad.OVERRIDE(function onError(ev) {
					const cancelled = this._super(ev);

					const istream = this.getInterface(nodejsIOInterfaces.IStream);
					if (istream) {
						if (types.isEntrant(istream, 'onerror') && (istream.onerror.getCount() > 0)) {
							// <PRB> Node.Js re-emits 'error'.
							const noop = function noop(err) {};

							istream.onerror.attachOnce(null, noop);

							try {
								const emitted = istream.onerror(ev.error);

								if (emitted) {
									ev.preventDefault();
								};

							} catch(ex) {
								throw ex;

							} finally {
								istream.onerror.detach(null, noop);
							};
						};
					};

					// NOTE: Commented out to give a chance to the error to propagate.
					//this.unpipe();

					return cancelled;
				}),

				__pipeOnData: doodad.PROTECTED(function __pipeOnData(ev) {
					const stream = ev.handlerData[0],
						transform = ev.handlerData[1],
						end = ev.handlerData[2],  // 'true' permits EOF. 'false' just writes the trailing data when there is.
						isBuffered = ev.handlerData[3],
						isInputOnly = ev.handlerData[4],
						isNodeJsStream = ev.handlerData[5];
						
					if (_shared.DESTROYED(stream)) {
						this.unpipe(stream);
						return;
					};

					if (isInputOnly || isBuffered) {
						ev.preventDefault();
					};

					const data = ev.data;
					let eof = end && (data.raw === io.EOF);
					let bof = !eof && (data.raw === io.BOF);

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

					if (isNodeJsStream) {
						const raw = data.valueOf();
						if (eof) {
							try {
								if (types.isNothing(raw)) {
									stream.end(data.defer());
								} else {
									stream.end(raw, data.defer());
								};
							} catch(ex) {
								this.unpipe(stream);
								this.onError(ex);
							};
						} else if (!types.isNothing(raw)) {
							const state = {ok: false};
							try {
								const ok = state.ok = stream.write(raw);
								if (!ok) {
									this.__pipeNodeStreamOnDrain.attachOnce(stream, {consume: data.defer()});
								};
							} catch(ex) {
								this.unpipe(stream);
								this.onError(ex);
							};
						};
					} else {
						const raw = (this._implements(ioMixIns.TextTransformableOut) && !stream._implements(ioMixIns.TextTransformableIn) ? data.valueOf() : this.transformOut(data));
						try {
							const data2 = stream.write(raw, {eof: eof, bof: bof});
							if (!data2.consumed) {
								data2.chain(data.defer());
							};
						} catch(ex) {
							this.unpipe(stream);
							this.onError(ex);
						};
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

				__pipeNodeStreamOnError: doodad.PROTECTED(doodad.NODE_EVENT('error', function __pipeNodeStreamOnError(context, err) {
					this.unpipe(context.emitter);

					this.onError(new doodad.ErrorEvent(err));
				})),

				__pipeNodeStreamOnDrain: doodad.NODE_EVENT('drain', function __pipeNodeStreamOnDrain(context) {
					context.data.consume();
				}),
					
				__pipeNodeStreamOnFinish: doodad.NODE_EVENT('finish', function __pipeNodeStreamOnFinish(context) {
					// <PRB> Some Node.Js streams don't emit 'close' after 'finish'.

					// <PRB> Some Node.Js streams don't emit 'drain' on 'finish'.
					this.__pipeNodeStreamOnDrain(context);

					this.unpipe(context.emitter);

					// <PRB> Some Node.js streams like ZLib can emit 'error' some ms AFTER been closed or finished. There is no way to know if an error will occur or not. We have to wait for DESTROY to free resources !!!
					if (context.emitter._handle && context.emitter._handle.onerror) {
						this.__pipeNodeStreamOnError.attachOnce(context.emitter);
					};
				}),
					
				__pipeNodeStreamOnClose: doodad.PROTECTED(doodad.NODE_EVENT('close', function __pipeNodeStreamOnClose(context) {
					// <PRB> Some Node.Js streams don't emit 'finish' before 'close'.
					this.__pipeNodeStreamOnFinish(context);
				})),
					
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
						let datas = [stream, transform, end, isBuffered, isInputOnly, false];

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

					} else if (types.isWritableStream(stream)) { // Node streams
						if (this._implements(nodejsIOInterfaces.IReadable)) {
							if (transform) {
								throw new types.NotSupported("The 'transform' option is not supported with a Node.Js stream.");
							};
							const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
							ireadable.pipe(stream);
						} else {
							let datas = [stream, transform, end, isBuffered, isInputOnly, true];
							if (isInput) {
								this.onReady.attach(this, this.__pipeOnData, 40, datas);
							} else {
								this.onData.attach(this, this.__pipeOnData, 40, datas);
							};
							this.__pipeNodeStreamOnError.attachOnce(stream);
							this.__pipeNodeStreamOnFinish.attachOnce(stream);
							this.__pipeNodeStreamOnClose.attachOnce(stream);
						};

					} else {
						throw new types.TypeError("'stream' must implement 'Doodad.IO.MixIns.OutputStreamBase' or be a Node.Js writable/duplex/transform stream.");

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
							let datas = [stream];

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

						} else if (types.isWritableStream(stream)) { // Node streams
							if (this._implements(nodejsIOInterfaces.IReadable)) {
								const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
								ireadable.unpipe(stream);
							} else {
								let datas = [stream];
								if (isInput) {
									this.onReady.detach(this, this.__pipeOnData, datas);
								} else {
									this.onData.detach(this, this.__pipeOnData, datas);
								};
							};

							this.__pipeNodeStreamOnError.detach(stream);
							this.__pipeNodeStreamOnFinish.detach(stream);
							this.__pipeNodeStreamOnClose.detach(stream);
							this.__pipeNodeStreamOnDrain.detach(stream);
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

						if (this._implements(nodejsIOInterfaces.IReadable)) {
							const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
							ireadable.unpipe();
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

						this.__pipeNodeStreamOnError.clear();
						this.__pipeNodeStreamOnFinish.clear();
						this.__pipeNodeStreamOnClose.clear();
						this.__pipeNodeStreamOnDrain.clear();
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

				onReady: doodad.OVERRIDE(function onReady(ev) {
					const retval = this._super(ev);

					const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
					let emitted = false;
					if (ireadable) {
						if (!ireadable.isPaused()) {
							if (ireadable.ondata.getCount() > 0) {
								const buf = this.transformOut(ev.data);
								if (!types.isNothing(buf)) {
									emitted = ireadable.ondata(buf);
								};
							};
							if (ev.data.raw === io.EOF) {
								emitted = ireadable.onend() || emitted;
							};
						};
					};
					if (emitted) {
						ev.preventDefault();
					};

					return retval;
				}),

				onEOF: doodad.OVERRIDE(function onEOF(ev) {
					const retval = this._super(ev);
					
					const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
					if (ireadable) {
						if (ireadable.isPaused()) {
							// Must be Async (function must return before the event)
							if (ireadable._readableState && !ireadable._readableState.ended) {
								ireadable._readableState.ended = true;
								tools.callAsync(ireadable.onend, -1, ireadable, null, null, _shared.SECRET);
							};
						};
					};
					
					return retval;
				}),

				onStopListening: doodad.OVERRIDE(function onStopListening(ev) {
					const retval = this._super(ev);
					const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
					let emitted = false;
					if (ireadable) {
						if (ireadable._readableState) {
							ireadable._readableState.flowing = false;
						};
						emitted = ireadable.onpause();
					};
					if (emitted) {
						ev.preventDefault();
					};
					return retval;
				}),
					
				onListen: doodad.OVERRIDE(function onListen(ev) {
					const retval = this._super(ev);
					const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
					let emitted = false;
					if (ireadable) {
						if (ireadable._readableState) {
							ireadable._readableState.flowing = true;
						};
						emitted = ireadable.onresume();
					};
					if (emitted) {
						ev.preventDefault();
					};
					return retval;
				}),
			})));
					
				
			ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
								ioMixIns.InputStreamBase,
								ioMixIns.BufferedStream,
			{
				$TYPE_NAME: 'BufferedInputStream',
				$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedInputStreamMixIn')), true) */,

				onReady: doodad.OVERRIDE(function onReady(ev) {
					const retval = this._super(ev);

					const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
					let emitted = false;
					if (ireadable) {
						if (!ireadable.isPaused()) {
							if (ireadable.ondata.getCount() > 0) {
								const buf = this.transformOut(ev.data);
								if (!types.isNothing(buf)) {
									emitted = ireadable.ondata(buf);
								};
							};
							if (ev.data.raw === io.EOF) {
								emitted = ireadable.onend() || emitted;
							};
						};
					};
					if (emitted) {
						ev.preventDefault();
					};

					return retval;
				}),

				onEOF: doodad.OVERRIDE(function onEOF(ev) {
					const retval = this._super(ev);
					
					const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
					if (ireadable) {
						if (ireadable.isPaused()) {
							// Must be Async (function must return before the event)
							if (ireadable._readableState && !ireadable._readableState.ended) {
								ireadable._readableState.ended = true;
								tools.callAsync(ireadable.onend, -1, ireadable, null, null, _shared.SECRET);
							};
						};
					};
					
					return retval;
				}),

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

					const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);

					if (ireadable && ireadable.isPaused()) {
						if (callback) {
							data.chain(callback);
						};
						ireadable.onreadable();
					} else if (buffer.length >= this.options.bufferSize) {
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

				onEOF: doodad.OVERRIDE(function onEOF(ev) {
					const retval = this._super(ev);
					
					const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
					if (iwritable) {
						tools.callAsync(iwritable.onfinish, -1, iwritable, null, null, _shared.SECRET);
					};
					
					return retval;
				}),
			})));


			ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
								ioMixIns.OutputStreamBase,
								ioMixIns.BufferedStream,
			{
				$TYPE_NAME: 'BufferedOutputStream',
				$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('BufferedOutputStreamMixIn')), true) */,

				onEOF: doodad.OVERRIDE(function onEOF(ev) {
					const retval = this._super(ev);
					
					const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
					if (iwritable) {
						tools.callAsync(iwritable.onfinish, -1, iwritable, null, null, _shared.SECRET);
					};
					
					return retval;
				}),

				//onFlush: doodad.OVERRIDE(function onFlush(ev) {
				//	const retval = this._super(ev);
				//
				//	const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
				//	if (iwritable) {
				//		tools.callAsync(iwritable.ondrain, -1, iwritable, null, null, _shared.SECRET);
				//	};
				//
				//	return retval;
				//}),
					
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


			//===================================
			// Init
			//===================================
			//return function init(/*optional*/options) {
			//};
		},
	};
	return DD_MODULES;
};

//! END_MODULE()