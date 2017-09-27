//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: Client_IO.js - Client IO functions
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

exports.add = function add(DD_MODULES) {
	DD_MODULES = (DD_MODULES || {});
	DD_MODULES['Doodad.Client.IO'] = {
		version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
		dependencies: [
			'Doodad.IO/common', 
		],
			
		create: function create(root, /*optional*/_options, _shared) {
			"use strict";

			//===================================
			// Get namespaces
			//===================================

			const doodad = root.Doodad,
				types = doodad.Types,
				tools = doodad.Tools,
				files = tools.Files,
				client = doodad.Client,
				clientIO = client.IO,
				mixIns = doodad.MixIns,
				io = doodad.IO,
				ioMixIns = io.MixIns;
				

			tools.complete(_shared.Natives, {
				windowFile: (types.isNativeFunction(global.File) ? global.File : undefined),
				windowBlob: (types.isNativeFunction(global.Blob) ? global.Blob : undefined),
				windowFetch: (types.isNativeFunction(global.fetch) ? global.fetch : undefined),
				windowHeaders: (types.isNativeFunction(global.Headers) ? global.Headers : undefined),
				windowFileReader: (types.isNativeFunction(global.FileReader) ? global.FileReader : undefined),
			});
				
				
			const __Internal__ = {
				streamsSupported: (_shared.Natives.windowFile && types.isNativeFunction(_shared.Natives.windowFile.prototype.slice)) && 
								(_shared.Natives.windowBlob && types.isNativeFunction(_shared.Natives.windowBlob.prototype.slice)) &&
								(_shared.Natives.windowFetch && _shared.Natives.windowHeaders && _shared.Natives.windowFileReader),
			};

				
			clientIO.REGISTER(io.TextInputStream.$extend(
									ioMixIns.KeyboardInput,
									mixIns.JsEvents,
									ioMixIns.ObjectTransformableIn,
									ioMixIns.ObjectTransformableOut,
			{
				$TYPE_NAME: 'KeyboardInputStream',
				$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('KeyboardInputStream')), true) */,
					
				element: doodad.READ_ONLY(null),
					
				__listening: doodad.PROTECTED(false),
				__buffer: doodad.PROTECTED(null),

				onReady: doodad.CALL_FIRST(doodad.OVERRIDE(function onReady(ev) {
					ev.data.event = ev;

					return this._super(ev);
				})),

				onJsClick: doodad.PROTECTED(doodad.JS_EVENT('click', function onJsClick(context) {
					// Shows virtual keyboard on mobile phones and tablets.
					if (this.element.focus) {
						this.element.focus();
					};
				})),
					
				onJsKeyDown: doodad.PROTECTED(doodad.JS_EVENT('keydown', function onJsKeyDown(context) {
					if (this.__listening) {
						const ev = context.event;

						const key = {};

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

						key.charCode = charCode;
						key.scanCode = scanCode;
						key.text = String.fromCharCode(charCode);
						key.functionKeys = functionKeys;

						const data = new io.Data(key);

						this.push(data);

						if (data.event.prevent) {
							ev.preventDefault();
							return false;
						};
					};
				})),
					
				onJsKeyPress: doodad.PROTECTED(doodad.JS_EVENT('keypress', function onJsKeyPress(context) {
					if (this.__listening) {
						const ev = context.event;

						const key = {};

						const unifiedEv = ev.getUnified();
						key.text = String.fromCharCode(unifiedEv.which);

						const data = new io.Data(key);

						this.push(data);

						if (data.event.prevent) {
							ev.preventDefault();
							return false;
						};
					};
				})),

				setOptions: doodad.OVERRIDE(function setOptions(options) {
					types.getDefault(options, 'element', types.getIn(this.options, 'element', global.document));

					this._super(options);

					if (root.DD_ASSERT) {
						root.DD_ASSERT(types.isNothing(this.options.element) || client.isElement(this.options.element) || client.isDocument(this.options.element), "Invalid element.");
					};

					_shared.setAttribute(this, 'element', this.options.element);
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
						this.onJsKeyPress.attach(this.element);
						this.onListen();
					};
				}),

				stopListening: doodad.OVERRIDE(function stopListening(/*optional*/options) {
					if (this.__listening) {
						this.__listening = false;
						this.onJsClick.clear();
						this.onJsKeyDown.clear();
						this.onJsKeyPress.clear();
						this.onStopListening();
					};
				}),
			}));

				
			/* TODO: Complete and Test
			clientIO.REGISTER(io.HtmlOutputStream.$extend(
			{
				$TYPE_NAME: 'DocumentOutputStream',
				$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('DocumentOutputStream')), true) * /,
					
				document: doodad.READ_ONLY(null),
					
				setOptions: doodad.OVERRIDE(function setOptions(options) {
					types.getDefault(options, 'document', types.getIn(this.options, 'document', global.document)),
					types.getDefault(options, 'mimeType', types.getIn(this.options, 'mimeType', 'text/html')),
					types.getDefault(options, 'openNew', types.getIn(this.options, 'openNew', false)),
					types.getDefault(options, 'replace', types.getIn(this.options, 'replace', false));
						
					this._super(options);

					root.DD_ASSERT && root.DD_ASSERT(types.isNothing(this.options.mimeType) || types.isString(this.options.mimeType), "Invalid mime type.");
					root.DD_ASSERT && root.DD_ASSERT(client.isDocument(this.options.document), "Invalid document.");
						
					if (this.options.openNew) {
						if (this.options.replace) {
							this.options.document.open(this.options.mimeType, 'replace');
						} else {
							this.options.document.open(this.options.mimeType);
						};
					};

					_shared.setAttribute(this, 'document', this.options.document);
				}),

				destroy: doodad.OVERRIDE(function destroy() {
					if (this.options.openNew) {
						this.document.close();
					};
						
					this._super();
				}),
					
				onFlushData: doodad.OVERRIDE(function onFlushData(ev) {
					const retval = this._super(ev);
					if (ev.data.raw !== io.EOF) {
						this.document.write(ev.data.valueOf());
					};
					return retval;
				}),
			}));
			*/


			clientIO.REGISTER(io.HtmlOutputStream.$extend(
			{
				$TYPE_NAME: 'DomOutputStream',
				$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('DomOutputStream')), true) */,
					
				element: doodad.PUBLIC(doodad.READ_ONLY(null)),

				__div: doodad.PROTECTED(null),
					
				setOptions: doodad.OVERRIDE(function setOptions(options) {
					types.getDefault(options, 'element', types.getIn(this.options, 'element', global.document && global.document.body));
						
					this._super(options);

					root.DD_ASSERT && root.DD_ASSERT(client.isElement(this.options.element), "Invalid element.");
						
					this.__div = this.options.element.ownerDocument.createElement('div');
						
					_shared.setAttribute(this, 'element', this.options.element);
				}),
					
				prepareFlushState: doodad.OVERRIDE(function prepareFlushState(options) {
					const state = this._super(options);
						
					const element = this.element;
					root.DD_ASSERT && root.DD_ASSERT(element);
					state.parent = element;
						
					return state;
				}),
					
				handleBufferData: doodad.SUPER(function handleBufferData(data, state) {
					let html = this._super(data, state);
						
					data = data.valueOf();
						
					var	type = data[0],
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
							_shared.setAttribute(this, 'element', element);
							html = null;
						} else {
							container = this.__div;
							container.innerHTML = html;
							element = client.getFirstElement(container);
							container.innerHTML = '';
							if (element) {
								state.parent.appendChild(element);
							};
						};
						state.parent = element;
					} else if (type === state.bufferTypes.Close) {
						state.parent = state.parent.parentElement;
						root.DD_ASSERT && root.DD_ASSERT(state.parent);
					} else if (type === state.bufferTypes.Flush) {
						container = data[2];
						if (container && !container.parentNode) {
							while (element = container.firstChild) {
								state.parent.appendChild(element);
							};
						};
					};
						
					return html;
				}),

				onData: doodad.OVERRIDE(function onData(ev) {
					const retval = this._super(ev);
					
					ev.preventDefault();
					
					return retval;
				}),

				flush: doodad.OVERRIDE(function flush(/*optional*/options) {
					this._super(options);

					this.__div.innerHTML = '';
				}),

				openStream: doodad.OVERRIDE(function openStream(/*optional*/options) {
					root.DD_ASSERT && root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						
					options = tools.extend({}, this.options, options);

					const bufferTypes = types.getType(this).$__bufferTypes;
						tag = types.get(options, 'tag', null);

					let attrs = types.get(options, 'attrs', null);
						
					if (root.DD_ASSERT) {
						root.DD_ASSERT(types.isStringAndNotEmptyTrim(tag), "Invalid tag.");
						root.DD_ASSERT(types.isNothing(attrs) || types.isString(attrs), "Invalid attributes.");
					};

					if (attrs) {
						attrs = tools.trim(attrs);
					};
					const container = this.__div;
					if (attrs && attrs.length) {
						container.innerHTML = ('<' + tag + ' ' + attrs + '></' + tag + '>' + this.options.newLine);
					} else {
						container.innerHTML = ('<' + tag + '></' + tag + '>' + this.options.newLine);
					};
						
					options.element = client.getFirstElement(container);
						
					container.innerHTML = '';

					return this._super(tools.extend({}, options, {noOpenClose: true}));
				}),

				openElement: doodad.OVERRIDE(function openElement(/*optional*/options) {
					this._super(options);
						
					const tags = this.__tags;
					tags[tags.length - 1][1] = this.element;
				}),

				closeElement: doodad.OVERRIDE(function closeElement() {
					const tags = this.__tags;
						
					root.DD_ASSERT && root.DD_ASSERT((tags.length > 0), "No more elements opened.");
						
					const tag = tags[tags.length - 1],
						element = tag[1];

					this._super();
						
					_shared.setAttribute(this, 'element', element);
				}),

				reset: doodad.OVERRIDE(function reset() {
					this._super();
						
					_shared.setAttribute(this, 'element', this.options.element);
				}),

				clear: doodad.OVERRIDE(function clear() {
					this._super();
						
					if (this.element) {
						this.element.innerHTML = '';
					};
				}),
			}));

