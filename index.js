// dOOdad - Object-oriented programming framework
// File: index.js - IO module startup file
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

(function() {
	var global = this;

	var exports = {};
	if (typeof process === 'object') {
		module.exports = exports;
	};
	
	var MODULE_NAME = 'doodad-js-io';
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES[MODULE_NAME] = {
			type: 'Package',
			version: '0.4.0d',
			namespaces: null,
			dependencies: ['Doodad.Modules'],
			exports: exports,
			
			create: function create(root, /*optional*/_options) {
				"use strict";
				
				var doodad = root.Doodad,
					modules = doodad.Modules,
					files = [];
				
				var fromSource = root.getOptions().settings.fromSource;
				
				if (typeof process === 'object') {
					files.push(
						(fromSource ? 'src/common/IO.js' : 'IO.min.js'),
						(fromSource ? 'src/server/NodeJs_IO.js' : 'NodeJs_IO.min.js')
					);
				} else {
					files.push(
						(fromSource ? 'IO.js' : 'IO.min.js'),
						(fromSource ? 'Client_IO.js' : 'Client_IO.min.js')
					);
				};
				
				return modules.load(MODULE_NAME, files, _options);
			},
		};
		return DD_MODULES;
	};
	
	if (typeof process !== 'object') {
		// <PRB> export/import are not yet supported in browsers
		global.DD_MODULES = exports.add(global.DD_MODULES);
	};
}).call((typeof global !== 'undefined') ? global : ((typeof window !== 'undefined') ? window : this));