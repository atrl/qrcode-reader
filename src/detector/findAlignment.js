(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {
    /**
     * 寻找校正图形
     */
    var QUtil = require('../qutil');
    var Pattern = require('./pattern');
    var FindAlignmentPattern = function (imgMatrix, startX, startY, width, height, moduleSize) {
        this.imgMatrix = imgMatrix;
        this.startX = startX;
        this.startY = startY;
        this.width = width;
        this.height = height;
        this.moduleSize = moduleSize;

    };

    FindAlignmentPattern.prototype = {
        patterns: [],
        find: function () {
            var endX = this.startX + this.width;
            var middleY = this.startY + (this.height >> 1);
            for (var i = 0; i < this.height; i++) {
                //从中心点向两边查找
                this.y = middleY + (i & 1 ? -1 : 1) * ((i + 1) >> 1);
                ;
                //校正图形没有分隔符判断 1-1-1-1-1会被内容区域污染只判断1-1-1
                this.states = QUtil.getStates(3);

                this.x = this.startX;
                // Burn off leading white pixels before anything else; if we start in the middle of
                // a white run, it doesn't make sense to count its length, since we don't know if the
                // white run continued to the left of the start point
                while (this.x < endX && !this.imgMatrix.get(this.x, this.y)) {
                    this.x++;
                }
                this.curState = 0;
                while (this.x < endX) {
                    if (this.imgMatrix.get(this.x, this.y)) {
                        // Black pixel
                        if (this.curState == 1) {
                            // Counting black pixels
                            this.states[this.curState]++;
                        } else {
                            // Counting white pixels
                            if (this.curState == 2) {
                                if (this.checkRatio(this.states)) {
                                    var pattern = this.findPattern();
                                    if (pattern) {
                                        return pattern;
                                    }
                                }
                                this.states[0] = this.states[2];
                                this.states[1] = 1;
                                this.states[2] = 0;
                                this.curState = 1;
                            } else {
                                this.states[++this.curState]++;
                            }
                        }
                    } else {
                        // White pixel
                        if (this.curState == 1) {
                            // Counting black pixels
                            this.curState++;
                        }
                        this.states[this.curState]++;
                    }
                    this.x++;
                }
                if (this.checkRatio(this.states)) {
                    var pattern = this.findPattern();
                    if (pattern) {
                        return pattern;
                    }
                }
            }

            // Hmm, nothing we saw was observed and confirmed twice. If we had
            // any guess at all, return it.
            if (this.patterns.length) {
                return this.patterns[0];
            }

            throw "Couldn't find enough alignment patterns";
        },

        findPattern: function () {
            var totalModuleSize = 0;
            this.states.forEach(function (v, i) {
                totalModuleSize += v;
            });
            var centerX = this.getCenterFromEnd(this.states, this.x);
            var centerY = this.getY(this.y, Math.floor(centerX), 2 * this.states[1], totalModuleSize);
            if (centerY) {
                var estimatedModuleSize = totalModuleSize / 3;
                for (var i = 0, pattern; pattern = this.patterns[i]; i++) {
                    if (pattern.aboutEquals(estimatedModuleSize, centerX, centerY)) {
                        return new Pattern(centerX, centerY, estimatedModuleSize);
                    }
                }
                // Hadn't found this before; save it
                var pattern = new Pattern(centerX, centerY, estimatedModuleSize);
                this.patterns.push(pattern);
            }
            return null;
        },

        checkRatio: function (states) {
            var maxVariance = this.moduleSize / 2;
            for (var i = 0; i < 3; i++) {
                if (Math.abs(this.moduleSize - states[i]) >= maxVariance) {
                    return false;
                }
            }
            return true;
        },

        getY: function (startY, centerX, maxCount, totalModuleSize) {

            var statesY = QUtil.getStates(3);

            // Start counting up from center
            var y = startY;
            while (y >= 0 && this.imgMatrix.get(centerX, y) && statesY[1] <= maxCount) {
                statesY[1]++;
                y--;
            }
            // If already too many modules in this state or ran off the edge:
            if (y < 0 || statesY[1] > maxCount) {
                return NaN;
            }
            while (y >= 0 && !this.imgMatrix.get(centerX, y) && statesY[0] <= maxCount) {
                statesY[0]++;
                y--;
            }
            if (statesY[0] > maxCount) {
                return NaN;
            }

            // Now also count down from center
            y = startY + 1;
            while (y < this.imgMatrix.height && this.imgMatrix.get(centerX, y) && statesY[1] <= maxCount) {
                statesY[1]++;
                y++;
            }
            if (y == this.imgMatrix.height || statesY[1] > maxCount) {
                return NaN;
            }
            while (y < this.imgMatrix.height && !this.imgMatrix.get(centerX, y) && statesY[2] <= maxCount) {
                statesY[2]++;
                y++;
            }
            if (statesY[2] > maxCount) {
                return NaN;
            }

            // 统计Y轴总位置探测图形数
            var totalModuleSizeY = 0;
            statesY.forEach(function (v) {
                totalModuleSizeY += v;
            })

            // If we found a finder-pattern-like section, but its size is more than 40% different than
            // the original, assume it's a false positive
            if (5 * Math.abs(totalModuleSizeY - totalModuleSize) >= 2 * totalModuleSize) {
                return NaN;
            }

            return this.checkRatio(statesY) ? this.getCenterFromEnd(statesY, y) : NaN;
        },

        //从图形最后的x或y找到中心点的位置
        getCenterFromEnd: function (states, end) {
            return (end - states[2]) - states[1] / 2;
        }
    }
    return FindAlignmentPattern;
})
;