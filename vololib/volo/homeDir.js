/**
* @license Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
* Available via the MIT or new BSD license.
* see: http://github.com/volojs/volo for details
*/

/*jslint node: true */
/*global define */
'use strict';

define(function (require) {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
});