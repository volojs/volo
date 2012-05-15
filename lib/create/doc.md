## Usage

    volo create appName [templateArchive]

**appName** is the name of the directory that should be created containing the
contents of the templateArchive.

**templateArchive** defaults to a value of 'volojs/create-template', but
any archive value that is usable by **add** can work here instead. The only
restriction is that the archive value should resolve to a zip file and
a #specific/file.js type of archive value should not be used.
