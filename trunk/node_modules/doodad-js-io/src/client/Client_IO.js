//! REPLACE_BY("// Copyright 2015 Claude Petit, licensed under Apache License version 2.0\n")
// dOOdad - Object-oriented programming framework with some extras
// File: Client_IO.js - Client IO functions
// Project home: https://sourceforge.net/projects/doodad-js/
// Trunk: svn checkout svn://svn.code.sf.net/p/doodad-js/code/trunk doodad-js-code
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2015 Claude Petit
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
	if (global.process) {
		module.exports = exports;
	};
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.Client.IO'] = {
			type: null,
			version: '0d',
			namespaces: null,
			dependencies: ['Doodad.Types', 'Doodad.Tools', 'Doodad', 'Doodad.Client', 'Doodad.IO'],
			
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
					
					__buffer: doodad.PROTECTED(null),
					__pendingData: doodad.PROTECTED({
						charCode: null,
						scanCode: null,
						text: null,
						raw: null,
						functionKeys: null,
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
							if (ev.type === 'keypress') {
								var unifiedEv = ev.getUnified();
								this.__pendingData.text = String.fromCharCode(unifiedEv.which);
								
							} else {
								var	functionKeys = 0,
									charCode = ev.charCode,
									scanCode = ev.keyCode;
								
								if (ev.shiftKey) {
									functionKeys |= io.KeyboardFunctionKeys.Shift;
								};
								if (ev.ctrlKey) {
									functionKeys |= io.KeyboardFunctionKeys.Ctrl;
								};
								if (ev.altKey) {
									functionKeys |= io.KeyboardFunctionKeys.Alt;
								};
								if (ev.metaKey) {
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

								this.__pendingData.charCode = charCode;
								this.__pendingData.scanCode = scanCode;
								this.__pendingData.text = String.fromCharCode(charCode);
								this.__pendingData.raw = ev;
								this.__pendingData.functionKeys = functionKeys;
							};
							
							var data = types.clone(this.__pendingData);
							data.options = this.options;
							
							var readyEv = new doodad.Event(data);
							this.onReady(readyEv);
							
							prevent = readyEv.prevent;
							if (!prevent) {
								if (this.__buffer.length < this.options.bufferSize) {
									this.__buffer.push(data);
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

						this.setAttribute('element', this.options.element);
						
						this.__buffer = [];
					}),
					destroy: doodad.OVERRIDE(function destroy() {
						this.stopListening();
						
						this._super();
					}),
					
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						this.onJsClick.attach(this.element);
						this.onJsKeyDown.attach(this.element);
					}),
					stopListening: doodad.OVERRIDE(function stopListening(/*optional*/options) {
						this.onJsClick.clear();
						this.onJsKeyDown.clear();
					}),
					getCount: doodad.OVERRIDE(function getCount(/*optional*/options) {
						return this.__buffer.length;
					}),
					read: doodad.OVERRIDE(function read(/*optional*/options) {
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						};
						
						options = types.extend({}, this.options, options);

						var offset = types.getDefault(options, 'offset', 0),
							count = types.getDefault(options, 'count', 1);

						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isInteger(offset), "Invalid offset.");
							root.DD_ASSERT(types.isInteger(count), "Invalid count.");
						};

						if (types.get(options, 'preread', false)) {
							return this.__buffer.slice(offset, count);
						} else {
							return this.__buffer.splice(offset, count);
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

						this.setAttribute('document', _document);
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
							this.document.write(data.text);
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
						
						this.setAttribute('element', element);
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
								this.setAttribute('element', element);
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
							attrs = attrs.trim();
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
						var tags = this.__tags,
							tag = tags[tags.length - 1],
							element = tag[1];

						this._super();
						
						this.setAttribute('element', element);
					}),
					reset: doodad.OVERRIDE(function reset() {
						this._super();
						
						this.setAttribute('element', this.options.element);
					}),
					clear: doodad.OVERRIDE(function clear() {
						this._super();
						
						if (this.element) {
							this.element.innerHTML = '';
						};
					}),
				}));
		

				if (__Internal__.streamsSupported) {
					clientIO.REGISTER(io.InputStream.$extend(
											mixIns.JsEvents,
					{
						$TYPE_NAME: 'FileInputStream',
						
						__file: doodad.PROTECTED(null),
						__fileReader: doodad.PROTECTED(null),
						__fileOffset: doodad.PROTECTED(0),
						
						__buffer: doodad.PROTECTED([]),

						create: doodad.OVERRIDE(function create(file, /*optional*/options) {
							root.DD_ASSERT && root.DD_ASSERT((file instanceof __Natives__.windowFile) || (file instanceof __Natives__.windowBlob), "Invalid file or blob object.");
							this._super(options);
							// TODO: Validate "chunkSize"
							var chunkSize = types.getDefault(this.options, 'chunkSize', 4096)
							this.__file = file;
							this.__fileOffset = types.get(options, 'offset', 0);
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
							// TODO: Handle errors
							if (this.__fileReader.readyState === __Natives__.windowFileReader.DONE) {
								var data = {
									raw: this.__fileReader.result,
									text: this.__fileReader.result,
								};
								
								var readyEvent = new doodad.Event(data);
								
								this.onReady(readyEvent);
								
								if (!readyEvent.prevent) {
									if (this.__buffer.length < this.options.bufferSize) {
										this.__buffer.push(data);
									};
								};
								
								var start = this.__fileOffset,
									remaining = this.__file.size - start,
									end = start + Math.min(this.options.chunkSize, remaining);

								if (remaining > 0) {
									this.__fileOffset = end;
									this.__fileReader.readAsText(this.__file.slice(start, end))
									
								} else {
									var data = {
										raw: io.EOF,
										text: null,
									};
									
									var readyEvent = new doodad.Event(data);
									
									this.onReady(readyEvent);
									
									if (!readyEvent.prevent) {
										if (this.__buffer.length < this.options.bufferSize) {
											this.__buffer.push(data);
										};
									};
								};
							};
						})),
						
						listen: doodad.OVERRIDE(function listen(/*optional*/options) {
							// TODO: Handle errors
							// TODO: Binary files
							// TODO: HTTP Headers
							this.__fileReader = new __Natives__.windowFileReader();
							this.onJsLoadEnd.attach(this.__fileReader);
							if (this.options.chunkSize >= this.__file.size) {
								this.__fileOffset = this.__file.size;
								this.__fileReader.readAsText(this.__file)
							} else {
								var start = this.__fileOffset,
									end = start + this.options.chunkSize;
								this.__fileOffset = end;
								this.__fileReader.readAsText(this.__file.slice(start, end))
							};
						}),
						
						stopListening: doodad.OVERRIDE(function stopListening(/*optional*/options) {
							if (this.__fileReader) {
								this.onJsLoadEnd.clear();
								if (this.__fileReader.readyState === __Natives__.windowFileReader.LOADING) {
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
							
							options = types.extend({}, this.options, options);

							var offset = types.getDefault(options, 'offset', 0),
								count = types.getDefault(options, 'count', 1);

							if (root.DD_ASSERT) {
								root.DD_ASSERT(types.isInteger(offset), "Invalid offset.");
								root.DD_ASSERT(types.isInteger(count), "Invalid count.");
							};

							if (types.get(options, 'preread', false)) {
								return this.__buffer.slice(offset, count);
							} else {
								return this.__buffer.splice(offset, count);
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
						url = tools.options.hooks.urlParser(url, types.get(options, 'parseOptions'));
						root.DD_ASSERT && root.DD_ASSERT(url instanceof tools.Url, "Invalid url.");
						url = url.toString();
						var encoding = types.get(options, 'encoding', null);
						var Promise = tools.getPromise();
						return new Promise(function(resolve, reject) {
							// TODO: Headers in options
							// TODO: Local files ?
							var headers = new __Natives__.windowHeaders();
							if (encoding) {
								headers.append('Accept', 'text/plain');
								headers.append('Accept-Charset', encoding);
							} else {
								headers.append('Accept', '*/*');
							};
							var init = {
								method: 'GET',
								headers: headers,
							};
							if (!types.get(options, 'enableCache', false)) {
								init.cache = 'no-cache';
							};
							__Natives__.windowFetch.call(global, url, init).then(function(response) {
								if (response.ok || (response.status === 0)) {
									return response.blob().then(function(blob) {
										resolve(new clientIO.FileInputStream(blob, options));
									});
								} else {
									reject(new types.HttpError(response.status, response.statusText));
								};
							});
						});
					};
				};
		
		
				//===================================
				// Init
				//===================================
				return function init(/*optional*/options) {
					io.setStds({
						stdin: (new clientIO.KeyboardInputStream()),
						stdout: (new clientIO.DomOutputStream({autoFlush: true})),
					});
				};
			},
		};
		
		return DD_MODULES;
	};
	
	if (!global.process) {
		// <PRB> export/import are not yet supported in browsers
		global.DD_MODULES = exports.add(global.DD_MODULES);
	};
})();