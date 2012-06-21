/*jslint node: true, nomen: true */
/*global doh, voloLib */
'use strict';

var q = require('q'),
    main = require(voloLib + '/../volo'),
    start = q.defer(),
    fs = require('fs'),
    path = require('path'),
    file = require(voloLib + '/file'),
    cwd = process.cwd(),
    dir = __dirname,
    testDir = path.join(dir, 'output'),
    end;

//Clean up old test output, create a fresh directory for it.
end = start.promise.then(function () {
    file.rm(testDir);
    fs.mkdirSync(testDir);
    process.chdir(testDir);
})

//Test a recursive add.
.then(function () {
    fs.mkdirSync('recursiveAdd');
    process.chdir('recursiveAdd');

    return main(['add', '../../support/localModules/d'], function (result) {
        console.log(result);
        doh.register("recursiveAdd",
            [
                function recursiveAdd(t) {

                    var expected = fs.readFileSync('../../support/localModules/d/d.js', 'utf8'),
                        output = fs.readFileSync('d.js', 'utf8');
                    t.is(expected, output, 'd.js');

                    expected = fs.readFileSync('../../support/localModules/a/a.js', 'utf8');
                    output = fs.readFileSync('a.js', 'utf8');
                    t.is(expected, output, 'a.js');

                    expected = fs.readFileSync('../../support/localModules/b/b.js', 'utf8');
                    output = fs.readFileSync('b.js', 'utf8');
                    t.is(expected, output, 'b.js');

                    expected = fs.readFileSync('../../support/localModules/c/c.js', 'utf8');
                    output = fs.readFileSync('c.js', 'utf8');
                    t.is(expected, output, 'c.js');
                }
            ]
        );
        doh.run();
    });
})
.then(function (result) {
    process.chdir('..');
})


//Test add of packages in a package.json.
.then(function () {
    fs.mkdirSync('addAll');
    process.chdir('addAll');

    file.copyFile('../../support/addAll/package.json', 'package.json');

    return main(['add'], function (result) {
        console.log(result);
        doh.register("addAll",
            [
                function recursiveAdd(t) {

                    var expected = fs.readFileSync('../../support/localModules/d/d.js', 'utf8'),
                        output = fs.readFileSync('d.js', 'utf8');
                    t.is(expected, output, 'd.js');

                    expected = fs.readFileSync('../../support/localModules/a/a.js', 'utf8');
                    output = fs.readFileSync('a.js', 'utf8');
                    t.is(expected, output, 'a.js');

                    expected = fs.readFileSync('../../support/localModules/b/b.js', 'utf8');
                    output = fs.readFileSync('b.js', 'utf8');
                    t.is(expected, output, 'b.js');

                    expected = fs.readFileSync('../../support/localModules/c/c.js', 'utf8');
                    output = fs.readFileSync('c.js', 'utf8');
                    t.is(expected, output, 'c.js');

                    expected = fs.readFileSync('../../support/localModules/e/e.js', 'utf8');
                    output = fs.readFileSync('e.js', 'utf8');
                    t.is(expected, output, 'e.js');
                }
            ]
        );
        doh.run();
    });
})
.then(function (result) {
    process.chdir('..');
})


/*
.then(function () {
    return main(['add', '../support/simple'], function (result) {
        console.log(result);
        doh.register("addSimple",
            [
                function addSimple(t) {
                    var expected = fs.readFileSync('../support/simple/simple.js', 'utf8'),
                        output = fs.readFileSync('simple.js', 'utf8');

                    t.is(true, file.exists('simple.js'));
                    t.is(expected, output);
                }
            ]
        );
        doh.run();
    });
})
.then(function () {
    return main(['add', '-amd', '../support/simple', 'simpleAmd', 'depends=foo'], function (result) {
        console.log(result);
        doh.register("addSimpleAmd",
            [
                function addSimpleAmd(t) {
                    var expected = fs.readFileSync('../expected/simpleAmd.js', 'utf8'),
                        output = fs.readFileSync('simpleAmd.js', 'utf8');

                    t.is(true, file.exists('simpleAmd.js'));
                    t.is(expected, output);
                }
            ]
        );
        doh.run();
    });
})
*/

/*
.then(function () {
    return main(['add', 'volojs/test-package-download'], function (result) {
        console.log(result);
        doh.register("addSingleFileFromGitHubDownloadZip",
            [
                function addSingleFileFromGitHubDownloadZip(t) {
                    t.is(true, file.exists('test-package-download.js'));
                    t.is(false, file.exists('test-package-download'));
                }
            ]
        );
        doh.run();
    });
})
*/

