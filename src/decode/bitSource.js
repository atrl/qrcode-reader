(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require) {
    var qutil = require('../qutil');

    /**
     * 解码前二进制数据
     * @param {array}   codeWord
     */
    var BitSource = function (codeWord) {
        var bit = '';
        codeWord.forEach(function (v) {
            bit += qutil.prefixBit(v, 8);
        });

        this.index = 0;
        this.bit = bit;
    };

    BitSource.prototype = {
        readBits: function (length) {
            var bit = this.bit.substring(this.index, this.index + length);
            this.index += length;
            return parseInt(bit, 2);
        },
        readMode: function () {
            return this.readBits(4);
        },
        available: function () {
            return this.bit.length - this.index;
        }
    }
    return BitSource;
});