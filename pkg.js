'use strict';
/*jslint */
/*global require */

require({
    packages: [
        {
            name: 'pkg',
            location: '.'
        },
        {
            name: 'cpm',
            location: 'packages/cpm',
            main: 'cpm'
        }
    ]
});
require(['sys', 'pkg'], function (sys, pkg) {
    pkg(function (result) {
        sys.puts(result);
    });
});
