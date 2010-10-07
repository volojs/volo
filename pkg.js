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
require(['sys', 'pkg', 'cpm/cpm-utils/promise'], function (sys, pkg, promise) {
    promise.when(
        pkg(),
        function (result) {
            sys.puts(result);
        },
        function (err) {
            sys.puts(err);
        }
    );
});
