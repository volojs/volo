require.def([], function () {
    return {
        doc: 'Add a third party package to your project.',
        validate: function (namedArgs, packageName, version) {
            if (!packageName) {
                return new Error('Please specify a package name or an URL.');
            }
            return undefined;
        },
        run: function (namedArgs, packageName, version) {
            var url;

            //Package may just be an URL or absolute path ref
            if (packageName.indexOf(':') !== -1 || packageName.charAt(0) === '/') {
                url = packageName;
                packageName = null;
            }
        }
    };
});
