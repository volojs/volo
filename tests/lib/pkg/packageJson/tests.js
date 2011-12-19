
/*jslint */
/*global require, doh */
'use strict';

require(['pkg/packageJson'], function (packageJson) {
    doh.register("packageJsonTests",
        [
            function packageJsonTests(t) {
                t.is('function', typeof packageJson);
            }
        ]
    );
    doh.run();
});
