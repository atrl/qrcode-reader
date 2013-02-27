var QUtil = {
	getStates : function(length) {
		var arr = new Array(length);
		for(var i = 0; i < length; i++){
			arr[i] = 0;
		}
		return arr;
	},
	getDistance : function( pattern1,  pattern2){
		xDiff = pattern1.x - pattern2.x;
		yDiff = pattern1.y - pattern2.y;
		return  Math.sqrt( (xDiff * xDiff + yDiff * yDiff));
	},
	crossProductZ : function( patternA,  patternB,  patternC){
		var bX = patternB.x;
		var bY = patternB.y;
		return ((patternC.x - bX) * (patternA.y - bY)) - ((patternC.y - bY) * (patternA.x - bX));
	}
}