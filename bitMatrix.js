//二值化后的image对象
var BitMatrix = function(width, height){
	this.data = [];
	this.width = width;
	this.height = height || width;
}

BitMatrix.prototype = {
	get : function(x, y){
		return this.data[this.width * y + x];
	},
	set : function(x, y, value){
		this.data[this.width * y + x] = value;
	}
}