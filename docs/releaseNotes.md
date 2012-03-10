# Release Notes

Some release notes for a few recent versions of volo. Will be trimmed every so
often, but use git history to find details on other releases.

## 0.1.0

* volo.type support for explicitly stating a directory should be kept instead
of extracting a single JS file from an archive.

## 0.0.9

* added `volo search`, now shortnames like 'jquery' work fo `volo add`.
* support for volo.url and volo.archive in package.json.

## 0.0.8

* amdify depends allows settings a local name for a dependency: depends=jquery=$
* rejuvenate should now maintain executable permissions.

## 0.0.7

* Allow flags and arguments to be passed to subcommands.
* Fix some docs.

## 0.0.6

* Windows support.
* Switched to using zip instead of tar.gz so that Windows would work.