/*
			// TODO : Test and debug
			clientIO.REGISTER(io.InputStream.$extend(
									mixIns.JsEvents,
			{
				$TYPE_NAME: 'FileInputStream',
				$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('FileInputStream')), true) * /,
					
				__listening: doodad.PROTECTED(false),
				__file: doodad.PROTECTED(null),
				__fileReader: doodad.PROTECTED(null),
				__fileOffset: doodad.PROTECTED(null),
					
				__buffer: doodad.PROTECTED(null),

				create: doodad.OVERRIDE(function create(file, /*optional* /options) {
					if (!__Internal__.streamsSupported) {
						throw new types.NotSupported("Browser streams are not supported.");
					};

					if (root.DD_ASSERT) {
						root.DD_ASSERT((file instanceof _shared.Natives.windowFile) || (file instanceof _shared.Natives.windowBlob), "Invalid file or blob object.");
					};
						
					this._super(options);

					this.__file = file;
				}),

				setOptions: doodad.OVERRIDE(function setOptions(options) {
					types.getDefault(options, 'chunkSize', types.getIn(this.options, 'chunkSize', 4096));

					this._super(options);

					root.DD_ASSERT && root.DD_ASSERT(types.isInteger(this.options.chunkSize), "Invalid chunk size.");
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
						this.push(new io.BinaryData(this.__fileReader.result));
							
						const encoding = types.get(this.options, 'encoding', null);

						this.__fileOffset += ev.loaded;
							
						const remaining = this.__file.size - this.__fileOffset,
							end = this.__fileOffset + Math.min(this.options.chunkSize, remaining);

						if (remaining > 0) {
							if (encoding) {
								// TODO: Create class "TextInputStream" and implement "TextTransformable" instead
								this.__fileReader.readAsText(this.__file.slice(this.__fileOffset, end), encoding);
							} else {
								this.__fileReader.readAsArrayBuffer(this.__file.slice(this.__fileOffset, end));
							};
								
						} else {
							this.push(new io.Data(io.EOF));
						};
					};
				})),
					
				isListening: doodad.OVERRIDE(function isListening() {
					return this.__listening;
				}),

				listen: doodad.OVERRIDE(function listen(/*optional* /options) {
					if (!this.__listening) {
						this.__listening = true;
						const encoding = types.get(this.options, 'encoding', null);
						this.__fileReader = new _shared.Natives.windowFileReader();
						this.__fileOffset = 0;
						this.onJsLoadEnd.attach(this.__fileReader);
						if (this.options.chunkSize >= this.__file.size) {
							if (encoding) {
								this.__fileReader.readAsText(this.__file, encoding);
							} else {
								this.__fileReader.readAsArrayBuffer(this.__file);
							};
						} else {
							if (encoding) {
								this.__fileReader.readAsText(this.__file.slice(0, this.options.chunkSize), encoding);
							} else {
								this.__fileReader.readAsArrayBuffer(this.__file.slice(0, this.options.chunkSize));
							};
						};
						this.onListen(new doodad.Event());
					};
				}),
					
				stopListening: doodad.OVERRIDE(function stopListening(/*optional* /options) {
					if (this.__listening) {
						this.__listening = false;
						this.onJsLoadEnd.clear();
						if (this.__fileReader && (this.__fileReader.readyState === _shared.Natives.windowFileReader.LOADING)) {
							this.__fileReader.abort();
						};
						this.onStopListening(new doodad.Event());
					};
				}),
			}));
				
			files.ADD('openFile', function openFile(url, /*optional* /options) {
				if (!__Internal__.streamsSupported) {
					throw new types.NotSupported("Streams are not supported.");
				};
				url = files.parseUrl(url, types.get(options, 'parseOptions'));
				root.DD_ASSERT && root.DD_ASSERT(url instanceof files.Url, "Invalid url.");
				url = url.toString();
				const encoding = types.get(options, 'encoding', null);
				const Promise = types.getPromise();
				return Promise.create(function openFilePromise(resolve, reject) {
					const headers = new _shared.Natives.windowHeaders(types.get(options, 'headers'));
					if (!headers.has('Accept')) {
						if (encoding) {
							headers.set('Accept', 'text/plain');
						} else {
							headers.set('Accept', '* /*');  Remove space between * and /
						};
					};
					const init = {
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
					_shared.Natives.windowFetch.call(global, url, init).then(function(response) {
						if (response.ok || types.HttpStatus.isSuccessful(response.status)) {
							return response.body.getReader().then(function(blob) {
								resolve(new clientIO.FileInputStream(blob, options));
							});
						} else {
							reject(new types.HttpError(response.status, response.statusText));
						};
					});
				});
			});
*/

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

//! END_MODULE()