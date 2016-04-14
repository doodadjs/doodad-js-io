//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// dOOdad - Object-oriented programming framework
// File: Client_IO.js - Client IO functions
// Project home: https://sourceforge.net/projects/doodad-js/
// Trunk: svn checkout svn://svn.code.sf.net/p/doodad-js/code/trunk doodad-js-code
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

(function() {
	var global = this;

	var exports = {};
	
	//! BEGIN_REMOVE()
	if ((typeof process === 'object') && (typeof module === 'object')) {
	//! END_REMOVE()
		//! IF_DEF("serverSide")
			module.exports = exports;
		//! END_IF()
	//! BEGIN_REMOVE()
	};
	//! END_REMOVE()
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.Client.IO'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE() */,
			dependencies: [
				//{
				//	name: 'doodad-js', 
				//	version: /*! REPLACE_BY(TO_SOURCE(VERSION('doodad-js'))) */ null /*! END_REPLACE() */,
				//},
				'Doodad.Client', 
				'Doodad.IO', 
			],
			
			create: function create(root, /*optional*/_options) {
				"use strict";

				//===================================
				// Get namespaces
				//===================================

				var doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					files = tools.Files,
					client = doodad.Client,
					clientIO = client.IO,
					mixIns = doodad.MixIns,
					io = doodad.IO,
					ioMixIns = io.MixIns;
				

				var __Natives__ = {
					windowFile: (types.isNativeFunction(global.File) ? global.File : undefined),
					windowBlob: (types.isNativeFunction(global.Blob) ? global.Blob : undefined),
					windowFetch: (types.isNativeFunction(global.fetch) ? global.fetch : undefined),
					windowHeaders: (types.isNativeFunction(global.Headers) ? global.Headers : undefined),
					windowFileReader: (types.isNativeFunction(global.FileReader) ? global.FileReader : undefined),
				};
				
				
				var __Internal__ = {
					streamsSupported: (__Natives__.windowFile && types.isNativeFunction(__Natives__.windowFile.prototype.slice)) && 
									(__Natives__.windowBlob && types.isNativeFunction(__Natives__.windowBlob.prototype.slice)) &&
									(__Natives__.windowFetch && __Natives__.windowHeaders && __Natives__.windowFileReader),
				};

				
				clientIO.REGISTER(io.TextInputStream.$extend(
										ioMixIns.KeyboardInput,
										mixIns.JsEvents,
				{
					$TYPE_NAME: 'KeyboardInputStream',
					
					element: doodad.READ_ONLY(null),
					
					__listening: doodad.PROTECTED(false),
					__buffer: doodad.PROTECTED(null),
					__pendingData: doodad.PROTECTED({
						charCode: null,
						scanCode: null,
						text: null,
						raw: null,
						functionKeys: null,
					}),
					
					transform: doodad.OVERRIDE(function transform(data, /*optional*/options) {
						// NOTE: data.raw is a "keydown" or "keypress" event object
						var data = this._super(data) || data;
						if (data.raw.type === 'keypress') {
							var unifiedEv = data.raw.getUnified();
							data.text = String.fromCharCode(unifiedEv.which);
							
						} else {
							var	functionKeys = 0,
								charCode = data.raw.charCode,
								scanCode = data.raw.keyCode;
							
							if (data.raw.shiftKey) {
								functionKeys |= io.KeyboardFunctionKeys.Shift;
							};
							if (data.raw.ctrlKey) {
								functionKeys |= io.KeyboardFunctionKeys.Ctrl;
							};
							if (data.raw.altKey) {
								functionKeys |= io.KeyboardFunctionKeys.Alt;
							};
							if (data.raw.metaKey) {
								functionKeys |= io.KeyboardFunctionKeys.Meta;
							};
							
							if (!functionKeys) {
								if (charCode === 0) {
									// TODO: Fix every other wrong char codes
									if (scanCode === io.KeyboardScanCodes.Enter) {
										charCode = 10; // "\n"
									};
								};
							};

							data.charCode = charCode;
							data.scanCode = scanCode;
							data.text = String.fromCharCode(charCode);
							data.functionKeys = functionKeys;
						};
						data.valueOf = function() {
							// TODO: ANSI sequence ?
							if (data.functionKeys & io.KeyboardFunctionKeys.Alt) {
								return '';
							};
							if (data.functionKeys & io.KeyboardFunctionKeys.Ctrl) {
								var chr = data.text.toUpperCase();
								if ((chr >= 'A') && (chr <= 'Z')) {
									return '^' + chr;
								} else {
									return '';
								};
							};
							return data.text;
						};
					}),

					onJsClick: doodad.PROTECTED(doodad.JS_EVENT('click', function onJsClick(ev) {
						try {
							// Shows virtual keyboard on mobile phones and tablets.
							if (this.element.focus) {
								this.element.focus();
							};
						} catch(ex) {
							if (ex instanceof types.ScriptAbortedError) {
								throw ex;
							};
							if (root.DD_ASSERT) {
								debugger;
							};
							this.onError(new doodad.ErrorEvent(ex));
						};
					})),
					
					onJsKeyDown: doodad.PROTECTED(doodad.JS_EVENT(['keydown', 'keypress'], function onJsKeyDown(ev) {
						var prevent = false;
						try {
							this.__pendingData.raw = ev;
							var data = this.transform(this.__pendingData) || this.__pendingData;

							data.options = this.options;

							if (this.__listening) {
								var readyEv = new doodad.Event(data);
								this.onReady(readyEv);
								prevent = readyEv.prevent;
							};
							
							if (!prevent) {
								if (this.__buffer.length < this.options.bufferSize) {
									this.__buffer.push(data);
								} else {
									throw new types.BufferOverflow();
								};
							};
							
						} catch(ex) {
							if (ex instanceof types.ScriptAbortedError) {
								throw ex;
							};
							if (root.DD_ASSERT) {
								debugger;
							};
							this.onError(new doodad.ErrorEvent(ex));
						} finally {
							if (prevent) {
								ev.preventDefault();
								return false;
							};
						};
					})),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						var element = types.getDefault(this.options, 'element', global.document);

						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(element) || client.isElement(element) || client.isDocument(element), "Invalid element.");
						};

						types.setAttribute(this, 'element', this.options.element);
						
						this.__buffer = [];
					}),
					destroy: doodad.OVERRIDE(function destroy() {
						this.stopListening();
						
						this._super();
					}),
					
					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						if (!this.__listening) {
							this.__listening = true;
							this.onJsClick.attach(this.element);
							this.onJsKeyDown.attach(this.element);
						};
					}),
					stopListening: doodad.OVERRIDE(function stopListening(/*optional*/options) {
						if (this.__listening) {
							this.__listening = false;
							this.onJsClick.clear();
							this.onJsKeyDown.clear();
						};
					}),
					getCount: doodad.OVERRIDE(function getCount(/*optional*/options) {
						return this.__buffer.length;
					}),
					read: doodad.OVERRIDE(function read(/*optional*/options) {
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						};
						
						var count = types.get(options, 'count');

						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(count) || types.isInteger(count), "Invalid count.");
						};

						if (types.isNothing(count)) {
							return this.__buffer.shift();
						} else {
							return this.__buffer.splice(0, count);
						};
					}),
					clear: doodad.OVERRIDE(function clear() {
						this._super();
						this.__buffer = [];
					}),
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						this.__buffer = [];
					}),
				}));

				
				
				clientIO.REGISTER(io.HtmlOutputStream.$extend(
				{
					$TYPE_NAME: 'DocumentOutputStream',
					
					document: doodad.READ_ONLY(null),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						var _document = types.getDefault(this.options, 'document', global.document),
							mimeType = types.get(this.options, 'mimeType', null),
							openNew = types.get(this.options, 'openNew', false);
						
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(mimeType) || types.isString(mimeType), "Invalid mime type.");
						root.DD_ASSERT && root.DD_ASSERT(client.isDocument(_document), "Invalid document.");
						
						if (openNew) {
							if (this.options.replaceHistory) {
								_document.open(mimeType || 'text/html', 'replace');
							} else {
								_document.open(mimeType || 'text/html');
							};
						};

						types.setAttribute(this, 'document', _document);
					}),
					destroy: doodad.OVERRIDE(function destroy() {
						if (this.options.openNew) {
							this.document.close();
						};
						
						this._super();
					}),
					
					flush: doodad.OVERRIDE(function flush(/*optional*/options) {
						var data,
							buffer = this.__buffer;
						
						while (data = buffer.shift()) {
							if (data.raw !== io.EOF) {
								var value = data.valueOf();
								this.document.write(value.valueOf());
							};
						};

						this._super(options);
					}),
				}));


				clientIO.REGISTER(io.HtmlOutputStream.$extend(
				{
					$TYPE_NAME: 'DomOutputStream',
					
					element: doodad.READ_ONLY(null),

					__div: doodad.PROTECTED(null),
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						var element = types.getDefault(this.options, 'element', global.document && global.document.body);
						
						root.DD_ASSERT && root.DD_ASSERT(client.isElement(element), "Invalid element.");
						
						this.__div = element.ownerDocument.createElement('div');
						
						types.setAttribute(this, 'element', element);
					}),
					
					prepareFlushState: doodad.OVERRIDE(function prepareFlushState(options) {
						var state = this._super(options);
						
						var element = this.element;
						root.DD_ASSERT && root.DD_ASSERT(element);
						state.parent = element;
						
						return state;
					}),
					handleBufferData: doodad.SUPER(function handleBufferData(bufferIndex, state) {
						var html = this._super(bufferIndex, state);
						
						var data = state.buffer[bufferIndex],
							type = data[0],
							container,
							element;
						
						if (type === state.bufferTypes.Html) {
							container = this.__div;
							container.innerHTML = html;
							while (element = container.firstChild) {
								state.parent.appendChild(element);
							};
						} else if (type === state.bufferTypes.Open) {
							if (state.flushElement) {
								state.flushElement = false;
								state.flushElementChunk[2] = element = this.element.ownerDocument.createElement('div');
								types.setAttribute(this, 'element', element);
								html = null;
							} else {
								container = this.__div;
								container.innerHTML = html;
								element = client.getFirstElement(container);
								root.DD_ASSERT && root.DD_ASSERT(element);
								container.innerHTML = '';
								state.parent.appendChild(element);
							};
							state.parent = element;
						} else if (type === state.bufferTypes.Close) {
							state.parent = state.parent.parentElement;
							root.DD_ASSERT && root.DD_ASSERT(state.parent);
						} else if (type === state.bufferTypes.Flush) {
							container = data[2];
							if (container) {
								while (element = container.firstChild) {
									state.parent.appendChild(element);
								};
							};
						};
						
						return html;
					}),
					flush: doodad.OVERRIDE(function flush(/*optional*/options) {
						this._super(options);

						this.__div.innerHTML = '';
					}),
					openStream: doodad.OVERRIDE(function openStream(/*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						
						options = types.extend({}, this.options, options);

						var bufferTypes = types.getType(this).$__bufferTypes,
							tag = types.get(options, 'tag', null),
							attrs = types.get(options, 'attrs', null);
						
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isStringAndNotEmptyTrim(tag), "Invalid tag.");
							root.DD_ASSERT(types.isNothing(attrs) || types.isString(attrs), "Invalid attributes.");
						};

						if (attrs) {
							attrs = tools.trim(attrs);
						};
						var container = this.__div;
						if (attrs && attrs.length) {
							container.innerHTML = ('<' + tag + ' ' + attrs + '></' + tag + '>' + this.options.newLine);
						} else {
							container.innerHTML = ('<' + tag + '></' + tag + '>' + this.options.newLine);
						};
						
						options.element = client.getFirstElement(container);
						
						container.innerHTML = '';

						var stream = this._super(options);
						
						var deletedType = bufferTypes.Deleted,
							buffer = this.__buffer,
							pos = buffer.length - 3;
						
						buffer[pos][0] = deletedType;
						buffer[pos + 2][0] = deletedType;
						
						return stream;
					}),
					openElement: doodad.OVERRIDE(function openElement(/*optional*/options) {
						this._super(options);
						
						var tags = this.__tags;
						tags[tags.length - 1][1] = this.element;
					}),
					closeElement: doodad.OVERRIDE(function closeElement() {
						var tags = this.__tags;
						
						root.DD_ASSERT && root.DD_ASSERT((tags.length > 0), "No more elements opened.");
						
						var tag = tags[tags.length - 1],
							element = tag[1];

						this._super();
						
						types.setAttribute(this, 'element', element);
					}),
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						types.setAttribute(this, 'element', this.options.element);
					}),
					clear: doodad.OVERRIDE(function clear() {
						this._super();
						
						if (this.element) {
							this.element.innerHTML = '';
						};
					}),
				}));
		

				clientIO.REGISTER(io.InputStream.$extend(
										mixIns.JsEvents,
				{
					$TYPE_NAME: 'FileInputStream',
					
					__listening: doodad.PROTECTED(false),
					__file: doodad.PROTECTED(null),
					__fileReader: doodad.PROTECTED(null),
					__fileOffset: doodad.PROTECTED(null),
					
					__buffer: doodad.PROTECTED([]),

					create: doodad.OVERRIDE(function create(file, /*optional*/options) {
						if (!__Internal__.streamsSupported) {
							throw new types.NotSupported("Streams are not supported.");
						};

						if (root.DD_ASSERT) {
							root.DD_ASSERT((file instanceof __Natives__.windowFile) || (file instanceof __Natives__.windowBlob), "Invalid file or blob object.");
						};
						
						this._super(options);

						var chunkSize = types.getDefault(this.options, 'chunkSize', 4096)
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isInteger(chunkSize), "Invalid chunk size.");
						};

						this.__file = file;
					}),
					
					destroy: doodad.OVERRIDE(function destroy() {
						this.stopListening();
						
						if (this.__file) {
							this.__file.close();
							this.__file = null;
						};
						
						this._super();
					}),
					
					onJsLoadEnd: doodad.PROTECTED(doodad.JS_EVENT('loadend', function onJsLoadEnd(ev) {
						if (this.__fileReader.error) {
							this.onError(new doodad.ErrorEvent(this.__fileReader.error));
							
						} else {
							var data = {
								raw: this.__fileReader.result,
							};
							data = this.transform(data) || data;
							
							var readyEvent = new doodad.Event(data),
								prevent = false;
							
							if (this.__listening) {
								var readyEv = new doodad.Event(data);
								this.onReady(readyEv);
								prevent = readyEv.prevent;
							};
							
							if (!prevent) {
								if (this.__buffer.length < this.options.bufferSize) {
									this.__buffer.push(data);
								} else {
									throw new types.BufferOverflow();
								};
							};
							
							var encoding = types.get(this.options, 'encoding', null);

							this.__fileOffset += ev.loaded;
							
							var remaining = this.__file.size - this.__fileOffset,
								end = this.__fileOffset + Math.min(this.options.chunkSize, remaining);

							if (remaining > 0) {
								if (encoding) {
									this.__fileReader.readAsText(this.__file.slice(this.__fileOffset, end), encoding);
								} else {
									this.__fileReader.readAsArrayBuffer(this.__file.slice(this.__fileOffset, end));
								};
								
							} else {
								var data = {
									raw: io.EOF,
								};
								data = this.transform(data) || data;
								
								if (this.__listening) {
									var readyEv = new doodad.Event(data);
									this.onReady(readyEv);
									prevent = readyEv.prevent;
								};
								
								if (!prevent) {
									if (this.__buffer.length < this.options.bufferSize) {
										this.__buffer.push(data);
									} else {
										throw new types.BufferOverflow();
									};
								};
							};
						};
					})),
					
					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),

					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						if (!this.__listening) {
							this.__listening = true;
							var encoding = types.get(this.options, 'encoding', null);
							this.__fileReader = new __Natives__.windowFileReader();
							this.__fileOffset = 0;
							this.onJsLoadEnd.attach(this.__fileReader);
							if (this.options.chunkSize >= this.__file.size) {
								if (encoding) {
									this.__fileReader.readAsText(this.__file, encoding)
								} else {
									this.__fileReader.readAsArrayBuffer(this.__file)
								};
							} else {
								if (encoding) {
									this.__fileReader.readAsText(this.__file.slice(0, this.options.chunkSize), encoding)
								} else {
									this.__fileReader.readAsArrayBuffer(this.__file.slice(0, this.options.chunkSize))
								};
							};
						};
					}),
					
					stopListening: doodad.OVERRIDE(function stopListening(/*optional*/options) {
						if (this.__listening) {
							this.__listening = false;
							this.onJsLoadEnd.clear();
							if (this.__fileReader && (this.__fileReader.readyState === __Natives__.windowFileReader.LOADING)) {
								this.__fileReader.abort();
							};
						};
					}),
					
					getCount: doodad.OVERRIDE(function getCount(/*optional*/options) {
						return this.__buffer.length;
					}),
					
					read: doodad.OVERRIDE(function read(/*optional*/options) {
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						};
						
						var count = types.get(options, 'count');

						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(count) || types.isInteger(count), "Invalid count.");
						};

						if (types.isNothing(count)) {
							return this.__buffer.shift();
						} else {
							return this.__buffer.splice(0, count);
						};
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						this._super();
						this.__buffer = [];
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						this.__buffer = [];
					}),
				}));
				
				files.openFile = function openFile(url, /*optional*/options) {
					if (!__Internal__.streamsSupported) {
						throw new types.NotSupported("Streams are not supported.");
					};
					url = files.getOptions().hooks.urlParser(url, types.get(options, 'parseOptions'));
					root.DD_ASSERT && root.DD_ASSERT(url instanceof files.Url, "Invalid url.");
					url = url.toString();
					var encoding = types.get(options, 'encoding', null);
					var Promise = types.getPromise();
					return new Promise(function(resolve, reject) {
						var headers = new __Natives__.windowHeaders(types.get(options, 'headers'));
						if (!headers.has('Accept')) {
							if (encoding) {
								headers.set('Accept', 'text/plain');
							} else {
								headers.set('Accept', '*/*');
							};
						};
						var init = {
							method: 'GET',
							headers: headers,
						};
						if (!types.get(options, 'enableCache', false)) {
							init.cache = 'no-cache';
						};
						if (types.get(options, 'enableCookies', false)) {
							// http://stackoverflow.com/questions/30013131/how-do-i-use-window-fetch-with-httponly-cookies
							init.credentials = 'include';
						};
						__Natives__.windowFetch.call(global, url, init).then(function(response) {
							if (response.ok || types.HttpStatus.isSuccessful(response.status)) {
								return response.body.getReader().then(function(blob) {
									resolve(new clientIO.FileInputStream(blob, options));
								});
							} else {
								reject(new types.HttpError(response.status, response.statusText));
							};
						});
					});
				};
		
		
				//===================================
				// Init
				//===================================
				return function init(/*optional*/options) {
					io.setStds({
						stdin: (new clientIO.KeyboardInputStream()),
					});
				};
			},
		};
		
		return DD_MODULES;
	};
	
	//! BEGIN_REMOVE()
	if ((typeof process !== 'object') || (typeof module !== 'object')) {
	//! END_REMOVE()
		//! IF_UNDEF("serverSide")
			// <PRB> export/import are not yet supported in browsers
			global.DD_MODULES = exports.add(global.DD_MODULES);
		//! END_IF()
	//! BEGIN_REMOVE()
	};
	//! END_REMOVE()
}).call(
	//! BEGIN_REMOVE()
	(typeof window !== 'undefined') ? window : ((typeof global !== 'undefined') ? global : this)
	//! END_REMOVE()
	//! IF_DEF("serverSide")
	//! 	INJECT("global")
	//! ELSE()
	//! 	INJECT("window")
	//! END_IF()
);