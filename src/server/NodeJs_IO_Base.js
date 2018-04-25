//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2018 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: NodeJs_IO_Base.js - Node.js IO Base Tools
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
	modules['Doodad.NodeJs.IO'] = {
		version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
		namespaces: ['MixIns', 'Interfaces'],
		dependencies: [
			'Doodad.IO',
		],

		create: function create(root, /*optional*/_options, _shared) {
			const doodad = root.Doodad,
				types = doodad.Types,
				tools = doodad.Tools,
				//files = tools.Files,
				//mixIns = doodad.MixIns,
				io = doodad.IO,
				ioMixIns = io.MixIns,
				ioInterfaces = io.Interfaces,
				nodejs = doodad.NodeJs,
				//nodejsMixIns = nodejs.MixIns,
				nodejsInterfaces = nodejs.Interfaces,
				nodejsIO = nodejs.IO,
				//nodejsIOMixIns = nodejsIO.MixIns,
				nodejsIOInterfaces = nodejsIO.Interfaces;

			//=====================================================
			// Internals
			//=====================================================

			const __Internal__ = {
			};

			//=====================================================
			// DESTROY hook
			//=====================================================

			__Internal__.oldDESTROY = _shared.DESTROY;
			_shared.DESTROY = function DESTROY(obj) {
				if (types.isLike(obj, doodad.Interface) && types._implements(obj, nodejsIOInterfaces.IStream)) {
					if (!obj.destroyed) {
						obj.destroy();
					};
				} else {
					__Internal__.oldDESTROY(obj);
				};
			};

			//=====================================================
			// Interfaces (continued)
			//=====================================================

			nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsInterfaces.IEmitter.$extend(
				{
					$TYPE_NAME: 'IStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('IStreamIsolatedMixInNodeJs')), true) */,

					onclose: doodad.RAW_EVENT(),

					destroyed: doodad.PUBLIC(doodad.PERSISTENT(doodad.READ_ONLY( false ))),

					onerror: doodad.RAW_ERROR_EVENT(function onerror(err) {
						const host = this[doodad.HostSymbol];

						let emitted = this._super(err);

						if (types.isEntrant(host, 'onError')) {
							if (host.onError.getCount() > 0) {
								const ev = new doodad.ErrorEvent(err);

								types.invoke(host, host.onError, [ev], _shared.SECRET);

								if (ev.prevent) {
									err.trapped = true;
								};
							};
						};

						if (err.trapped) {
							emitted = true;
						} else if (emitted) {
							err.trapped = true;
						};

						return !!emitted;
					}),

					destroy: doodad.PUBLIC(doodad.CAN_BE_DESTROYED(function destroy() {
					// IMPORTANT: Never access to "host" from this function.

						if (!this.destroyed) {
							this.onclose();

							this.removeAllListeners();

							types.setAttribute(this, 'destroyed', true);

							// NOTE: Should calls "IReadable.unpipe".
							const host = this[doodad.HostSymbol];
							types.DESTROY(host);

							this._delete();
						};
					})),
				}))));

			nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IStream.$extend(
				{
					$TYPE_NAME: 'IReadable',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('IReadableIsolatedMixInNodeJs')), true) */,

					ondata: doodad.RAW_EVENT(),
					onpause: doodad.RAW_EVENT(),
					onresume: doodad.RAW_EVENT(),
					onend: doodad.RAW_EVENT(),
					onreadable: doodad.RAW_EVENT(),

					__encoding: doodad.PROTECTED(null),

					readable: doodad.PUBLIC(true),

					_readableState: doodad.PUBLIC({
					//flowing: true,
						ended: false,
						pipesCount: 0,
						pipes: null,
						awaitDrain: 0,
					}),

					onnewListener: doodad.OVERRIDE(function onnewListener(event, listener) {
						if ((event === 'readable') && !this.isPaused()) {
							this.pause();
						};
						return this._super(event, listener);
					}),

					__pipeOnData: doodad.PROTECTED(function __pipeOnData(ev) {
					//const host = this[doodad.HostSymbol];

						const data = ev.data;
						const eof = (data.raw === io.EOF);

						const destination = ev.handlerData[0],
							state = ev.handlerData[1];

						if (state.isInput || state.isBuffered) {
							ev.preventDefault();
						};

						if (state.consumeCb) {
						// Oops... Normally, it should wait, but it has not !
							throw new types.BufferOverflow();

						} else {
							const defer = function defer() {
								if (!state.consumeCb) {
									state.consumeCb = data.defer();
									data.chain(function(err) {
										state.consumeCb = null;
									});
								};
								return state.consumeCb;
							};

							const value = data.valueOf();

							if (eof) {
								if (state.endDestination) {
									try {
										if (types.isNothing(value)) {
											destination.end(defer());
										} else {
											destination.end(value, defer());
										};
									} catch(ex) {
										state.errorCb(ex);
									};
								} else if (!types.isNothing(value)) {
									try {
										const ok = destination.write(value);
										if (!ok) {
											destination.once('drain', defer());
										};
									} catch(ex) {
										state.errorCb(ex);
									};
								};
							} else {
								if (!types.isNothing(value)) {
									try {
										const ok = destination.write(value);
										if (!ok) {
											destination.once('drain', defer());
										};
									} catch(ex) {
										state.errorCb(ex);
									};
								};
							};
						};
					}),

					getEncoding: doodad.PUBLIC(function getEncoding() {
						const host = this[doodad.HostSymbol];
						if (host._implements(ioMixIns.TextTransformable)) {
							return host.options.encoding;
						} else {
							return this.__encoding;
						};
					}),

					isPaused: doodad.PUBLIC(function isPaused() {
						const host = this[doodad.HostSymbol];
						return !host.isListening();
					}),

					pause: doodad.PUBLIC(function pause() {
						const host = this[doodad.HostSymbol];
						host.stopListening();
					}),

					pipe: doodad.PUBLIC(function pipe(destination, /*optional*/options) {
						const host = this[doodad.HostSymbol];

						if (types._implements(destination, ioInterfaces.IStream)) {
							return host.pipe(destination, options);
						};

						const rs = this._readableState;

						const found = (types.isArray(rs.pipes) ? (tools.indexOf(rs.pipes, destination) >= 0) : (rs.pipes === destination));
						if (!found) {
							const state = {
								isInput: host._implements(ioMixIns.InputStreamBase) && !host._implements(ioMixIns.OutputStreamBase),
								isBuffered: host._implements(ioMixIns.BufferedStreamBase),
								endDestination: types.get(options, 'end', true) && (tools.indexOf([io.stdout, io.stderr, process.stdout, process.stderr], destination) < 0),
								destination: destination,
								unpipeCb: null,
								errorCb: null,
								closeCb: null,
								drainCb: null,
								consumeCb: null,
							};

							if (state.isInput) {
								host.onReady.attach(this, this.__pipeOnData, 40, [destination, state]);
							} else {
								host.onData.attach(this, this.__pipeOnData, 40, [destination, state]);
							};

							state.unpipeCb = doodad.Callback(this, function _unpipeCb(readable) {
								if (readable === this) {
									const host = this[doodad.HostSymbol];
									if (state.isInput) {
										host.onReady.detach(this, null, [state.destination]);
									} else {
										host.onData.detach(this, null, [state.destination]);
									};

									state.destination.removeListener('unpipe', state.unpipeCb);
									state.destination.removeListener('error', state.errorCb);
									state.destination.removeListener('close', state.closeCb);
									state.destination.removeListener('destroy', state.closeCb);
									if (state.drainCb) {
										state.destination.removeListener('drain', state.drainCb);
									};

									state.unpipeCb = null;
									state.errorCb = null;
									state.closeCb = null;
									state.drainCb = null;
									state.consumeCb = null;

									const rs = this._readableState;
									if (types.isArray(rs.pipes)) {
										tools.popItem(rs.pipes, state.destination);
										rs.pipesCount = rs.pipes.length;
									} else if (state.destination === rs.pipes) {
										rs.pipes = null;
										rs.pipesCount = 0;
									};

									state.destination = null;
								};
							});
							destination.prependListener('unpipe', state.unpipeCb);

							state.errorCb = doodad.Callback(this, function _errorCb(err) {
								if (state.consumeCb) {
									try {
										state.consumeCb(err);
									} catch(o) {
									// Do nothing
									};
								};
								try {
									this.onerror(err);
								} catch(ex) {
									throw ex;
								} finally {
									if (state.unpipeCb) {
										state.unpipeCb(this);
									};
								};
							});
							destination.once('error', state.errorCb);

							state.closeCb = doodad.Callback(this, function _closeCb() {
								if (state.unpipeCb) {
									state.unpipeCb(this);
								};
							});
							destination.once('close', state.closeCb);
							destination.once('destroy', state.closeCb);

							if (types.isNothing(rs.pipes)) {
								rs.pipes = destination;
								rs.pipesCount = 1;
							} else if (types.isArray(rs.pipes)) {
								rs.pipes.push(destination);
								rs.pipesCount = rs.pipes.length;
							} else {
								rs.pipes = [rs.pipes, destination];
								rs.pipesCount = 2;
							};

							const autoListen = types.get(options, 'autoListen', true);
							if (autoListen) {
								this.resume();
							};

							destination.emit('pipe', this);
						};

						return destination;
					}),

					_read: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function _read(/*optional*/size)

					read: doodad.PUBLIC(function read(/*optional*/size) {
						if (size <= 0) {
						// <PRB> Node.Js does "read(0)" sometimes.
							return null;
						};

						if (!types.isNothing(size)) {
							throw new types.NotSupported("The 'size' argument is not supported by this stream.");
						};

						const encoding = this.getEncoding();
						const host = this[doodad.HostSymbol];

						const data = host.read({encoding: encoding});
						if (data) {
							return data;
						};

						return null;
					}),

					resume: doodad.PUBLIC(function resume() {
						const host = this[doodad.HostSymbol];
						host.listen();
					}),

					setEncoding: doodad.PUBLIC(function setEncoding(encoding) {
						const host = this[doodad.HostSymbol];
						if (host._implements(ioMixIns.TextTransformable)) {
							host.setOptions({encoding: encoding});
						} else {
							this.__encoding = encoding;
						};
						return this;
					}),

					unpipe: doodad.PUBLIC(function unpipe(/*optional*/destination) {
						if (types._implements(destination, ioInterfaces.IStream)) {
							const host = this[doodad.HostSymbol];
							host.unpipe(destination);

						} else {
							this.pause();

							if (types.isNothing(destination)) {
								const rs = this._readableState;
								const pipes = rs.pipes;
								if (types.isArray(pipes)) {
									const len = pipes.length;
									for (let i = len; i >= 0; i--) { // NOTE: Array gets modified
										if (types.has(pipes, i)) {
											pipes[i].emit('unpipe', this);
										};
									};
								} else if (!types.isNothing(pipes)) {
									pipes.emit('unpipe', this);
								};
							} else {
								destination.emit('unpipe', this);
							};
						};

						return this;
					}),

					push: doodad.PUBLIC(function push(chunk, /*optional*/encoding) {
						const host = this[doodad.HostSymbol];
						const data = host.transformIn(chunk, {encoding: encoding});
						host.push(data);
						return (host.getCount() < host.options.bufferSize);
					}),

					unshift: doodad.PUBLIC(function unshift(chunk) {
						const host = this[doodad.HostSymbol];
						const data = host.transformIn(chunk);
						host.push(data, {next: true});
						return (host.getCount() < host.options.bufferSize);
					}),

					wrap: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function wrap(stream)
				}))));


			nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IStream.$extend(
				{
					$TYPE_NAME: 'IWritable',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('IWritableIsolatedMixInNodeJs')), true) */,

					ondrain: doodad.RAW_EVENT(),
					onfinish: doodad.RAW_EVENT(),
					onpipe: doodad.RAW_EVENT(), // function(source)
					onunpipe: doodad.RAW_EVENT(), // function(source)

					cork: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function()
					uncork: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function()

					__defaultEncoding: doodad.PROTECTED(null),

					__drainingData: doodad.PROTECTED(null),

					writable: doodad.PUBLIC(true),
					_writableState: doodad.PUBLIC({
						needDrain: false, // Needed for Node.Js, must stay to "false"
					}),

					getDefaultEncoding: doodad.PUBLIC(function getDefaultEncoding() {
						const host = this[doodad.HostSymbol];
						if (host._implements(ioMixIns.TextTransformable)) {
							return host.options.encoding;
						} else {
							return this.__defaultEncoding;
						};
					}),

					setDefaultEncoding: doodad.PUBLIC(function setDefaultEncoding(encoding) {
						const host = this[doodad.HostSymbol];
						if (host._implements(ioMixIns.TextTransformable)) {
							host.setOptions({encoding: encoding});
						} else {
							this.__defaultEncoding = encoding;
						};
						return this;
					}),

					write: doodad.PUBLIC(function write(chunk, /*optional*/encoding, /*optional*/callback) {
						if (types.isFunction(encoding)) {
							callback = encoding;
							encoding = undefined;
						};

						if (types.isNothing(encoding)) {
							encoding = this.getDefaultEncoding();
						};

						if (this.__drainingData) {
						// Previously we have returned 'false', the customer didn't wait... so we throw !
							throw new types.BufferOverflow();
						};

						const host = this[doodad.HostSymbol];

						const data = host.write(chunk, {encoding: encoding, callback: callback});

						if (!data.consumed) {
							this.__drainingData = data;

							data.chain(doodad.AsyncCallback(this, function doOnDrain(err) {
								this.__drainingData = null;

								if (!err) {
									this.ondrain();
								};
							}));
						};

						return data.consumed;
					}),

					end: doodad.PUBLIC(function end(/*optional*/chunk, /*optional*/encoding, /*optional*/callback) {
						if (types.isFunction(chunk)) {
							encoding = chunk;
							chunk = undefined;
						};

						if (types.isFunction(encoding)) {
							callback = encoding;
							encoding = undefined;
						};

						if (types.isNothing(encoding)) {
							encoding = this.getDefaultEncoding();
						};

						if (this.__drainingData) {
						// <PRB> Node.Js never waits before calling 'end'. So we have to chain.
							this.__drainingData.chain(doodad.AsyncCallback(this, function doOnDrain(err) {
								if (!err) {
									this.end(chunk, encoding, callback);
								};
							}));
							return false;
						};

						const host = this[doodad.HostSymbol];

						const data = host.write(chunk, {eof: true, encoding: encoding, callback: callback});

						if (!data.consumed) {
							data.chain(doodad.AsyncCallback(this, function doOnDrain(err) {
								if (!err) {
									this.ondrain();
								};
							}));
						};

						return data.consumed;
					}),
				}))));


			nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IReadable.$extend(
				nodejsIOInterfaces.IWritable,
				{
					$TYPE_NAME: 'IDuplex',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('IDuplexIsolatedMixInNodeJs')), true) */,
				}))));


			nodejsIOInterfaces.REGISTER(doodad.ISOLATED(doodad.MIX_IN(nodejsIOInterfaces.IDuplex.$extend(
				{
					$TYPE_NAME: 'ITransform',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ITransformIsolatedMixInNodeJs')), true) */,

				// ????
				}))));


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
