({
    baseUrl: '../volo',
    paths: {
        'q': 'volo/q',
        'text': 'volo/text',
        'fs': 'empty:',
        'path': 'empty:',
        'url': 'empty:',
        'http': 'empty:',
        'https': 'empty:'
    },
    name: '../tools/require',
    optimize: 'none',
    //tools/node.js comes from r.js/build/jslib/node.js
    include: ['../tools/requirejsVars', '../tools/node', 'volo/main', 'text', 'volo/github'],
    wrap: {
        startFile: "wrap.start",
        endFile: "wrap.end"
    },
    out: '../volo.js'
})