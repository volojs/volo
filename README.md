# [volo](http://volojs.org)

**Create** browser-based, front-end projects from project templates, and **add**
dependencies by fetching them from GitHub. Once your project is set up,
**automate** common tasks.

volo is dependency manager and project creation tool that favors GitHub
for the package repository.

At its heart, volo is a generic command runner -- you can create new
commands for volo, and you can use commands others have created.

By default, volo knows how to:

* [create a new web project](https://github.com/volojs/volo/blob/master/commands/create/doc.md)
* [add scripts for a web project from the command line](https://github.com/volojs/volo/blob/master/commands/add/doc.md)
* [automate project actions via volofiles](https://github.com/volojs/volo/wiki/Creating-a-volofile) and [reusable volo commands](https://github.com/volojs/volo/wiki/Creating-a-volo-command)

## Prerequisites

* [Node](http://nodejs.org) 0.6.5 or later installed.

## Install

volo requires Node to run. Node includes [npm](http://npmjs.org/),
a package manager for node code. To install volo:

    npm install -g volo

If you get an error when running that command, and it contains this line somwhere in it:

    npm ERR! Please try running this command again as root/Administrator.

You will need to run the install via sudo:

    sudo npm install -g volo

## Usage

volo can use GitHub to retrieve code, so one of the core concepts when using
it is understanding **user/repo** for archive names. See the
[add doc](https://github.com/volojs/volo/blob/master/commands/add/doc.md) for more
info on the types of archive names to use.

### AMD project example

To set up an AMD/RequireJS-based project called **fast** that uses AMD versions of
Backbone, jQuery and underscore:

    > volo create fast (uses [volojs/create-template](https://github.com/volojs/create-template) for project template)
    > cd fast
    > volo add jquery (uses jquery/jquery as the repo)
    > volo add underscore (uses amdjs/underscore as repo since an AMD project)
    > volo add backbone (uses amdjs/backbone as repo since an AMD project)

Then modify `www/js/app.js` to require the modules you need and add your app
logic.

The above example uses the
[amdjs/underscore](https://github.com/amdjs/underscore) and
[amdjs/backbone](https://github.com/amdjs/backbone) versions of those libraries,
which include integrated AMD support.

### Browser globals project example

To set up an HTML5 Boilerplate project that does not use AMD/RequireJS, but does
use documentcloud repos of Backbone and Underscore (the Boilerplate already has
jQuery):

    > volo create html5fast html5-boilerplate (pulls down latest tag of that repo)
    > cd html5fast
    > volo add underscore (uses documentcloud/underscore as repo)
    > volo add backbone (uses documentcloud/backbone as repo)

## Library Best Practices

To work well with volo, here are some tips on how to structure your library code:

* [Library Best Practices](https://github.com/volojs/volo/wiki/Library-best-practices)

## Details

* [Design goals](https://github.com/volojs/volo/wiki/Design-Goals)
* [Prior Art](https://github.com/volojs/volo/wiki/Prior-Art): npm, cpm, bpm.
* [Create a volo command](https://github.com/volojs/volo/wiki/Creating-a-volo-command)
* [Create a volofile](https://github.com/volojs/volo/wiki/Creating-a-volofile)
* License: [MIT and new BSD](https://github.com/volojs/volo/blob/master/LICENSE).

## Engage

* [Discussion list](http://groups.google.com/group/volojs)
* [File an issue](https://github.com/volojs/volo/issues)
* [Working with the volo code](https://github.com/volojs/volo/blob/master/docs/workingWithCode.md)
