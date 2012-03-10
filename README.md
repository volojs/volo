# volo

A JavaScript dependency manager and project creation tool that favors GitHub
for the package repository. Written in JavaScript for JavaScript.

The basic tool is a generic command completion tool -- you can create new
commands for volo, and you can use commands others have created.

By default, volo knows how to:

* [create a new web project](https://github.com/volojs/volo/blob/master/vololib/create/doc.md)
* [add scripts for a web project from the command line](https://github.com/volojs/volo/blob/master/vololib/add/doc.md)
* [convert some scripts to AMD format](https://github.com/volojs/volo/blob/master/vololib/amdify/doc.md)

Some commands that help manage volo:

* [acquire new commands for volo](https://github.com/volojs/volo/blob/master/vololib/acquire/doc.md)
* [update volo](https://github.com/volojs/volo/blob/master/vololib/rejuvenate/doc.md)

It is still very early in development. Lots may change and it has some sharp
corners, but it is already fun to use. It is just one file, so it is
easy to try out and discard.

## Prerequisites

* [Node](http://nodejs.org) 0.6.5 or later installed.

## Install

### All platforms except Windows

You can use the **[latest](https://raw.github.com/volojs/volo/latest/dist/volo)** tag to always get the latest release:

    > curl https://raw.github.com/volojs/volo/latest/dist/volo > volo
    > chmod +x volo

If you like to live dangerously on the edge, use the master version:

https://raw.github.com/volojs/volo/master/dist/volo

It is best to put volo in your path. Here is a suggested path so that it is
always available:

    > mkdir ~/scripts
    > cd ~/scripts
    > curl https://raw.github.com/volojs/volo/latest/dist/volo > volo
    > chmod +x volo

Then add **~/scripts** to your PATH in your .profile.

Since it is just a single JS file, you can have multiple copies laying around,
tailored to use specific commands for specific purposes.

### Windows

You can use the **latest** tag to always get the latest release.

Download volo from this URL:

   https://raw.github.com/volojs/volo/latest/dist/volo

When you see `volo` used in the notes below, and in any help docs, type the
following instead when on Windows: `node path/to/volo`

## Usage

volo can use GitHub to retrieve code, so one of the core concepts when using
it is understanding **user/repo** for archive names. See the
[add doc](https://github.com/volojs/volo/blob/master/vololib/add/doc.md) for more
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

* [Library Best Practices](https://github.com/volojs/volo/blob/master/docs/libraryBestPractices.md)

## Details

* [Design goals](https://github.com/volojs/volo/wiki/Design-Goals)
* [Prior Art](https://github.com/volojs/volo/wiki/Prior-Art): npm, cpm, bpm.
* [Create a volo command](https://github.com/volojs/volo/wiki/Creating-a-volo-command)
* License: [MIT and new BSD](https://github.com/volojs/volo/blob/master/LICENSE).

## Engage

* [Discussion list](http://groups.google.com/group/volojs)
* [File an issue](https://github.com/volojs/volo/issues)
* [Working with the volo code](https://github.com/volojs/volo/blob/master/docs/workingWithCode.md)

## Callouts

volo uses code from these projects:

* [q](https://github.com/kriskowal/q)
* [zip](https://github.com/kriskowal/zip)
