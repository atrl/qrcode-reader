(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {
    //位置探测图形类
    function Pattern(x, y, estimatedModuleSize) {
        this.x = x;
        this.y = y;
        this.count = 1;
        this.estimatedModuleSize = estimatedModuleSize;
    }

    //验证图形是否相同
    Pattern.prototype.aboutEquals = function (moduleSize, x, y) {
        if (Math.abs(y - this.y) <= moduleSize && Math.abs(x - this.x) <= moduleSize) {
            var moduleSizeDiff = Math.abs(moduleSize - this.estimatedModuleSize);
            return moduleSizeDiff <= 1.0 || moduleSizeDiff / this.estimatedModuleSize <= 1.0;
        }
        return false;
    };
    return Pattern;
});
