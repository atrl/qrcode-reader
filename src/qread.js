define(function(require){
    var preProcess = require('./preProcess');
    var FindPattern = require('./detector/findPattern');
    var Detector = require('./detector/detector');
    var Decode = require('./decode/decode');

    var qread = function(image, callback){
        var imgMatrix = new preProcess(image);
        var patternInfo = new FindPattern(imgMatrix).find();
        var qrMatrix = new Detector(imgMatrix, patternInfo).process();
        new Decode(qrMatrix).process(callback);
    }
    return qread;
});