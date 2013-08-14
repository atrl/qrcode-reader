(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {
    var Decode = require('../../src/decode/decode');
    var wechat = require('./wechat');
    var utf8 = require('./utf8');

    function draw(image){
        if(!window) return;
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = image.width;
        document.body.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        var imgData = ctx.getImageData(0, 0, image.width, image.height);
        image.data.forEach(function (v, i) {
            imgData.data[(i  ) * 4] = (v ^ 1) * 255;
            imgData.data[(i  ) * 4 + 1] = (v ^ 1) * 255;
            imgData.data[(i ) * 4 + 2] = (v ^ 1) * 255;
            imgData.data[(i ) * 4 + 3] = v * 255;
        });
        ctx.putImageData(imgData, 0, 0);
    }
    test('wechat', function () {
        draw(wechat);
        new Decode(wechat, function(result){
            ok(result == 'http://weixin.qq.com/r/C-uxvq3EF5Noh7zdn64v', 'Passed');
        }).process();
    });

    test('utf8', function () {
        draw(utf8);
        new Decode(utf8, function(result){
            ok(result == '测试', 'Passed');
        }).process();
    });
});2013.08.06, Version 0.11.5 (Unstable)