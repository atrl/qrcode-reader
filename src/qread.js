(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {
    var preProcess = require('./preProcess');
    var FindPattern = require('./detector/findPattern');
    var Detector = require('./detector/detector');
    var Decode = require('./decode/decode');

    var qread = function(image, callback){
        var imgMatrix = new preProcess(image);
        var patternInfo = new FindPattern(imgMatrix).find();
        var qrMatrix = new Detector(imgMatrix, patternInfo).process();
        new Decode(qrMatrix, callback).process();
    }
    return qread;
});
