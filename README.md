# volo

A command line JavaScript tool for JavaScript-based projects. It likes
GitHub.

The basic tool is a generic command completion tool -- you can create new
commands for volo, and you can use commands others have created.

By default, volo knows how to:

* [create a new web project](https://github.com/volojs/volo/blob/master/volo/create/doc.md)
* [add scripts for a web project from the command line](https://github.com/volojs/volo/blob/master/volo/add/doc.md)
* [acquire new commands for volo](https://github.com/volojs/volo/blob/master/volo/acquire/doc.md)
* [update volo](https://github.com/volojs/volo/blob/master/volo/rejuvenate/doc.md)
* [convert some scripts to AMD format](https://github.com/volojs/volo/blob/master/volo/amdify/doc.md)

It is still very early in development. Lots may change and it has some sharp
corners, but it is already fun to use. It is just one file, so it is
easy to try out and discard.

### Prerequisites

* Node 0.6.5 or later installed.

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

To set up an AMD/RequireJS-based project called **fast** that uses AMD versions of
Backbone, jQuery and underscore:

    > volo create fast
    > cd fast
    > volo add jquery/jquery
    > volo add amdjs/underscore  (fetches most recent version tag with AMD)
    > volo add amdjs/backbone    (fetches most recent version tag with AMD)

Then modify www/js/app.js to require the modules you need and add your app logic.

If you want to indicate your desire to see the AMD changes integrated directly
into underscore or backbone, please watch the
[amdjs/underscore](https://github.com/amdjs/underscore) and
[amdjs/backbone](https://github.com/amdjs/backbone)
repositories. By doing so, it will hopefully give the library authors an
indication of how many people would benefit from the code integration.

If you prefer to use underscore and backbone from their sources, instead of
using the amdjs forks that include nice AMD registration, you can use amdify
to convert the files fetched from the documentcloud repos:

    > volo create fast2
    > cd fast2
    > volo add jquery/jquery
    > volo add -amd documentcloud/underscore exports=_
    > volo add -amd documentcloud/backbone depends=underscore,jquery exports=Backbone

The amdify conversions are not as pretty as the amdjs handmade ones. However,
it can be useful to use the documentcloud sources particularly if you want to
use older releases of underscore and backbone.

If you would prefer to have the documentcloud repos include native AMD registration,
click the **Watch** button for the amdjs forks of [underscore](https://github.com/amdjs/underscore)
and [backbone](https://github.com/amdjs/backbone), so we can help give the
documentcloud group real data on how many people find would find it useful.

To set up an HTML5 Boilerplate project that does not use AMD/RequireJS, but does
use Backbone and underscore (the Boilerplate already has jQuery):

    > volo create html5fast h5bp/html5-boilerplate
    > cd html5fast
    > volo add documentcloud/underscore
    > volo add documentcloud/backbone

## Details

* [Design goals](https://github.com/volojs/volo/blob/master/docs/designGoals.md)
* [Create a volo command](https://github.com/volojs/volo/blob/master/docs/createCommand.md)
* License: [MIT and new BSD](https://github.com/volojs/volo/blob/master/LICENSE).

## Engage

* [Discussion list](http://groups.google.com/group/volojs)
* [File an issue](https://github.com/volojs/volo/issues)
* [Working with the volo code](https://github.com/volojs/volo/blob/master/docs/workingWithCode.md)

## Callouts

volo uses code from these projects:

* [q](https://github.com/kriskowal/q)
* [zip](https://github.com/kriskowal/zip)
