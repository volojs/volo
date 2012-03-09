# volo design goals

* Written in JavaScript
* One .js file
* Know how to use GitHub
* Work with plain URLs to single JS files or zip/tar.gz archives
* Treat AMD as first class, but don't be annoying about it
* Extensible

## Written in JavaScript

This is a tool to work with JavaScript-based projects. JavaScript with node is
sufficient and awesome to build tools. Besides, a front end engineer needs to
understand callbacks, and there are tools like [promises]() that can help
give it a more linear flow.

## One JS file

One JS file is easy to install and easy to mentally process.

volo is a series of AMD modules that are combined using the RequireJS optimizer,
and RequireJS is shipped with a node adapter to allow bundling all the code
into one file.

This is one of the primary benefits of AMD -- allowing multiple modules in one
file.

Ideally, one day node will support AMD and allow named modules that are only
visible within the current module. That would reduce some of the size of volo,
and it would make it easy to deliver these kinds of single JS file utilities
that are made up of a few components.

## Know how to use GitHub

Open, social code is great, and the JS community has really taken to GitHub.
GitHub is effectively a registry of JS code. While it cannot serve all the
code registry needs of all JS projects, it is a great place to start.

## Work with plain URLs to single JS files or zip/tar.gz archives

GitHub is awesome, but some code is just as easy to get via a
simple http/https URL to a single JS file or a zip/tar.gz archive. The GitHub
support just boils down to converting a GitHub reference to an archive of
a GitHub project at a particular version tag/branch name.

(Current volo only supports zip, but wants to support tar.gz)

## Treat AMD as first class, but don't be annoying about it

AMD is the way to build modular JS projects for the web, and volo should be a
great way to bootstrap into that better future.

However, AMD does not need to be used for every web project, so volo should be
usable without needing to use AMD.

# Extensible

volo should come with some great built-in functionality,
but there are many things a command line JavaScript tool could do. Make it as
easy to create and install new commands for volo as it is to bootstrap new
JS projects with volo.

This will also allow trying out commands in the real world to evaluate if they
should be uplifted into volo itself.
