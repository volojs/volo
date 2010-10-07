'use strict';
/*jslint */
/*global require */

//Config
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

//Action
require(['sys', 'pkg', 'cpm/cpm-utils/promise'], function (sys, pkg, promise) {
    promise.when(
        pkg(),
        function (result) {
            if (result) {
                sys.puts(result);
            }
        },
        function (err) {
            if (err) {
                sys.puts(err);
            }
        }
    );
});
