(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {
    var Decode = require('../../src/decode/decode');
    var wechat = require('./wechat');
    var utf8 = require('./utf8');

    function draw(image){
        if(typeof global != 'undefined') return;
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
            console.log(result);
            ok(result == 'http://weixin.qq.com/r/C-uxvq3EF5Noh7zdn64v', 'Passed');
        }).process();
    });

    test('utf8', function () {
        draw(utf8);
        new Decode(utf8, function(result){
            console.log(result);
            //测 "11100110" "10110101" "10001011"
            //试 "11101000" "10101111" "10010101"
            //0000 0800-0000 FFFF | 1110xxxx 10xxxxxx 10xxxxxx
            ok(result == '测试', 'Passed');
        }).process();
    });
});