(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {
    /**
     * 图形探测
     */

    var QUtil = require('../qutil');
    var Pattern = require('./pattern');

    //常量
    var MIN_SKIP = 3;
    var MAX_MODULES = 57;
    var INTEGER_MATH_SHIFT = 8;
    var CENTER_QUORUM = 2;

    //查询
    function FindPattern(imgMatrix) {
        this.bitMatrix = imgMatrix;
        this.height = this.bitMatrix.height;
        this.width = this.bitMatrix.width;
    }


    FindPattern.prototype = {
        //状态
        isFinish: false,
        patterns: [],
        //主逻辑
        find: function () {
            this.patterns = [];
            this.skip = Math.floor((3 * this.height) / (4 * MAX_MODULES));
            if (this.skip < MIN_SKIP) {
                this.skip = MIN_SKIP;
            }

            //没必要每行都找
            for (this.y = this.skip - 1; this.y < this.height && !this.isFinish; this.y += this.skip) {
                //记录当前模块数 以x轴为基准 换行了要重新算
                // black - white - black - white - black
                this.states = QUtil.getStates(5);
                this.curState = 0;
                for (this.x = 0; this.x < this.width; this.x++) {
                    //深色区
                    if (this.bitMatrix.get(this.x, this.y)) {
                        //从white -> black 增加当前的curState
                        if ((this.curState & 1) == 1) {
                            this.curState++;
                        }
                        //深色区统计
                        this.states[this.curState]++;

                    } else {
                        //从black -> white
                        if ((this.curState & 1) == 0) {
                            //满5行判断下是否是正方形
                            if (this.curState == 4) {
                                this.checkState();
                            } else {
                                this.curState++;
                                this.states[this.curState]++;
                            }
                        } else {
                            this.states[this.curState]++;
                        }
                    }
                }

                //对于一行最后全部是黑色的，结束的时候验证
                if (this.checkRatio()) {
                    var hasPattern = this.findPattern();
                    if (hasPattern) {
                        this.skip = this.states[0];
                        if (this.hasSkipped) {
                            // Found a third one
                            this.isFinish = this.checkMultiplyPatterns();
                        }
                    }
                }
            }

            if (this.patterns.length < 3) {
                throw 'pattern no find';
            } else {
                //有多个图形的 选择最合适的
                this.findBestPatterns();
                this.orderBestPatterns();
                return this.getResult();
            }

        },
        //寻找位置探测图形
        findPattern: function () {
            var totalModuleSize = 0;
            this.states.forEach(function (v, i) {
                totalModuleSize += v;
            });
            //通过x验证比例后的states中找到x坐标
            var centerX = this.getCenterFromEnd(this.states, this.x);
            //通过x坐标寻找y坐标
            var centerY = this.getY(this.y, Math.floor(centerX), this.states[2], totalModuleSize);

            if (centerY) {
                //再次验证x坐标的真实性
                centerX = this.getX(Math.floor(centerX), Math.floor(centerY), this.states[2], totalModuleSize);
                if (centerX) {
                    //估计模块大小
                    var estimatedModuleSize = totalModuleSize / 7;
                    //是否寻找过
                    var founded = false;
                    for (var i = 0, pattern; pattern = this.patterns[i]; i++) {
                        //验证模块是否被寻找过
                        if (pattern.aboutEquals(estimatedModuleSize, centerX, centerY)) {
                            pattern.count++;
                            founded = true;
                            break;
                        }
                    }
                    ;
                    if (!founded) {
                        //找到位置探测图形了丢到数组里
                        var pattern = new Pattern(centerX, centerY, estimatedModuleSize);
                        this.patterns.push(pattern);
                    }
                    return true;
                }
            }
            return false;
        },

        findBestPatterns: function () {
            var patternCount = this.patterns.length;
            // Filter outlier possibilities whose module size is too different
            if (patternCount > 3) {
                // But we can only afford to do so if we have at least 4 possibilities to choose from
                var totalModuleSize = 0;

                this.patterns.forEach(function (pattern) {
                    totalModuleSize += pattern.EstimatedModuleSize;
                })

                var average = totalModuleSize / patternCount;
                for (var i = 0; i < this.patterns.length && this.patterns.length > 3; i++) {
                    var pattern = this.patterns[i];
                    //判断模块大小 减去平均值 大于 20%的模块 抛弃該图形
                    if (Math.abs(pattern.EstimatedModuleSize - average) > 0.2 * average) {
                        this.patterns.splice(i, 1);
                        i--;
                    }
                }
            }
        },
        //对3个位置探测图形进行排序 bottomleft - topleft - topright
        orderBestPatterns: function () {
            // Find distances between pattern centers
            var zeroOneDistance = QUtil.getDistance(this.patterns[0], this.patterns[1]);
            var oneTwoDistance = QUtil.getDistance(this.patterns[1], this.patterns[2]);
            var zeroTwoDistance = QUtil.getDistance(this.patterns[0], this.patterns[2]);

            var patternA, patternB, patternC;
            // Assume one closest to other two is B; A and C will just be guesses at first
            // 确认topleft 猜测其他2个
            if (oneTwoDistance >= zeroOneDistance && oneTwoDistance >= zeroTwoDistance) {
                patternB = this.patterns[0];
                patternA = this.patterns[1];
                patternC = this.patterns[2];
            } else if (zeroTwoDistance >= oneTwoDistance && zeroTwoDistance >= zeroOneDistance) {
                patternB = this.patterns[1];
                patternA = this.patterns[0];
                patternC = this.patterns[2];
            } else {
                patternB = this.patterns[2];
                patternA = this.patterns[0];
                patternC = this.patterns[1];
            }

            // Use cross product to figure out whether A and C are correct or flipped.
            // This asks whether BC x BA has a positive z component, which is the arrangement
            // we want for A, B, C. If it's negative, then we've got it flipped around and
            // should swap A and C.
            if (QUtil.crossProductZ(patternA, patternB, patternC) < 0) {
                var temp = patternA;
                patternA = patternC;
                patternC = temp;
            }

            this.patterns[0] = patternA;
            this.patterns[1] = patternB;
            this.patterns[2] = patternC;
        },

        //验证
        checkState: function () {
            //验证是否符合比例
            if (this.checkRatio()) {
                var hasPattern = this.findPattern();
                if (hasPattern) {
                    // Start examining every other line. Checking each line turned out to be too
                    // expensive and didn't improve performance.
                    this.skip = 2;
                    //第三个位置探测图形了 判断是否结束
                    if (this.hasSkipped) {
                        this.isFinish = this.checkMultiplyPatterns();
                    } else {
                        var rowSkip = this.getRowSkip();
                        if (rowSkip > this.states[2]) {
                            // Skip rows between row of lower confirmed center
                            // and top of presumed third confirmed center
                            // but back up a bit to get a full chance of detecting
                            // it, entire width of center of finder pattern

                            // Skip by rowSkip, but back off by stateCount[2] (size of last center
                            // of pattern we saw) to be conservative, and also back off by skip which
                            // is about to be re-added
                            this.y += rowSkip - this.states[2] - this.skip;
                            this.x = this.width - 1;
                        }
                    }
                } else {
                    //寻找下一个深色区
                    do {
                        this.x++;
                    }
                        //跳过所有中间的浅色区
                    while (this.x < this.width && !this.bitMatrix.get(this.x, this.y));
                    //修正正深色区的位置
                    this.x--;
                }
                //找到位置探测图形了 清理状态
                this.curState = 0;
                this.states = QUtil.getStates(5);
            } else {
                //不是位置探测图形 把前2个技术抛弃 重新寻找1:1:3:1:1
                this.states.splice(0, 2);
                this.states.push(1, 0);
                this.curState = 3;
            }
        },
        //验证 1-1-3-1-1 比例 todo
        checkRatio: function (states) {
            //位置探测图形数统计
            var totalModuleSize = 0;
            states = states || this.states;
            for (var i = 0, state; state = this.states[i]; i++) {
                if (!state) {
                    return false;
                }
                totalModuleSize += state;
            }
            ;

            if (totalModuleSize < 7) {
                return false;
            }
            var moduleSize = Math.floor((totalModuleSize << INTEGER_MATH_SHIFT) / 7);
            var maxVariance = Math.floor(moduleSize / 2);
            // Allow less than 50% variance from 1-1-3-1-1 proportions
            return (
                Math.abs(moduleSize - (states[0] << INTEGER_MATH_SHIFT)) < maxVariance &&
                    Math.abs(moduleSize - (states[1] << INTEGER_MATH_SHIFT)) < maxVariance &&
                    Math.abs(3 * moduleSize - (states[2] << INTEGER_MATH_SHIFT)) < 3 * maxVariance &&
                    Math.abs(moduleSize - (states[3] << INTEGER_MATH_SHIFT)) < maxVariance &&
                    Math.abs(moduleSize - (states[4] << INTEGER_MATH_SHIFT)) < maxVariance
                );
        },
        //判断是否有多个中心位置探测图形 todo
        checkMultiplyPatterns: function () {
            var patternCount = 0;
            var totalModuleSize = 0;
            this.patterns.forEach(function (pattern) {
                if (pattern.count >= CENTER_QUORUM) {
                    patternCount++;
                    totalModuleSize += patternCount.EstimatedModuleSize;
                }
            });
            if (patternCount < 3) {
                return false;
            }
            // OK, we have at least 3 confirmed centers, but, it's possible that one is a "false positive"
            // and that we need to keep looking. We detect this by asking if the estimated module sizes
            // vary too much. We arbitrarily say that when the total deviation from average exceeds
            // 5% of the total module size estimates, it's too much.
            var average = totalModuleSize / this.patterns.length;
            var totalDeviation = 0;

            this.patterns.forEach(function (pattern) {
                totalDeviation += Math.abs(pattern.EstimatedModuleSize - average);
            });
            return totalDeviation <= 0.05 * totalModuleSize;
        },

        /**
         *通过x轴找到y轴坐标 通过穿进来的x 找到 black - white - black - white - black
         *然后验证是否符合比例
         *@param {int} startY 当前的Y坐标
         *@param {int} centerX 当前中心位置探测图形x坐标
         *@param {int} maxCount 1-1-3-1-1中 3的位置探测图形数
         *@param {int} totalModuleSize 1-1-3-1-1位置探测图形的总数
         */
        getY: function (startY, centerX, maxCount, totalModuleSize) {
            var statesY = QUtil.getStates(5);
            //从中间往前查找 black-white
            var y = startY;
            //从y轴中心位置探测图形开始
            //统计中心位置探测图形 3 的位置探测图形数
            while (y >= 0 && this.bitMatrix.get(centerX, y)) {
                statesY[2]++;
                y--;
            }
            if (y < 0) {
                return NaN;
            }


            //第一个白位置探测图形的个数 不能比中心黑位置探测图形大
            while (y >= 0 && !this.bitMatrix.get(centerX, y) && statesY[1] <= maxCount) {
                statesY[1]++;
                y--;
            }
            if (y < 0 || statesY[1] > maxCount) {
                return NaN;
            }


            //第一个黑位置探测图形
            while (y >= 0 && this.bitMatrix.get(centerX, y) && statesY[0] <= maxCount) {
                statesY[0]++;
                y--;
            }
            if (statesY[0] > maxCount) {
                return NaN;
            }


            //从中间往后查找
            y = startY + 1;
            //统计完整的中心位置探测图形的位置探测图形数
            while (y < this.height && this.bitMatrix.get(centerX, y)) {
                statesY[2]++;
                y++;
            }
            if (y == this.height) {
                return NaN;
            }


            //第二个白位置探测图形
            while (y < this.height && !this.bitMatrix.get(centerX, y) && statesY[3] < maxCount) {
                statesY[3]++;
                y++;
            }
            if (y == this.height || statesY[3] >= maxCount) {
                return NaN;
            }


            while (y < this.width && this.bitMatrix.get(centerX, y) && statesY[4] < maxCount) {
                statesY[4]++;
                y++;
            }
            if (statesY[4] >= maxCount) {
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

        getX: function (startX, centerY, maxCount, totalModuleSize) {
            var statesX = QUtil.getStates(5);

            var x = startX;
            while (x >= 0 && this.bitMatrix.get(x, centerY)) {
                statesX[2]++;
                x--;
            }
            if (x < 0) {
                return NaN;
            }

            while (x >= 0 && !this.bitMatrix.get(x, centerY) && statesX[1] <= maxCount) {
                statesX[1]++;
                x--;
            }
            if (x < 0 || statesX[1] > maxCount) {
                return NaN;
            }

            while (x >= 0 && this.bitMatrix.get(x, centerY) && statesX[0] <= maxCount) {
                statesX[0]++;
                x--;
            }
            if (statesX[0] > maxCount) {
                return NaN;
            }

            x = startX + 1;
            while (x < this.width && this.bitMatrix.get(x, centerY)) {
                statesX[2]++;
                x++;
            }
            if (x == this.width) {
                return NaN;
            }

            while (x < this.width && !this.bitMatrix.get(x, centerY) && statesX[3] < maxCount) {
                statesX[3]++;
                x++;
            }
            if (x == this.width || statesX[3] >= maxCount) {
                return NaN;
            }

            while (x < this.width && this.bitMatrix.get(x, centerY) && statesX[4] < maxCount) {
                statesX[4]++;
                x++;
            }
            if (statesX[4] >= maxCount) {
                return NaN;
            }

            var totalModuleSizeX = 0;
            statesX.forEach(function (v) {
                totalModuleSizeX += v;
            })

            // If we found a finder-pattern-like section, but its size is significantly different than
            // the original, assume it's a false positive
            if (5 * Math.abs(totalModuleSizeX - totalModuleSize) >= totalModuleSize) {
                return NaN;
            }

            return this.checkRatio(statesX) ? this.getCenterFromEnd(statesX, x) : NaN;
        },
        //从位置探测图形最后的x或y找到中心点的位置
        getCenterFromEnd: function (states, end) {
            return (end - states[3] - states[4]) - states[2] / 2;
        },

        //找到2个位置探测图形以后 第三个位置探测图形
        getRowSkip: function () {
            if (this.patterns.length <= 1) {
                return 0;
            }
            var firstPattern = null;
            for (var i = 0, pattern; pattern = this.patterns[i]; i++) {
                if (pattern.count >= CENTER_QUORUM) {
                    if (firstPattern == null) {
                        firstPattern = pattern;
                    } else {
                        // We have two confirmed centers
                        // How far down can we skip before resuming looking for the next
                        // pattern? In the worst case, only the difference between the
                        // difference in the x / y coordinates of the two centers.
                        // This is the case where you find top left last.
                        this.hasSkipped = true;
                        return Math.floor((Math.abs(firstPattern.x - pattern.x) - Math.abs(firstPattern.y - pattern.y)) / 2);
                    }
                }
            }
            return 0;
        },

        getResult: function () {
            return {
                bottomLeft: this.patterns[0],
                topLeft: this.patterns[1],
                topRight: this.patterns[2]
            };
        }
    }
    return FindPattern;
});