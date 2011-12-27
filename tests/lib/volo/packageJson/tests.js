
/*jslint */
/*global require, doh */
'use strict';

require(['volo/packageJson', 'path'], function (packageJson, path) {

    doh.register("packageJsonTests",
        [
            function packageJsonTests(t) {
                var result,
                    basePath = 'lib/volo/packageJson';

                //Test favoring a single js file package.json comment
                //over a package.json file.
                result = packageJson(path.join(basePath, 'hasFile'));
                t.is('empty', result.data.name);
                t.is('1.0', result.data.version);

                //Test file comment
                result = packageJson(path.join(basePath, 'hasJs'));
                t.is('lib', result.data.name);
                t.is('1.0', result.data.version);

                //Test file, but no comment or package.json
                result = packageJson(path.join(basePath, 'hasJsNoComment'));
                t.is(null, result.data);
                t.is('lib/volo/packageJson/hasJsNoComment/lib.js', result.file);

                //Test no package.json and too many .js files
                result = packageJson(path.join(basePath, 'tooManyJs'));
                t.is(null, result.data);
                t.is(null, result.file);
            }
        ]
    );
    doh.run();

});
