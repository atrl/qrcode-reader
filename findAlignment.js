/**
 * 寻找校验图形
 */

var findAlignmentPattern = function(imgMatrix,  startX,  startY,  width,  height,  moduleSize){
	this.imgMatrix = imgMatrix;
	this.startX = startX;
	this.startY = startY;
	this.width = width;
	this.height = height;
	this.moduleSize = moduleSize;

}
findAlignmentPattern.prototype = {
	patterns : [],
	find : function(){

	},

	//从图形最后的x或y找到中心点的位置
	getCenterFromEnd : function(states, end){
		return (end - states[2]) - states[1] / 2;
	},
}