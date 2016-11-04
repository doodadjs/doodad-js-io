//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: IO_Root.js - Node.js IO Root
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
					globalBuffer: global.Buffer,
				});
				
				
				//=====================================================
				// Basic implementations
				//=====================================================
				
				ioMixIns.REGISTER(doodad.BASE(doodad.MIX_IN(ioMixIns.StreamBase.$extend(
								mixIns.NodeEvents,
				{
					$TYPE_NAME: 'Stream',

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

					onError: doodad.OVERRIDE(function onError(ev) {
						const retval = this._super(ev);
						const istream = this.getInterface(nodejsIOInterfaces.IStream);
						if (istream) {
							istream.emit('error', ev.error);
						};
						return retval;
					}),

					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);

						this.__pipes = [];
					}),

					destroy: doodad.OVERRIDE(function destroy() {
						this.unpipe();

						if (this._implements(nodejsIOInterfaces.IReadable)) {
							const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
							ireadable.readable = false;
							ireadable._readableState = null;
						};
						
						if (this._implements(nodejsIOInterfaces.IWritable)) {
							const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
							iwritable.writable = false;
						};
						
						if (this._implements(nodejsIOInterfaces.IStream)) {
							const istream = this.getInterface(nodejsIOInterfaces.IStream);
							_shared.setAttribute(istream, doodad.HostSymbol, null);
							istream.destroy();
						};

						this._super();
					}),

					__pushInternal: doodad.PROTECTED(function(data, /*optional*/options) {
						const noEvents = types.get(options, 'noEvents', false);
						if (!noEvents) {
							this.__consumeData(data);
						};
					}),
					
					push: doodad.OVERRIDE(function push(data, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(data));

						let prevent = false;

						const noEvents = (this._implements(ioMixIns.Listener) && !this.isListening()) || types.get(options, 'noEvents', false);
						if (!noEvents) {
							prevent = this.__emitPushEvent(data);
						};

						const callback = types.get(options, 'callback');
						if (callback) {
							if (!data.options) {
								data.options = {};
							};
							const dataCb = types.get(data.options, 'callback');
							if (dataCb) {
								data.options.callback = function() {
									dataCb();
									callback();
								};
							} else {
								data.options.callback = callback;
							};
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
						const callback = types.get(options, 'callback');

						const data = this.__pullInternal(options);

						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(data));

						if (!data.options) {
							data.options = {};
						};
						if (callback) {
							const dataCb = !data.consumed && types.get(data.options, 'callback');
							if (dataCb) {
								data.options.callback = function() {
									dataCb();
									callback();
								};
							} else {
								data.options.callback = callback;
							};
						};
						data.consumed = false;

						return data;
					}),

					__pipeOnReady: doodad.PROTECTED(function __pipeOnReady(ev) {
						const stream = ev.handlerData[0],
							transform = ev.handlerData[1],
							end = ev.handlerData[2],
							isNodeJsStream = ev.handlerData[3];

						if ((isNodeJsStream ? stream.destroyed : stream.isDestroyed())) {
							this.unpipe(stream);
							return;
						};

						let data = ev.data;

						if (transform) {
							const retval = transform(data);
							if (retval !== undefined) {
								data = retval;
							};
						};

						const hasCallback = !!types.get(data.options, 'callback');

						ev.preventDefault();
						data.consumed = true; // Will be consumed later

						const eof = (data.raw === io.EOF);

						const __consume = function consume() {
							data.consumed = false;
							this.__consumeData(data);
						};


						if (eof) {
							if (end) {
								if (isNodeJsStream) {
									const consumeCb = doodad.Callback(this, __consume);
									stream.end(consumeCb);
								} else {
									const consumeCb = doodad.AsyncCallback(this, __consume);
									stream.write(io.EOF, {callback: consumeCb});
								};
							} else {
								__consume.call(this);
							};

						} else if (data.raw instanceof io.Signal) {
							__consume.call(this);
						} else {
							if (isNodeJsStream) {
								const consumeCb = doodad.Callback(this, __consume);
								let ok = false;
								if (this._implements(ioMixIns.TextTransformable)) {
									ok = stream.write(data.valueOf(), types.get(data.options, 'encoding', this.options.encoding), function(ex) {
										if (ok) {
											consumeCb();
										};
									});
								} else {
									ok = stream.write(data.valueOf(), function(ex) {
										if (ok) {
											consumeCb();
										};
									});
								};
								if (!ok) {
									this.__pipeNodeStreamOnDrain.attachOnce(stream, {callback: consumeCb});
								};
							} else {
								const consumeCb = doodad.AsyncCallback(this, __consume);
								stream.write(data.valueOf(), types.extend({}, data.options, {callback: consumeCb}));
							};
						};
					}),
					
					__pipeOnFlush: doodad.PROTECTED(function __pipeOnFlush(ev) {
						const stream = ev.handlerData[0];
						if (!stream.isDestroyed()) {
							stream.flush(stream.options.autoFlushOptions);
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

					__pipeNodeStreamOnDrain: doodad.PROTECTED(doodad.NODE_EVENT('drain', function __pipeNodeStreamOnError(context) {
						const callback = types.get(context.data, 'callback');
						callback && callback();
					})),

					__pipeNodeStreamOnError: doodad.PROTECTED(doodad.NODE_EVENT('error', function __pipeNodeStreamOnError(context, err) {
						this.unpipe(context.emitter);
						this.onError(new doodad.ErrorEvent(err));
					})),

					pipe: doodad.OVERRIDE(function pipe(stream, /*optional*/options) {
						if (tools.indexOf(this.__pipes, stream) >= 0) {
							// Stream already piped
							return;
						};
						const transform = types.get(options, 'transform');
						const end = types.get(options, 'end', true);
						const autoListen = types.get(options, 'autoListen', true);
						if (types._implements(stream, ioMixIns.OutputStreamBase)) { // doodad-js streams
							if (this._implements(ioMixIns.InputStreamBase)) {
								this.onReady.attach(this, this.__pipeOnReady, null, [stream, transform, end, false]);
							} else if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onWrite.attach(this, this.__pipeOnReady, null, [stream, transform, end, false]);
							};
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onFlush.attach(this, this.__pipeOnFlush, null, [stream]);
							};
							stream.onError.attachOnce(this, this.__pipeStreamOnError);
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
								this.onWrite.attach(this, this.__pipeOnReady, null, [stream, transform, end, true]);
								this.__pipeNodeStreamOnError.attachOnce(stream);
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
					}),
					
					unpipe: doodad.OVERRIDE(function unpipe(/*optional*/stream) {
						let pos = -1;
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
								stream.onError.detach(this, this.__pipeStreamOnError);
								if (stream._implements(ioMixIns.Listener)) {
									stream.onListen.detach(this, this.__pipeStreamOnListen);
									stream.onStopListening.detach(this, this.__pipeStreamOnStopListening);
								};
							} else if (types.isWritableStream(stream)) { // Node streams
								if (this._implements(nodejsIOInterfaces.IReadable)) {
									const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
									ireadable.unpipe(stream);
								} else if (this._implements(ioMixIns.OutputStreamBase)) {
									this.onWrite.detach(this, this.__pipeOnReady, [stream]);
								};
								this.__pipeNodeStreamOnError.detach(stream);
								this.__pipeNodeStreamOnDrain.detach(stream);
							};
						} else {
							if (this._implements(ioMixIns.InputStreamBase)) {
								this.onReady.detach(this, this.__pipeOnReady);
							};
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onWrite.detach(this, this.__pipeOnReady);
								this.onFlush.detach(this, this.__pipeOnFlush);
							};
							if (this._implements(nodejsIOInterfaces.IReadable)) {
								const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
								ireadable.unpipe();
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
							this.__pipeNodeStreamOnError.clear();
							this.__pipeNodeStreamOnDrain.clear();
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

					__pushInternal: doodad.OVERRIDE(function __pushInternal(data, /*optional*/options) {
						const next = types.get(options, 'next', false),
							buffer = this.__buffer;

						if (buffer.length >= this.options.bufferSize) {
							throw new types.BufferOverflow();
						};

						if (next) {
							buffer.unshift(data);
						} else {
							buffer.push(data);
						};

						this._super(data, options);

						const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
						if (ireadable && ireadable.isPaused()) {
							ireadable.emit('readable');
						};
					}),
					
					__pullInternal: doodad.OVERRIDE(function __pullInternal(/*optional*/options) {
						const next = types.get(options, 'next', false),
							buffer = this.__buffer;

						if (buffer.length <= 0) {
							throw new types.BufferOverflow();
						};

						let data;

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

					onReady: doodad.OVERRIDE(function onReady(ev) {
						const retval = this._super(ev);

						const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
						let emitted = false;
						if (ireadable) {
							if (ev.data.raw === io.EOF) {
								if (!ireadable.isPaused()) {
									emitted = ireadable.emit('end');
								};
							} else {
								emitted = ireadable.emit('data', ev.data.valueOf()) && !ireadable.isPaused();
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
							emitted = ireadable.emit("pause");
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
							emitted = ireadable.emit("resume");
						};
						if (emitted) {
							ev.preventDefault();
						};
						return retval;
					}),
					
					__emitPushEvent: doodad.OVERRIDE(function __emitPushEvent(data) {
						let prevent = this._super(data);

						if (!prevent) {
							const ev = new doodad.Event(data);

							this.onReady(ev);

							prevent = ev.prevent;
						};

						return prevent;
					}),

					read: doodad.OVERRIDE(function read(/*optional*/options) {
						if (this.getCount() > 0) {
							return this.pull(options);
						} else {
							const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
							if (ireadable.isPaused()) {
								tools.callAsync(ireadable.emit, -1, ireadable, ['end'], null, _shared.SECRET);
							};
							return null;
						};
					}),
				})));
					
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
									ioMixIns.OutputStreamBase,
				{
					$TYPE_NAME: 'OutputStream',

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);
					
						if (ev.data.raw === io.EOF) {
							const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
							if (iwritable) {
								tools.callAsync(iwritable.emit, -1, iwritable, ['finish'], null, _shared.SECRET); // async
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
					
					canWrite: doodad.OVERRIDE(function canWrite() {
						return this._super() && (this.getCount() < this.options.bufferSize);
					}),

					write: doodad.OVERRIDE(function write(raw, /*optional*/options) {
						const data = this.transform({raw: raw}, options);

						const ev = new doodad.Event(data);
						this.onWrite(ev);

						if (ev.prevent) {
							this.__consumeData(data);
						} else {
							this.push(data);
						};
					}),

				})));


				//=====================================================
				// TextTransformable server implementation
				//=====================================================

				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.TextTransformableBase.$extend(
											ioMixIns.Stream,
											mixIns.Creatable,
				{
					$TYPE_NAME: 'TextTransformable',
					
					__transformEncoding: doodad.PROTECTED(  null  ),
					__transformDecoder: doodad.PROTECTED(  null  ),
					
					$isValidEncoding: doodad.OVERRIDE(function isValidEncoding(encoding) {
						if (nodeIConv) {
							return nodeIConv.encodingExists(encoding);
						} else {
							return (encoding !== 'base64') && (encoding !== 'hex') && (encoding !== 'binary') && _shared.Natives.globalBuffer.isEncoding(encoding);
						};
					}),

					$decode: doodad.PUBLIC(function $decode(buf, encoding) {
						if (types.isTypedArray(buf) || types.isBuffer(buf)) {
							if (nodeIConv) {
								// iconv-lite
								return nodeIConv.decode(buf, encoding);
							} else {
								// StringDecoder
								const decoder = new nodeStringDecoder(encoding);
								return decoder.end(buf);
							};
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
						let encoding = types.get(options, 'encoding', this.options.encoding);
						let text = '';

						if (nodeIConv) {
							// iconv-lite
							if (encoding && (this.__transformEncoding !== encoding)) {
								if (this.__transformDecoder) {
									text += this.__transformDecoder.end();
									this.__transformDecoder = null;
								};
								this.__transformDecoder = nodeIConv.getDecoder(encoding);
								this.__transformEncoding = encoding;
							};
							if (data.raw === io.EOF) {
								if (this.__transformDecoder) {
									text += this.__transformDecoder.end();
									this.__transformDecoder = null;
								};
							} else {
								if (this.__transformDecoder && (types.isTypedArray(data.raw) || types.isBuffer(data.raw))) {
									text += this.__transformDecoder.write(data.raw);
								} else {
									text += types.toString(data.raw);
								};
							};
						} else {
							// StringDecoder
							if (encoding && (this.__transformEncoding !== encoding)) {
								if (this.__transformDecoder) {
									text = this.__transformDecoder.end();
									this.__transformDecoder = null;
								};
								this.__transformDecoder = new nodeStringDecoder(encoding);
								this.__transformEncoding = encoding;
							};
							if (data.raw === io.EOF) {
								if (this.__transformDecoder) {
									text += this.__transformDecoder.end();
									this.__transformDecoder = null;
								};
							} else {
								if (this.__transformDecoder && (types.isTypedArray(data.raw) || types.isBuffer(data.raw))) {
									text += this.__transformDecoder.write(data.raw);
								} else {
									text += types.toString(data.raw);
								};
							};
						};

						data.text = text;
						data.valueOf = function valueOf() {
							if (this.raw instanceof io.Signal) {
								return null;
							} else {
								return this.text;
							};
						};
						data.options = options;
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
	},
};
//! END_MODULE()