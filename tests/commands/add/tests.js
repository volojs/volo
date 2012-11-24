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
/*
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
    return main(['install', 'volojs/test-master-downloadfragment'], function (result) {
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

//Tests #60, volo add url
.then(function () {
    return main(['add', 'https://github.com/jashkenas/coffee-script/raw/master/extras/coffee-script.js'], function (result) {
        console.log(result);
        doh.register("addUrl",
            [
                function addUrl(t) {
                    t.is(true, file.exists('coffee-script.js'), 'coffee-script.js is there');
                }
            ]
        );
        doh.run();
    });
})

//Tests non-versioned local names: https://github.com/volojs/volo/issues/67
.then(function () {
    return main(['add', 'jquery/jquery'], function (result) {
        console.log(result);
        doh.register("addNoVersionLocalName",
            [
                function addNoVersionLocalName(t) {
                    t.is(true, file.exists('jquery.js'), 'jquery.js is there with no version');
                }
            ]
        );
        doh.run();
    });
})
*/
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
debugger;
    return main(['install', '-noprompt', '../support/addable'], function (result) {
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
    return main(['add', 'three.js', 'three'], function (result) {
        console.log(result);
        doh.register("addRepoPackageJsonOverride",
            [
                function addRepoPackageJsonOverride(t) {
                    t.is(true, file.exists('three.js'));
                }
            ]
        );
        doh.run();
    });
})
/*
.then(function () {
    //Make sure extra dots in local name not trimmed: #74
    return main(['install', 'jzaefferer/jquery-validation/1.9.0/#jquery.validate.js'], function (result) {
        console.log(result);
        doh.register("addExtraDotName",
            [
                function addExtraDotName(t) {
                    t.is(true, file.exists('jquery.validate.js'));
                }
            ]
        );
        doh.run();
    });
})

.then(function () {
    //Allow searchterm/semver archive names, part of #79
    return main(['add', 'requirejs/~2'], function (result) {
        console.log(result);
        doh.register("addSearchSlashSemVer",
            [
                function addSearchSlashSemVer(t) {
                    var regExpTest = /version = '2\./;

                    t.is(true, file.exists('require.js'));
                    t.is(true, regExpTest.test(file.readFile('require.js')));
                }
            ]
        );
        doh.run();
    });
})

.then(function () {
    //Allow fragments to be directories #86
    return main(['add', 'jquery/qunit#qunit'], function (result) {
        console.log(result);
        doh.register("addFragDir",
            [
                function addFragDir(t) {
                    t.is(true, file.exists('qunit/qunit.js'));
                    t.is(true, file.exists('qunit/qunit.css'));
                }
            ]
        );
        doh.run();
    });
})

.then(function () {
    //Allow branch names as well as tags #98
    return main(['add', 'jrburke/requirejs/master', 'requiremaster'], function (result) {
        console.log(result);
        doh.register("addFromBranch",
            [
                function addFromBranch(t) {
                    t.is(true, file.exists('requiremaster.js'));
                }
            ]
        );
        doh.run();
    });
})

.then(function () {
    //Allow single file JS downloads to go into a directory #90
    return main(['add', 'jquery', 'dollar/main'], function (result) {
        console.log(result);
        doh.register("addSingleInDir",
            [
                function addSingleInDir(t) {
                    t.is(true, file.exists('dollar/main.js'));
                }
            ]
        );
        doh.run();
    });
})

*/
.then(function (result) {
    process.chdir(cwd);
});

module.exports = {
    start: start,
    end: end
};
