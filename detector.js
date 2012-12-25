var Detector = function (imgMatrix, patternInfo) {
	this.imgMatrix = imgMatrix;
	this.patternInfo = patternInfo;
}

Detector.prototype = {

	getCodeMatrix : function(){
		var topLeft = this.patternInfo.topLeft;
		var topRight = this.patternInfo.topRight;
		var bottomLeft = this.patternInfo.bottomLeft;

		//获取topLeft和topRight的距离
		var moduleSize = this.calculateModuleSize(topLeft, topRight, bottomLeft);
		if (moduleSize < 1) {
			throw "moduleSize";
		}
		//计算二维码尺寸
		var dimension = this.computeDimension(topLeft, topRight, bottomLeft, moduleSize);
		var version = version.VERSION_TABLE[((dimension - 17) >> 2) - 1]
		var modulesBetweenFPCenters = dimension - 7;
		var alignmentPattern;
		if(version.aLigmentPattern.length){

		}else{

		}

		this.codeMatrix = new BitMatrix(dimension, dimension);
		return this.codeMatrix;
	},

	computeDimension : function(topLeft, topRight, bottomLeft, moduleSize) {
		var tltrCentersDimension = round(QUtil.getDistance(topLeft, topRight) / moduleSize);
		var tlblCentersDimension = round(QUtil.getDistance(topLeft, bottomLeft) / moduleSize);
		var dimension = ((tltrCentersDimension + tlblCentersDimension) >> 1) + 7;
		//
		switch (dimension & 0x03) { // mod 4
			case 0:
				dimension++;
				break;
			// 1? do nothing
			case 2:
				dimension--;
				break;
			case 3:
				throw "error dimension";
		}

		if (dimension % 4 != 1){
			throw 'error dimension';
		}
		var verison = (dimension - 17) >> 2;
		if(verison < 1 || verison > 40){
			throw 'error dimension';
		}

		return dimension;
	},

	createTransform : function(topLeft, topRight, bottomLeft, alignmentPattern, dimension) {
		var dimMinusThree = dimension - 3.5;
		var bottomRightX;
		var bottomRightY;
		var sourceBottomRightX;
		var sourceBottomRightY;
		if(alignmentPattern != null) {
			bottomRightX = alignmentPattern.x;
			bottomRightY = alignmentPattern.y;
			sourceBottomRightX = sourceBottomRightY = dimMinusThree - 3.0;
		} else {
			// Don't have an alignment pattern, just make up the bottom-right point
			bottomRightX = (topRight.x - topLeft.x) + bottomLeft.x;
			bottomRightY = (topRight.y - topLeft.y) + bottomLeft.y;
			sourceBottomRightX = sourceBottomRightY = dimMinusThree;
		}

		var transform = PerspectiveTransform.quadrilateralToQuadrilateral(3.5, 3.5, dimMinusThree, 3.5, sourceBottomRightX, sourceBottomRightY, 3.5, dimMinusThree, topLeft.x, topLeft.y, topRight.x, topRight.y, bottomRightX, bottomRightY, bottomLeft.x, bottomLeft.y);

		return transform;
	},

	//from zXing
	calculateModuleSize : function(topLeft, topRight, bottomLeft){
		var moduleSize1 = this.calculateModuleSizeOneWay(topLeft, topRight);
        var moduleSize2 = this.calculateModuleSizeOneWay(topLeft, bottomLeft);
        return (moduleSize1 + moduleSize2) / 2;
	},

	calculateModuleSizeOneWay : function(pattern1 , pattern2){
		var size1 = this.sizeOfBlackWhiteBlackRunBothWays(pattern1.x, pattern1.y, pattern2.x, pattern2.y);
		var size2 = this.sizeOfBlackWhiteBlackRunBothWays(pattern1.x, pattern1.y, pattern2.x, pattern2.y);

		if(isNaN(size1)){
			return size2 / 7;
		}
		if(isNaN(size2)){
			return size1 / 7;
		}
		return (size1 + size2) / 14;
	},

	sizeOfBlackWhiteBlackRunBothWays : function(fromX, fromY, toX, toY){
		var result = this.sizeOfBlackWhiteBlackRun(fromX, fromY, toX, toY);
		var scale = 1;
		var otherToX = fromX - (toX - fromX);
		if(otherToX < 0){
			scale = fromX / (fromX - otherToX);
			otherToX = 0;
		}else if(otherToX >= this.imgMatrix.width){
			scale = (this.imgMatrix.width - 1 - fromX) / (otherToX - fromX);
		}

		var otherToY = (fromY - (toY - fromY) * scale);

		scale = 1;
		 if (otherToY < 0) {
			scale = fromY / (fromY - otherToY);
			otherToY = 0;
        } else if (otherToY >= this.imgMatrix.height) {
			scale = (image.getHeight() - 1 - fromY) /  (otherToY - fromY);
			otherToY = image.getHeight() - 1;
        }
        otherToX = (fromX + (otherToX - fromX) * scale) >> 0;
        
        result += this.sizeOfBlackWhiteBlackRun(fromX, fromY, otherToX, otherToY);
        return result - 1;
	},
	
	sizeOfBlackWhiteBlackRun : function(fromX, fromY, toX, toY){
        // Mild variant of Bresenham's algorithm;
        //http://en.wikipedia.org/wiki/Bresenham's_line_algorithm
		var steep = Math.abs(toY - fromY) > Math.abs(toX - fromX);

		if (steep) {
			var temp = fromX;
			fromX = fromY;
			fromY = temp;
			temp = toX;
			toX = toY;
			toY = temp;
		}

		var dx = Math.abs(toX - fromX);
		var dy = Math.abs(toY - fromY);

		var error = -dx >> 1;
		var xstep = fromX < toX ? 1 : -1;
		var ystep = fromY < toX ? 1 : -1;
        // In black pixels, looking for white, first or second time.
		var state = 0;
		// Loop up until x == toX, but not beyond
		var xLimit = toX + xstep;
		for(var x = fromX, y = fromY; x != xLimit; x += xstep){
			var realX = steep ? y : x;
			var realY = steep ? x : y;

			// Does current pixel mean we have moved white to black or vice versa?
			var pixl = this.imgMatrix.get(realX, realY);
			if(
				((state == 0) && !pixl)  ||
			    ((state == 1) && pixl)   ||
			    ((state == 2) && !pixl)
			){
				if (state == 2) 
				{
					var diffX = x - fromX;
					var diffY = y - fromY;
					return Math.sqrt(diffX * diffX + diffY * diffY);
				}
				state++;

			}
			error += dy;
			if (error > 0){
				if (y == toY){
					break;
				}
				y += ystep;
				error -= dx;
			}
		}
		// Found black-white-black; give the benefit of the doubt that the next pixel outside the image
		// is "white" so this last point at (toX+xStep,toY) is the right ending. This is really a
		// small approximation; (toX+xStep,toY+yStep) might be really correct. Ignore this.
		if (state == 2) {
		  var diffX1 = toX + xstep - fromX;
		  var diffY1 = toY - fromY;
		  return Math.sqrt(diffX1 * diffX1 + diffY1 * diffY1);
		}
		// else we didn't find even black-white-black; no estimate is really possible
		return NaN;
	}
}