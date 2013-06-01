/**
 * @license Copyright (c) 2011-2013, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */

'use strict';

var update = {},
    lang = require('../lib/lang'),
    add = require('./add'),
    oldRun = add.run;

lang.mixin(update, add);

delete update.doc;
update.summary = 'Updates a dependency. Equivalent to doing `volo add -f`. See add docs for options.';

update.run = function (d, v, namedArgs) {
    namedArgs.force = true;
    return oldRun.apply(update, [].slice.call(arguments, 0));
};

module.exports = update;
