({
    baseUrl: '../pkg',
    paths: {
        'q': 'pkg/q',
        'text': 'pkg/text',
        'fs': 'empty:',
        'path': 'empty:',
        'url': 'empty:',
        'http': 'empty:',
        'https': 'empty:'
    },
    name: '../tools/require',
    optimize: 'none',
    //tools/node.js comes from r.js/build/jslib/node.js
    include: ['../tools/requirejsVars', '../tools/node', 'pkg/main', 'text', 'pkg/github'],
    wrap: {
        startFile: "wrap.start",
        endFile: "wrap.end"
    },
    out: '../pkg.js'
})