
/*jslint node: true */
/*global define, doh */
'use strict';

var github = require(global.voloLib + '/github'),
    q = require('q'),
    start = q.defer(),
    end;

end = start.promise.then(function () {
    return github.latestTag('jquery/jquery/<2.2').then(function (version) {

        doh.register("githubSemVerLessThan",
            [
                function githubSemVerLessThan(t) {
                    t.is('2.1.4', version);
                }
            ]);
        doh.run();
    });
})

.then(function () {
    return github.latestTag('requirejs/requirejs/~2').then(function (version) {

        doh.register("githubSemVerMajorMinor",
            [
                function githubSemVerMajorMinor(t) {
                    t.is('2.2.0', version);
                }
            ]);
        doh.run();
    });
})

.then(function () {
    return github.latestTag('requirejs/requirejs/2.x').then(function (version) {

        doh.register("githubDotXVersion",
            [
                function githubDotXVersion(t) {
                    t.is('2.2.0', version);
                }
            ]);
        doh.run();
    });
})

.then(function () {
    return github.latestTag('requirejs/requirejs/2.0.x').then(function (version) {

        doh.register("githubDotDotXVersion",
            [
                function githubDotDotXVersion(t) {
                    t.is('2.0.6', version);
                }
            ]);
        doh.run();
    });
})


.then(function () {
    return github.latestTag('requirejs/requirejs/2.0.6').then(function (version) {

        doh.register("githubExactVersion",
            [
                function githubExactVersion(t) {
                    t.is('2.0.6', version);
                }
            ]);
        doh.run();
    });
});

module.exports = {
    start: start,
    end: end
};
