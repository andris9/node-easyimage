var exec = require('child_process').exec;
var child;
var imcmd; // short for ImageMagick Command, how ingenious (y)

// general info function
function info(file, callback) {
    file = quoted_name(file);
    // %z = depth, %m = type, %w = width, %h = height, %b = filesize in byte, %f = filename
    imcmd = 'identify -format "%m %z %w %h %b %f" ' + file;

    child = exec(imcmd, function(err, stdout, stderr) {
        var info = {};
        //Basic error handling:
        if (stderr.match(/^identify:/)){
            return callback(new Error('Unsupported format'));
        }
        var temp = stdout.split(' ');

        //Basic error handling:
        if (temp.length < 6){
            return callback(new Error('Unsupported format'));
        }

        info.type   = temp[0];
        info.depth  = temp[1];
        info.width  = temp[2];
        info.height = temp[3];
        info.size   = temp[4];
        info.name   = temp.slice(5).join(' ').replace(/(\r\n|\n|\r)/gm,'');

        callback(err, info, stderr);
    });
}

// function to quote file names, if not already
function quoted_name(name) {
    if (name[0] != '"') name = '"' + name;
    if (name[name.length - 1] != '"') name = name + '"';
    return name;
};


// get basic information about an image file
exports.info = function(file, callback) {
    info(file, callback);
};

// convert a file type to another
exports.convert = function(options, callback) {
    if (options.src === undefined || options.dst === undefined){
        return callback(new Error('Invalid path'));
    }
    options.src = quoted_name(options.src);
    options.dst = quoted_name(options.dst);
    if (options.quality === undefined) imcmd = 'convert ' + options.src + ' ' + options.dst;
    else imcmd = 'convert ' + options.src + ' -quality ' + options.quality + ' ' + options.dst;
    child = exec(imcmd, function(err, stdout, stderr) {
        if (err){
            return callback(err);
        }
        info(options.dst, callback);
    });
};

// resize an image
exports.resize = function(options, callback) {
    if (options.src === undefined || options.dst === undefined){
        return callback(new Error('Invalid path'));
    }
    if (options.width === undefined){
        return callback(new Error('Invalid dimensions'));
    }
    options.height = options.height || options.width;
    options.src = quoted_name(options.src);
    options.dst = quoted_name(options.dst);
    if (options.quality === undefined) imcmd = 'convert ' + options.src + ' -resize '+options.width + 'x' + options.height + ' ' + options.dst;
    else imcmd = 'convert ' + options.src + ' -resize '+options.width + 'x' + options.height + ' -quality ' + options.quality + ' ' + options.dst;
    child = exec(imcmd, function(err, stdout, stderr) {
        if (err){
            return callback(new Error(err));
        }
        info(options.dst, callback);
    });
};

// crop an image
exports.crop = function(options, callback) {
    if (options.src === undefined || options.dst === undefined){
        return callback(new Error('Invalid path'));
    }
    if (options.cropwidth === undefined){
        return callback(new Error('Invalid dimensions'));
    }
    options.cropheight = options.cropheight || options.cropwidth;
    options.gravity = options.gravity || 'Center';
    options.x = options.x || 0;
    options.y = options.y || 0;
    options.src = quoted_name(options.src);
    options.dst = quoted_name(options.dst);

    if (options.quality === undefined) imcmd = 'convert ' + options.src + ' -gravity ' + options.gravity + ' -crop '+ options.cropwidth + 'x'+ options.cropheight + '+' + options.x + '+' + options.y + ' ' + options.dst;
    else  imcmd = 'convert ' + options.src + ' -gravity ' + options.gravity + ' -crop '+ options.cropwidth + 'x'+ options.cropheight + '+' + options.x + '+' + options.y + ' -quality ' + options.quality + ' ' + options.dst;
    child = exec(imcmd, function(err, stdout, stderr) {
        if (err){
            return callback(err);
        }
        info(options.dst, callback);
    });

};

