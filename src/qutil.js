(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function () {
    var QUtil = {
        //用0补全位数
        prefixBit: function (bit, length) {
            return (+bit.toString(2) / Math.pow(10, length)).toFixed(length).substr(2);
        },
        getStates: function (length) {
            var arr = new Array(length);
            for (var i = 0; i < length; i++) {
                arr[i] = 0;
            }
            return arr;
        },
        getDistance: function (pattern1, pattern2) {
            var xDiff = pattern1.x - pattern2.x;
            var yDiff = pattern1.y - pattern2.y;
            return  Math.sqrt((xDiff * xDiff + yDiff * yDiff));
        },
        crossProductZ: function (patternA, patternB, patternC) {
            var bX = patternB.x;
            var bY = patternB.y;
            return ((patternC.x - bX) * (patternA.y - bY)) - ((patternC.y - bY) * (patternA.x - bX));
        }
    };
    return QUtil;
});