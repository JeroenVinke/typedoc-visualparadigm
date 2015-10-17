# typedoc-visualparadigm 

## [work in progress]


    var typedoc2classdiagram = require('./typedoc2classdiagram');
    var fs = require('fs');
    gulp.task("classdiagram", function (callback) {
        fs.readFile(paths.root + "/docs/api.json", 'utf8', function (err, data) {
            if (err) throw err;
            var obj = JSON.parse(data);
    
            var xml = typedoc2classdiagram(obj);
    
            fs.writeFile(paths.root + "/docs/diagram.xml", xml, function (err) {
                if (err) throw err;
    
                callback();
            });
        });
    });
