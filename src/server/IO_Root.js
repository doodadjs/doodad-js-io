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
					}),
					
					getCount: doodad.OVERRIDE(function getCount(/*optional*/options) {
						const buffer = this.getBuffer(options);
						return buffer && buffer.length || 0;
					}),

					__pushInternal: doodad.PROTECTED(function __pushInternal(data, /*optional*/options) {
						if (this.getCount(options) >= this.options.bufferSize) {
							throw new types.BufferOverflow();
						};

						const next = types.get(options, 'next', false),
							buffer = this.getBuffer(options);

						if (next) {
							buffer.unshift(data);
						} else {
							buffer.push(data);
						};

						// Consumed
						let callback = types.get(data.options, 'callback');
						if (callback) {
							delete data.options.callback;
							callback();
						};

						const output = types.get(options, 'output', false);
						if (!output) {
							const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
							if (ireadable.isPaused()) {
								const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
								ireadable.emit('readable');
							};
						};
					}),
					
					__emitPushEvent: doodad.PROTECTED(doodad.MUST_OVERRIDE()),  // function(ev, options)
					
					push: doodad.OVERRIDE(function push(data, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(data));

						const output = types.get(options, 'output', false);

						const noEvents = (this._implements(ioMixIns.Listener) && !this.isListening()) || types.get(options, 'noEvents', false);
						if (!noEvents) {
							data = types.extend({}, data);
							data.options = types.extend({}, data.options, {output: output});

							const ev = new doodad.Event(data);

							this.__emitPushEvent(ev, options);
							if (ev.prevent) {
								// Consumed
								let callback = types.get(ev.data.options, 'callback');
								if (callback) {
									delete ev.data.options.callback;
									callback();
								};
								if (output) {
									if (data.raw === io.EOF) {
										this.onEOF(new doodad.Event({output: output}));
									};
								};
								return;
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

						const next = types.get(options, 'next', false),
							buffer = this.getBuffer(options);

						let data;

						if (next) {
							data = buffer.pop();
						} else {
							data = buffer.shift();
						};

						// Consumed
						let callback = types.get(data.options, 'callback');
						if (callback) {
							delete data.options.callback;
							callback(); // sync
						};

						return data;
					}),
					
					pull: doodad.OVERRIDE(function(/*optional*/options) {
						let data = this.__pullInternal(options);

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
						const stream = ev.handlerData[0],
							transform = ev.handlerData[1],
							end = ev.handlerData[2],
							isNodeJsStream = ev.handlerData[3],
							output = !!ev.handlerData[4];

						if ((isNodeJsStream ? stream.destroyed : stream.isDestroyed())) {
							this.unpipe(stream);
							return;
						};

						let data = ev.data;

						if (output !== !!types.get(data.options, 'output', false)) {
							return;
						};

						if (transform) {
							const retval = transform(data);
							if (retval !== undefined) {
								data = retval;
							};
						};

						if (data.raw === io.EOF) {
							if (end) {
								if (isNodeJsStream) {
									stream.end(types.get(data.options, 'callback'));
								} else {
									stream.write(io.EOF, data.options);
								};
							};
						} else {
							if (isNodeJsStream) {
								stream.write(data.valueOf(), types.get(data.options, 'encoding', types.get(this.options, 'encoding')), types.get(data.options, 'callback'));
							} else {
								stream.write(data.valueOf(), data.options);
							};
						};
					}),
					
					__pipeOnFlush: doodad.PROTECTED(function __pipeOnFlush(ev) {
						if (ev.data.options.output) {
							const stream = ev.handlerData[0];
							stream.flush(ev.data.options);
						};
					}),
						
					__pipeStreamOnError: doodad.PROTECTED(function __pipeStreamOnError(ev) {
						this.unpipe(ev.obj);
						this.onError(ev);
					}),

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
						if (types._implements(stream, ioMixIns.OutputStreamBase)) { // doodad-js streams
							if (this._implements(ioMixIns.InputStreamBase)) {
								this.onReady.attach(this, this.__pipeOnReady, null, [stream, transform, end, false, false]);
							} else if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onWrite.attach(this, this.__pipeOnReady, null, [stream, transform, end, false, true]);
							};
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onFlushData.attach(this, this.__pipeOnReady, null, [stream, transform, end, false, false]);
								this.onFlush.attach(this, this.__pipeOnFlush, null, [stream]);
							};
							stream.onError.attachOnce(this, this.__pipeStreamOnError);
						} else if (types.isWritableStream(stream)) { // Node streams
							if (this._implements(nodejsIOInterfaces.IReadable)) {
								if (transform) {
									throw new types.NotSupported("The 'transform' option is not supported with a Node.Js stream.");
								};
								const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
								ireadable.pipe(stream);
							} else if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onFlushData.attach(this, this.__pipeOnReady, null, [stream, transform, end, true, false]);
								this.onWrite.attach(this, this.__pipeOnReady, null, [stream, transform, end, true, true]);
								this.__pipeNodeStreamOnError.attachOnce(stream);
							} else {
								throw new types.TypeError("'this' must implement 'Doodad.NodeJs.IO.Interfaces.IReadable' or 'ioMixIns.OutputStreamBase'.");
							};
						} else {
							throw new types.TypeError("'stream' must implement 'Doodad.IO.MixIns.OutputStreamBase' or be a Node.Js writable/duplex/transform stream.");
						};
						if (this._implements(ioMixIns.Listener)) {
							this.listen();
						};
						this.__pipes[this.__pipes.length] = stream;
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
									this.onFlushData.detach(this, this.__pipeOnReady, [stream]);
									this.onFlush.detach(this, this.__pipeOnFlush, [stream]);
								};
								stream.onError.detach(this, this.__pipeStreamOnError);
							} else if (types.isWritableStream(stream)) { // Node streams
								if (this._implements(nodejsIOInterfaces.IReadable)) {
									const ireadable = this.getInterface(nodejsIOInterfaces.IReadable);
									ireadable.unpipe(stream);
								} else if (this._implements(ioMixIns.OutputStreamBase)) {
									this.onFlushData.detach(this, this.__pipeOnReady, [stream]);
									this.onWrite.detach(this, this.__pipeOnReady, [stream]);
								};
								this.__pipeNodeStreamOnError.detach(stream);
							};
						} else {
							if (this._implements(ioMixIns.InputStreamBase)) {
								this.onReady.detach(this, this.__pipeOnReady);
							};
							if (this._implements(ioMixIns.OutputStreamBase)) {
								this.onFlushData.detach(this, this.__pipeOnReady);
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
							}, this);
							this.__pipeNodeStreamOnError.clear();
						};
						if (pos >= 0) {
							this.__pipes.splice(pos, 1);
						} else {
							this.__pipes = [];
						};
					}),
					
				}))));
				
				
				ioMixIns.REGISTER(doodad.MIX_IN(ioMixIns.Stream.$extend(
									ioMixIns.InputStreamBase,
				{
					$TYPE_NAME: 'InputStream',

					__inputBuffer: doodad.PROTECTED(null),

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
							ireadable._readableState.flowing = false;
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
							ireadable._readableState.flowing = true;
							emitted = ireadable.emit("resume");
						};
						if (emitted) {
							ev.preventDefault();
						};
						return retval;
					}),
					
					__emitPushEvent: doodad.OVERRIDE(function __emitPushEvent(ev, options) {
						const isOutput = types.get(options, 'output', false);
						
						if (!isOutput) {
							this.onReady(ev);
						};
						
						this._super(ev, options);
					}),

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

					read: doodad.OVERRIDE(function read(/*optional*/options) {
						options = types.extend({}, options, {output: false});
						if (this.getCount(options) > 0) {
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

					__outputBuffer: doodad.PROTECTED(null),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);
					
						const iwritable = this.getInterface(nodejsIOInterfaces.IWritable);
						if (iwritable) {
							if (ev.data.raw === io.EOF) {
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
					
					__emitPushEvent: doodad.OVERRIDE(function __emitPushEvent(ev, options) {
						const isOutput = types.get(options, 'output', false);
						
						if (isOutput) {
							this.onWrite(ev);
						};
						
						this._super(ev, options);
					}),

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

					canWrite: doodad.OVERRIDE(function canWrite() {
						if (this.options.autoFlush) {
							return this.__flushState.ok || (this.getCount({output: true}) < this.options.bufferSize);
						} else {
							return (this.getCount({output: true}) < this.options.bufferSize);
						};
					}),

					write: doodad.OVERRIDE(function write(raw, /*optional*/options) {
						options = types.extend({}, options, {output: true});
						const data = this.transform({raw: raw}, options);
						if ((data.raw === io.EOF) && !this.canWrite()) {
							this.onFlush.attachOnce(this, function() {
								this.push(data, options);
							});
						} else {
							this.push(data, options);
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
						return (encoding !== 'base64') && (encoding !== 'hex') && _shared.Natives.globalBuffer.isEncoding(encoding);
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
						let startingText = '';
						if (encoding && (this.__transformEncoding !== encoding)) {
							if (this.__transformDecoder) {
								startingText = this.__transformDecoder.end();
								this.__transformDecoder = null;
							};
							this.__transformDecoder = new nodeStringDecoder(encoding);
							this.__transformEncoding = encoding;
						};
						data.text = startingText;
						if (data.raw === io.EOF) {
							if (this.__transformDecoder) {
								data.text += this.__transformDecoder.end();
								this.__transformDecoder = null;
							};
						} else {
							if (this.__transformDecoder && (types.isTypedArray(data.raw) || types.isBuffer(data.raw))) {
								data.text += this.__transformDecoder.write(data.raw);
							} else {
								data.text += types.toString(data.raw);
							};
						};
						data.valueOf = function valueOf() {
							if (this.raw === io.EOF) {
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