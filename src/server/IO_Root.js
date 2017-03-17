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

module.exports = {
	add: function add(DD_MODULES) {
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
					nodejsIOInterfaces = nodejsIO.Interfaces,

					nodeStringDecoder = require('string_decoder').StringDecoder;
				
				let nodeIConv = null;
				try {
					nodeIConv = require('iconv-lite');
				} catch(ex) {
				};

				types.complete(_shared.Natives, {
					windowUint8Array: global.Uint8Array,

					globalBuffer: global.Buffer,
					globalBufferIsEncoding: global.Buffer.isEncoding.bind(global.Buffer),
					globalBufferFrom: global.Buffer.from.bind(global.Buffer),
				});
				
				
				//=====================================================
				// Basic implementations
				//=====================================================
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.BufferedStream.$extend(
								mixIns.NodeEvents,
								ioMixIns.Transformable,
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
								istream.onerror.attachOnce(null, function noop(err) {});

								const emitted = istream.onerror(ev.error);
								if (emitted) {
									ev.preventDefault();
								};
							};
						};

						this.unpipe();

						return cancelled;
					}),

					__pushInternal: doodad.OVERRIDE(function __pushInternal(data, /*optional*/options) {
						this._super(data, options);

						const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
						if (ireadable && ireadable.isPaused()) {
							ireadable.onreadable();
						};
					}),

					__pipeOnReady: doodad.PROTECTED(function __pipeOnReady(ev) {
						const stream = ev.handlerData[0],
							transform = ev.handlerData[1],
							end = ev.handlerData[2],  // 'true' permits EOF. 'false' just write the trailing data if there are.
							isNodeJsStream = ev.handlerData[3];

						if (stream && _shared.DESTROYED(stream)) {
							this.unpipe(stream);
							return;
						};

						ev.preventDefault();

						const data = ev.data;
						let eof = end && (data.raw === io.EOF);
						let bof = !eof && (data.raw === io.BOF);
						let raw = this.transform(data);

						if (transform) {
							const retval = transform(raw);
							if (retval !== undefined) {
								raw = retval;
								eof = false;
								bof = false;
								if (raw === io.EOF) {
									eof = end;
									raw = null;
								} else if (raw === io.BOF) {
									bof = true;
								};
							};
						};

						if (isNodeJsStream) {
							if (eof) {
								if (types.isNothing(raw)) {
									stream.end(data.defer());
								} else {
									stream.end(raw, data.defer());
								};
							} else if (!bof && !types.isNothing(raw)) {
								const consumeCb = data.defer();
								const state = {ok: false};
								state.ok = stream.write(buf, function(err) {
									if (state.ok) {
										consumeCb(err);
									};
								});
								if (!state.ok) {
									this.__pipeNodeStreamOnDrain.attachOnce(stream, {callback: context => consumeCb()});
								};
							};
						} else {
							stream.write(raw, {callback: data.defer(), end: eof, bof: bof});
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
						if (this._implements(ioMixIns.Listener)) {
							this.listen();
						};
					}),

					__pipeStreamOnStopListening: doodad.PROTECTED(function __pipeStreamOnStopListening(ev) {
						if (this._implements(ioMixIns.Listener)) {
							this.stopListening();
						};
					}),

					__pipeStreamOnDestroy: doodad.PROTECTED(function __pipeStreamOnDestroy(ev) {
						this.unpipe(ev.obj);
					}),

					__pipeNodeStreamOnDrain: doodad.PROTECTED(doodad.NODE_EVENT('drain', function __pipeNodeStreamOnError(context) {
						const callback = types.get(context.data, 'callback');
						callback && callback();
					})),

					__pipeNodeStreamOnError: doodad.PROTECTED(doodad.NODE_EVENT('error', function __pipeNodeStreamOnError(context, err) {
						this.unpipe(context.emitter);
						this.onError(new doodad.ErrorEvent(err));
					})),

					__pipeNodeStreamOnClose: doodad.PROTECTED(doodad.NODE_EVENT(['close', 'destroy'], function __pipeNodeStreamOnClose(context, err) {
						this.unpipe(context.emitter);
					})),

					pipe: doodad.OVERRIDE(function pipe(stream, /*optional*/options) {
						if (tools.indexOf(this.__pipes, stream) >= 0) {
							// Stream already piped
							return stream;
						};
						const transform = types.get(options, 'transform');
						const end = types.get(options, 'end', true);
						const autoListen = types.get(options, 'autoListen', true);
						if (types._implements(stream, ioMixIns.OutputStreamBase)) { // doodad-js streams
							this.onReady.attach(this, this.__pipeOnReady, null, [stream, transform, end, false]);
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onFlush.attach(this, this.__pipeOnFlush, null, [stream]);
							};
							stream.onError.attachOnce(this, this.__pipeStreamOnError);
							stream.onDestroy.attachOnce(this, this.__pipeStreamOnDestroy);
							if (stream._implements(ioMixIns.Listener)) {
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
							} else if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onData.attach(this, this.__pipeOnReady, null, [stream, transform, end, true]);
								this.__pipeNodeStreamOnError.attachOnce(stream);
								this.__pipeNodeStreamOnClose.attachOnce(stream);
							} else {
								throw new types.TypeError("'this' must implement 'Doodad.NodeJs.IO.Interfaces.IReadable' or 'ioMixIns.OutputStreamBase'.");
							};
						} else {
							throw new types.TypeError("'stream' must implement 'Doodad.IO.MixIns.OutputStreamBase' or be a Node.Js writable/duplex/transform stream.");
						};
						this.__pipes[this.__pipes.length] = stream;
						if (autoListen && this._implements(ioMixIns.Listener)) {
							this.listen();
						};
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
						if (this._implements(ioMixIns.Listener)) {
							this.stopListening();
						};
						if (stream) {
							if (types._implements(stream, ioMixIns.OutputStreamBase)) { // doodad-js streams
								this.onReady.detach(this, this.__pipeOnReady, [stream]);
								if (this._implements(ioMixIns.OutputStreamBase)) {
									this.onFlush.detach(this, this.__pipeOnFlush, [stream]);
								};
								stream.onError.detach(this, this.__pipeStreamOnError);
								stream.onDestroy.detach(this, this.__pipeStreamOnDestroy);
								if (stream._implements(ioMixIns.Listener)) {
									stream.onListen.detach(this, this.__pipeStreamOnListen);
									stream.onStopListening.detach(this, this.__pipeStreamOnStopListening);
								};
							} else if (types.isWritableStream(stream)) { // Node streams
								if (this._implements(nodejsIOInterfaces.IReadable)) {
									const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
									ireadable.unpipe(stream);
								} else if (this._implements(ioMixIns.OutputStreamBase)) {
									this.onData.detach(this, this.__pipeOnReady, [stream]);
								};
								this.__pipeNodeStreamOnError.detach(stream);
								this.__pipeNodeStreamOnDrain.detach(stream);
								this.__pipeNodeStreamOnClose.detach(stream);
							};
						} else {
							if (this._implements(ioMixIns.InputStreamBase)) {
								this.onReady.detach(this, this.__pipeOnReady);
							};
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onData.detach(this, this.__pipeOnReady);
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
								if (types._implements(stream, ioMixIns.Listener)) {
									stream.onListen.detach(this, this.__pipeStreamOnListen);
									stream.onStopListening.detach(this, this.__pipeStreamOnStopListening);
								};
							}, this);
							this.__pipeNodeStreamOnError.clear();
							this.__pipeNodeStreamOnDrain.clear();
							this.__pipeNodeStreamOnClose.clear();
							// TODO: ireadable.unpipe();
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
							//if (ev.data.raw === io.EOF) {
							//	if (!ireadable.isPaused()) {
							//		const buf = this.transform(ev.data);
							//		if (!types.isNothing(buf)) {
							//			emitted = ireadable.ondata(buf) && !ireadable.isPaused();
							//		};
							//		emitted = ireadable.onend() || emitted;
							//	};
							//} else {
							//	const buf = this.transform(ev.data);
							//	emitted = ireadable.ondata(buf) && !ireadable.isPaused();
							//};
							if (!ireadable.isPaused()) {
								const buf = this.transform(ev.data);
								if (!types.isNothing(buf)) {
									emitted = ireadable.ondata(buf);
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

					onEOF: doodad.OVERRIDE(function onEOF(ev) {
						const retval = this._super(ev);
					
						const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
						if (iwritable) {
							tools.callAsync(iwritable.onfinish, -1, iwritable, null, null, _shared.SECRET); // async
						};
					
						return retval;
					}),
					
					onFlush: doodad.OVERRIDE(function onFlush(ev) {
						const retval = this._super(ev);
					
						const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
						if (iwritable) {
							iwritable.ondrain();
						};
					
						return retval;
					}),
					
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
				// TextTransformable server implementation
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
							const isView = types.isTypedArray(buf);
							if (isView || types.isArrayBuffer(buf)) {
								if (isView) {
									buf = buf.buffer;
								};
								if (nodeIConv) {
									// iconv-lite
									return nodeIConv.decode(buf, encoding, options);
								} else {
									// StringDecoder
									const decoder = new nodeStringDecoder(encoding);
									return decoder.end(buf);
								};
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
								trailing = this.__decoder.end() || null;
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
								if (this.__decoder) {
									text = this.__decoder.end() || '';
									this.__decoder = null;
								};
								if (nodeIConv) {
									// iconv-lite
									this.__decoder = nodeIConv.getDecoder(encoding);
								} else {
									// StringDecoder
									this.__decoder = new nodeStringDecoder(encoding);
								};
								this.__decoderEncoding = encoding;
							};
							text += this.__decoder.write(raw) || '';
							if (returnText) {
								return text || null;
							} else {
								return new io.TextData(text || null, options);
							};
						} else {
							const text = (raw ? types.toString(raw) || null : null);
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