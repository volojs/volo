/** vim: et:ts=4:sw=4:sts=4
 * @license pkg Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/pkg for details
 */

/*jslint */
/*global define, nodeRequire */
'use strict';

/**
 * Simple wrappers that load the right node module.
 * nodeRequire is defined in tools/wrap.start
 */
define('fs', [], function () {
    return nodeRequire('fs');
});

define('path', [], function () {
    return nodeRequire('path');
});

