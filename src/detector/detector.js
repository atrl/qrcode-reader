(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {

    var QUtil = require('../qutil');
    var version = require('../version');
    var BitMatrix = require('../bitMatrix');
    var PerspectiveTransform = require('./perspectiveTransform');
    var findAlignmentPattern = require('./findAlignment');
    var Detector = function (imgMatrix, patternInfo) {
        this.imgMatrix = imgMatrix;
        this.patternInfo = patternInfo;
    }

    Detector.prototype = {

        process: function () {
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
            var ver = version.VERSION_TABLE[((dimension - 17) >> 2) - 1];
            //2个位置定位图形中心点距离
            var modulesBetweenFPCenters = dimension - 7;
            //寻找校正图形
            var alignmentPattern;
            if (ver.alignmentPattern.length) {
                // Guess where a "bottom right" finder pattern would have been
                var bottomRightX = topRight.x - topLeft.x + bottomLeft.x;
                var bottomRightY = topRight.y - topLeft.y + bottomLeft.y;

                // Estimate that alignment pattern is closer by 3 modules
                // from "bottom right" to known top left location
                var correctionToTopLeft = 1 - 3 / modulesBetweenFPCenters;
                var estAlignmentX = Math.floor(topLeft.x + correctionToTopLeft * (bottomRightX - topLeft.x));
                var estAlignmentY = Math.floor(topLeft.y + correctionToTopLeft * (bottomRightY - topLeft.y));

                // Kind of arbitrary -- expand search radius before giving up
                for (var i = 4; i <= 16; i <<= 1) {
                    try {
                        alignmentPattern = this.findAlignmentInRegion(moduleSize, estAlignmentX, estAlignmentY, i);
                        break;
                    } catch (e) {

                    }
                }
            }

            //创建透视变换
            var transform = this.createTransform(topLeft, topRight, bottomLeft, alignmentPattern, dimension);

            //获取变换后二维码信息
            var bits = new BitMatrix(dimension);
            var points = [];
            for (var y = 0; y < dimension; y++) {
                for (var x = 0; x < dimension; x++) {
                    points[x] = [x + 0.5, y + 0.5];
                }
                transform.transformPoints1(points);
                this.checkAndNudgePoints(points);
                try {
                    for (var x = 0; x < dimension; x++) {
                        var bit = this.imgMatrix.get(points[x][0] | 0, points[x][1] | 0);
                        bits.set(x, y, bit);
                    }
                } catch (aioobe) {
                    // This feels wrong, but, sometimes if the finder patterns are misidentified, the resulting
                    // transform gets "twisted" such that it maps a straight line of points to a set of points
                    // whose endpoints are in bounds, but others are not. There is probably some mathematical
                    // way to detect this about the transformation that I don't know yet.
                    // This results in an ugly runtime exception despite our clever checks above -- can't have
                    // that. We could check each point's coordinates but that feels duplicative. We settle for
                    // catching and wrapping ArrayIndexOutOfBoundsException.
                    throw "Error.checkAndNudgePoints";
                }
            }
            return bits;
        },

        computeDimension: function (topLeft, topRight, bottomLeft, moduleSize) {
            var tltrCentersDimension = Math.round(QUtil.getDistance(topLeft, topRight) / moduleSize);
            var tlblCentersDimension = Math.round(QUtil.getDistance(topLeft, bottomLeft) / moduleSize);
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

            if (dimension % 4 != 1) {
                throw 'error dimension';
            }
            var verison = (dimension - 17) >> 2;
            if (verison < 1 || verison > 40) {
                throw 'error dimension';
            }

            return dimension;
        },

        createTransform: function (topLeft, topRight, bottomLeft, alignmentPattern, dimension) {
            var dimMinusThree = dimension - 3.5;
            var bottomRightX;
            var bottomRightY;
            var sourceBottomRightX;
            var sourceBottomRightY;
            if (alignmentPattern) {
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

        findAlignmentInRegion: function (overallEstModuleSize, estAlignmentX, estAlignmentY, allowanceFactor) {
            var allowance = allowanceFactor * overallEstModuleSize | 0;
            var alignmentAreaLeftX = Math.max(0, estAlignmentX - allowance);
            var alignmentAreaRightX = Math.min(this.imgMatrix.width - 1, estAlignmentX + allowance);
            if (alignmentAreaRightX - alignmentAreaLeftX < overallEstModuleSize * 3) {
                throw "Error";
            }

            var alignmentAreaTopY = Math.max(0, estAlignmentY - allowance);
            var alignmentAreaBottomY = Math.min(this.imgMatrix.height - 1, estAlignmentY + allowance);

            var alignmentFinder = new findAlignmentPattern(this.imgMatrix, alignmentAreaLeftX, alignmentAreaTopY, alignmentAreaRightX - alignmentAreaLeftX, alignmentAreaBottomY - alignmentAreaTopY, overallEstModuleSize);
            return alignmentFinder.find();
        },

        checkAndNudgePoints: function (points) {
            // Check and nudge points from start until we see some that are OK:
            var nudged = true;
            for (var offset = 0; offset < points.Length && nudged; offset += 2) {
                var x = Math.floor(points[offset]);
                var y = Math.floor(points[offset + 1]);
                if (x < -1 || x > this.imgMatrix.width || y < -1 || y > this.imgMatrix.height) {
                    throw "Error.checkAndNudgePoints ";
                }
                nudged = false;
                if (x == -1) {
                    points[offset] = 0.0;
                    nudged = true;
                } else if (x == this.imgMatrix.width) {
                    points[offset] = this.imgMatrix.width - 1;
                    nudged = true;
                }
                if (y == -1) {
                    points[offset + 1] = 0.0;
                    nudged = true;
                } else if (y == this.imgMatrix.height) {
                    points[offset + 1] = this.imgMatrix.height - 1;
                    nudged = true;
                }
            }
            // Check and nudge points from end:
            nudged = true;
            for (var offset = points.Length - 2; offset >= 0 && nudged; offset -= 2) {
                var x = Math.floor(points[offset]);
                var y = Math.floor(points[offset + 1]);
                if (x < -1 || x > this.imgMatrix.width || y < -1 || y > this.imgMatrix.height) {
                    throw "Error.checkAndNudgePoints ";
                }
                nudged = false;
                if (x == -1) {
                    points[offset] = 0.0;
                    nudged = true;
                } else if (x == this.imgMatrix.width) {
                    points[offset] = this.imgMatrix.width - 1;
                    nudged = true;
                }
                if (y == -1) {
                    points[offset + 1] = 0.0;
                    nudged = true;
                } else if (y == this.imgMatrix.height) {
                    points[offset + 1] = this.imgMatrix.height - 1;
                    nudged = true;
                }
            }
        },
        //from zXing
        calculateModuleSize: function (topLeft, topRight, bottomLeft) {
            var moduleSize1 = this.calculateModuleSizeOneWay(topLeft, topRight);
            var moduleSize2 = this.calculateModuleSizeOneWay(topLeft, bottomLeft);
            return (moduleSize1 + moduleSize2) / 2;
        },

        calculateModuleSizeOneWay: function (pattern1, pattern2) {
            var size1 = this.sizeOfBlackWhiteBlackRunBothWays(pattern1.x | 0, pattern1.y | 0, pattern2.x | 0, pattern2.y | 0);
            var size2 = this.sizeOfBlackWhiteBlackRunBothWays(pattern2.x | 0, pattern2.y | 0, pattern1.x | 0, pattern1.y | 0);

            if (isNaN(size1)) {
                return size2 / 7;
            }
            if (isNaN(size2)) {
                return size1 / 7;
            }
            return (size1 + size2) / 14;
        },

        sizeOfBlackWhiteBlackRunBothWays: function (fromX, fromY, toX, toY) {
            var result = this.sizeOfBlackWhiteBlackRun(fromX, fromY, toX, toY);
            var scale = 1;
            var otherToX = fromX - (toX - fromX);
            if (otherToX < 0) {
                scale = fromX / (fromX - otherToX);
                otherToX = 0;
            } else if (otherToX >= this.imgMatrix.width) {
                scale = (this.imgMatrix.width - 1 - fromX) / (otherToX - fromX);
                otherToX = this.imgMatrix.width - 1;
            }

            var otherToY = (fromY - (toY - fromY) * scale) | 0;

            scale = 1;
            if (otherToY < 0) {
                scale = fromY / (fromY - otherToY);
                otherToY = 0;
            } else if (otherToY >= this.imgMatrix.height) {
                scale = (this.imgMatrix.height - 1 - fromY) / (otherToY - fromY);
                otherToY = this.imgMatrix.height - 1;
            }
            otherToX = (fromX + (otherToX - fromX) * scale) | 0;

            result += this.sizeOfBlackWhiteBlackRun(fromX, fromY, otherToX, otherToY);
            return result - 1;
        },

        sizeOfBlackWhiteBlackRun: function (fromX, fromY, toX, toY) {
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
            var ystep = fromY < toY ? 1 : -1;
            // In black pixels, looking for white, first or second time.
            var state = 0;

            for (var x = fromX, y = fromY; x != toX; x += xstep) {

                var realX = steep ? y : x;
                var realY = steep ? x : y;
                var pixl = this.imgMatrix.get(realX, realY);
                if (state == 1) {
                    // In white pixels, looking for black
                    if (pixl) {
                        state++;
                    }
                } else {
                    if (!pixl) {
                        state++;
                    }
                }

                if (state == 3) {
                    // Found black, white, black, and stumbled back onto white; done
                    var diffX = x - fromX;
                    var diffY = y - fromY;
                    return Math.sqrt((diffX * diffX + diffY * diffY));
                }
                error += dy;
                if (error > 0) {
                    if (y == toY) {
                        break;
                    }
                    y += ystep;
                    error -= dx;
                }
            }
            var diffX2 = toX - fromX;
            var diffY2 = toY - fromY;
            return Math.sqrt((diffX2 * diffX2 + diffY2 * diffY2));
        }
    }
    return Detector;
});