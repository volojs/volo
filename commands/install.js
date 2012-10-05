/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint node: true, nomen: true, regexp: true */
/*global console, process */


'use strict';


var install = {},
    lang = require('../lib/lang'),
    add = require('./add');

lang.mixin(install, add);

delete install.doc;
install.summary = 'An alias for "add".';

module.exports = install;