// resize and crop in one shot!
exports.rescrop = function(options, callback) {
    if (options.src === undefined || options.dst === undefined){
        return callback(new Error('Invalid path'));
    }
    if (options.width === undefined){
        return callback(new Error('Invalid dimensions'));
    };
    options.height = options.height || options.width;

    options.cropwidth = options.cropwidth || options.width;
    options.cropheight = options.cropheight || options.height;

    options.gravity = options.gravity || 'Center';
    options.x = options.x || 0;
    options.y = options.y || 0;
    options.src = quoted_name(options.src);
    options.dst = quoted_name(options.dst);
    options.fill = options.fill ? '^' : '';
    if (options.quality === undefined) imcmd = 'convert ' + options.src + ' -resize ' + options.width + 'x' + options.height + options.fill + ' -gravity ' + options.gravity + ' -crop '+ options.cropwidth + 'x'+ options.cropheight + '+' + options.x + '+' + options.y + ' ' + options.dst;
    else imcmd = 'convert ' + options.src + ' -resize ' + options.width + 'x' + options.height + options.fill + ' -gravity ' + options.gravity + ' -crop '+ options.cropwidth + 'x'+ options.cropheight + '+' + options.x + '+' + options.y + ' -quality ' + options.quality + ' ' + options.dst;
    child = exec(imcmd, function(err, stdout, stderr) {
        if (err){
            return callback(err);
        };
        info(options.dst, callback);
    });
};

// create thumbnails
exports.thumbnail = function(options, callback) {

    if (options.src === undefined || options.dst === undefined){
        return callback(new Error('Invalid path'));
    }
    if (options.width === undefined){
        return callback(new Error('Invalid dimensions'));
    }
    options.height = options.height || options.width;
    options.gravity = options.gravity || 'center';
    options.x = options.x || 0;
    options.y = options.y || 0;
    options.src = quoted_name(options.src+"[0]");
    options.dst = quoted_name(options.dst);

    info(options.src, function(err, original, stderr) {
        if (err){
            return callback(err);
        }

        // dimensions come as strings, convert them to number
        original.width = +original.width;
        original.height = +original.height;

        var resizewidth = options.width;
        var resizeheight = options.height;
/*
        if (original.width > original.height) { resizewidth = ''; }
        else if (original.height > original.width) { resizeheight = ''; }
*/
        // resize and crop
        if (options.quality === undefined) imcmd = 'convert ' + options.src + ' -resize ' + resizewidth + 'x' + resizeheight + ' -extent '+ resizewidth + 'x' + resizeheight + ' -gravity ' + options.gravity + ' -crop '+ options.width + 'x'+ options.height + '+' + options.x + '+' + options.y + ' -background white -flatten ' + options.dst;
        else imcmd = 'convert ' + options.src + ' -resize '+ resizewidth + 'x' + resizeheight + ' -extent  '+ resizewidth + 'x' + resizeheight + ' -quality ' + options.quality + ' -gravity ' + options.gravity + ' -crop '+ options.width + 'x'+ options.height + '+' + options.x + '+' + options.y + ' -quality ' + options.quality + ' -background white -flatten ' + options.dst;

        imcmd = "convert "+options.src+" -thumbnail "+resizewidth+"x"+resizeheight+" -background white -flatten "+options.dst;

        //imcmd = "convert "+options.src+" -thumbnail x"+(resizewidth*2)+" -resize '"+(resizewidth*2)+"x<' -resize 50% -gravity center -crop "+resizewidth+"x"+resizewidth+"+0+0 +repage "+" -background white -flatten " + options.dst;
        
        var start = Date.now();
        child = exec(imcmd, function(err, stdout, stderr) {
            var end = Date.now();
            if (err){
                return callback(err);
            }
            info(options.dst, callback);
        });

    });
};

// for the hardcore types - issue your own ImageMagick command
exports.exec = function(command, callback) {
    var _command = command.split(' ')[0];
    // as a security measure, we will allow only 'convert' commands
    if (_command != 'convert'){
        return callback(new Error('Restricted command'));
    }

    child = exec(command, function(err, stdout, stderr) { callback(err, stdout, stderr); });
};