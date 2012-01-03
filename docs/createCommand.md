# Creating a volo command

    > volo.js create yourcommand volojs/create-command-template
    > cd yourcommand

yourcommand/main.js is the main function of the file.

See
[create-command-template's README.md](https://github.com/volojs/create-command-template)
for instructions on how to create a symlink to your command so you can develop
it and test it with volo.js.

Once it is done, put it up on GitHub. People can install it by doing:

    > volo.js acquire yourGitHubUserName/yourcommand

## Implementation details

Each command is an [AMD module](https://github.com/amdjs/amdjs-api/wiki/AMD).
It is similar to a Node module, but mostly just has a define() function wrapper,
and __dirname and __filename are **not** available (use module.uri instead).

The [text loader plugin](http://requirejs.org/docs/api.html#text)
is available to load text into your command. This is how the expanded help doc
for your command is loaded.

You also have access to any of the modules shipped as part
of volo.js.

One of those modules is the [q promise library](https://github.com/kriskowal/q)
if you would like to use promises in your command. It is not a
requirement to use promises in your command though.

See [this directory](https://github.com/volojs/volo/tree/master/volo) for the
commands that ship with volo.js for inspiration on how to code a command.

See [this directory](https://github.com/volojs/volo/tree/master/volo/volo) for
a list of utility modules that ship with volo.

The API for commands and the modules included in volo.js are likely to change
frequently since volo is a new project.
