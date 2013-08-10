(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {
    var Decode = require('../../src/decode/decode');
    var wechat = require('./wechat');
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    var imgData = ctx.getImageData(0, 0, wechat.width, wechat.height);
    wechat.data.forEach(function (v, i) {
        imgData.data[(i  ) * 4] = (v ^ 1) * 255;
        imgData.data[(i  ) * 4 + 1] = (v ^ 1) * 255;
        imgData.data[(i ) * 4 + 2] = (v ^ 1) * 255;
        imgData.data[(i ) * 4 + 3] = v * 255;
    });
    ctx.putImageData(imgData, 0, 0);
    test('decode success', function () {
        var decode = new Decode(wechat).process();
        ok(true);
    });
});