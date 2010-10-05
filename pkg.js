require({
    packages: [
        {
            name: 'pkg',
            location: '.'
        },
        {
            name: 'cpm',
            location: 'packages/cpm',
            main: 'cpm'
        }
    ]
});
require(['sys', 'pkg'], function (sys, pkg) {    
    sys.puts(pkg);
});



