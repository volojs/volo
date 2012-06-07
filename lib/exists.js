var fs = require('fs'),
    path = require('path');

module.exports = fs.existsSync || path.existsSync;
