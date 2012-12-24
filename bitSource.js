var BitSource = function(codeWord){
	var bit = '';
	codeWord.forEach(function(v){
		bit += BitSource.prefixbit(v.toString(2), 8);
	});

	this.index = 0;
	this.bit = bit;
}
BitSource.prefixbit = function (num, length) {
	var def = '00000000';
	return def.substr(0,length - num.length) + num;
}
BitSource.prototype = {
	readBits : function(length){
		var bit = this.bit.substring(this.index, this.index + length);
		this.index += length;
		return parseInt(bit,2);
	}
}