//Tests #37, use of non-master master, and #41, use volo.url name, not repo name.
.then(function () {
    return main(['add', 'volojs/test-nomaster'], function (result) {
        console.log(result);
        doh.register("addNoMaster",
            [
                function addNoMaster(t) {
                    t.is(true, file.exists('real.js'), 'real.js is there');
                    t.is(false, file.exists('fake.js'), 'fake.js should not exist');
                    t.is(false, file.exists('test-nomaster'), 'test-nomaster should not exist');
                    t.is(false, file.exists('test-nomaster.js'), 'test-nomaster should not exist');
                }
            ]
        );
        doh.run();
    });
})

//Tests #56, use default branch's package.json if a version tag does not have
//one.
.then(function () {
    return main(['add', 'volojs/test-noversionjson'], function (result) {
        console.log(result);
        doh.register("addNoVersionJson",
            [
                function addNoVersionJson(t) {
                    t.is(true, file.exists('lib.js'), 'lib.js is there');
                    t.is(false, file.exists('fake.js'), 'fake.js should not exist');
                    t.is(false, file.exists('test-noversionjson'), 'test-noversionjson should not exist');
                }
            ]
        );
        doh.run();
    });
})

//Tests #59, content-type check the volo.url, and if an archive, handle
//appropriately.
.then(function () {
    return main(['add', 'volojs/test-master-download'], function (result) {
        console.log(result);
        doh.register("addMasterDownload",
            [
                function addMasterDownload(t) {
                    t.is(true, file.exists('test-master-download.js'), 'test-master-download.js is there');
                    t.is(false, file.exists('master'), 'master should not exist');
                    t.is(false, file.exists('test-master-download'), 'test-master-download should not exist');
                }
            ]
        );
        doh.run();
    });
})

//Tests #59, content-type check the volo.url, and if an archive, handle
//appropriately, even when it has a fragment ID in the URL for a specific file.
.then(function () {
    return main(['add', 'volojs/test-master-downloadfragment'], function (result) {
        console.log(result);
        doh.register("addMasterDownloadFragment",
            [
                function addMasterDownloadFragment(t) {
                    t.is(true, file.exists('one.js'), 'one.js is there');
                    t.is(false, file.exists('master'), 'master should not exist');
                    t.is(false, file.exists('test-master-downloadfragment'), 'test-master-downloadfragment should not exist');
                }
            ]
        );
        doh.run();
    });
})


.then(function () {
    return main(['add', '-amd', 'volojs/test-directory-main'], function (result) {
        console.log(result);
        doh.register("addDirectoryWithMain",
            [
                function addDirectoryWithMain(t) {
                    t.is(true, file.exists('test-directory-main.js'), 'main.js shim');
                    t.is(true, file.exists('test-directory-main'), 'directory exists');
                    t.is(true, file.exists('test-directory-main/main.js'), 'main.js exists');
                }
            ]
        );
        doh.run();
    });
})

.then(function () {
    return main(['add', '-noprompt', '../support/addable'], function (result) {
        console.log(result);
        doh.register("addOnAdd",
            [
                function addOnAdd(t) {
                    var expected = fs.readFileSync('../support/addable/temp/a.js', 'utf8'),
                        output = fs.readFileSync('addable/a.js', 'utf8');

                    t.is(false, file.exists('addable/temp'));
                    t.is(expected, output);
                }
            ]
        );
        doh.run();
    });
})
.then(function () {
  //Test using volojs/repos-provided package.json override.
    return main(['add', 'three.js'], function (result) {
        console.log(result);
        doh.register("addRepoPackageJsonOverride",
            [
                function addOnAdd(t) {
                    t.is(true, file.exists('three.js'));
                }
            ]
        );
        doh.run();
    });
})
.then(function () {
    return main(['create', 'voloBaseUrl', '../support/voloBaseUrl'], function (result) {
        console.log(result);
        doh.register("voloBaseUrl",
            [
                function voloBaseUrl(t) {
                    var expected = fs.readFileSync('../support/simple/simple.js', 'utf8'),
                        output = fs.readFileSync('voloBaseUrl/funkyBaseUrl/simple.js', 'utf8');

                    t.is(expected, output);
                }
            ]
        );
        doh.run();
    });
})
.then(function (result) {
    process.chdir(cwd);
});

module.exports = {
    start: start,
    end: end
};
