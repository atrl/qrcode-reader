(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {
    var urldecode = function (str, charset, callback) {
        var script = document.createElement('script');
        script.id = '_urlDecodeFn_';
        window._urlDecodeFn_ = callback;
        var src = 'data:text/javascript;charset=' + charset + ',_urlDecodeFn_("' + str + '");';
        src += 'document.getElementById("_urlDecodeFn_").parentNode.removeChild(document.getElementById("_urlDecodeFn_"));';
        script.src = src;
        document.body.appendChild(script);
    }
    return urldecode;
});