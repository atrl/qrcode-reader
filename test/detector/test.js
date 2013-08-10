(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {
    var FindPattern = require('../../src/detector/findPattern');
    var Detector = require('../../src/detector/detector');
    var pattern1 = require('./pattern1');
    test('can select', function () {
        var patternInfo = new FindPattern(pattern1).find();

        var canvas = document.getElementById('canvas');
        var ctx = canvas.getContext('2d');
        var imgData = ctx.getImageData(0, 0, pattern1.width, pattern1.height);

        pattern1.data.forEach(function (v, i) {
            imgData.data[i * 4] = (v ^ 1) * 255;
            imgData.data[i * 4 + 1] = (v ^ 1) * 255;
            imgData.data[i * 4 + 2] = (v ^ 1) * 255;
            imgData.data[i * 4 + 3] = v * 255;
        })
        ctx.putImageData(imgData, 0, 0);
        if (patternInfo) {
            ctx.fillStyle = "rgb(200,0,0)";
            ctx.arc(patternInfo.topLeft.x, patternInfo.topLeft.y, 5, 0, Math.PI * 2, true);
            ctx.arc(patternInfo.topRight.x, patternInfo.topRight.y, 5, 0, Math.PI * 2, true);
            ctx.arc(patternInfo.bottomLeft.x, patternInfo.bottomLeft.y, 5, 0, Math.PI * 2, true);
            ctx.fill();
        }
        var qrMatrix = new Detector(pattern1, patternInfo).process();
        ok(true);
    });
});