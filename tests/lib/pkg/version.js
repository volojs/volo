
/*jslint plusplus: false */
/*global require, doh */
'use strict';

require(['pkg/version'], function (version) {

    function validate(t, expected, actual) {
        var i;

        t.is(expected.length, actual.length);

        for (i = 0; i < expected.length; i++) {
            t.is(expected[i], actual[i]);
        }
    }

    doh.register("versionTests",
        [
            function versionTests(t) {
                var list1 = ['0.2.0', '0.2.1', '0.3.1', '0.3.0', '1.3.1beta1', '1.3.1pre1', '1.3.1pre2', '1.2.0', '1.3.1'],
                    expected1 = ['1.3.1', '1.3.1pre2', '1.3.1pre1', '1.3.1beta1', '1.2.0', '0.3.1', '0.3.0', '0.2.1', '0.2.0'];
debugger;
                validate(t, expected1, list1.sort(version.compare));
            }
        ]
    );
    doh.run();

});
