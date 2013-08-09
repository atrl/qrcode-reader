(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {
    var BitMatrix = require('bitMatrix');
    //预处理
    var preProcess = function (image) {
        this.bitMatrix = new BitMatrix(image.width, image.height);
        this.grayscale(image.data);
        this.binarization(image.data, image.width, image.height);
        return this.bitMatrix;
    };

    preProcess.prototype = {
        grayscale: function (data) {
            var pix = data;
            for (var i = 0, n = pix.length; i < n; i += 4) {
                var grayscale = pix[i] * .3 + pix[i + 1] * .59 + pix[i + 2] * .11;
                pix[i  ] = grayscale;     // red
                pix[i + 1] = grayscale;     // green
                pix[i + 2] = grayscale;     // blue
            }
        },

        medianFilter: function (data, width, height) {
            //复制一份
            var bakData = [].slice.call(data, 0);
            width *= 4;
            //过滤边界
            for (var j = 1; j < height - 1; j++) {
                for (var i = 4; i < width - 4; i += 4) {
                    var k = 0;
                    var arr = [];//3*3
                    var average = 0;
                    for (var jj = j - 1; jj < j + 2; ++jj) {
                        for (var ii = i - 4; ii < i + 8; ii += 4) {
                            arr[k++] = bakData[jj * width + ii];
                        }
                    }
                    arr.sort();
                    data[j * width + i] = arr[4];
                    data[j * width + i + 1] = arr[4];
                    data[j * width + i + 2] = arr[4];
                }
            }
        },

        //otsu
        binarization: function (data, width, height) {
            var area, areaBefore = 0, areaAfter = 0; //图像总点数，前景点数， 后景点数（areaBefore + areaAfter = area）
            var averageBefore = 0;
            var variance = 0, varianceMax = 0;
            var sum = 0, sumBefore = 0, sumAfter = 0;
            var thresh;

            // 图象灰度直方图[0, 255]
            var grayscaleMap = [];
            for (var i = 0; i < 256; i++) {
                grayscaleMap[i] = 0;
            }

            // 统计各灰度直方图
            var i, j, k;
            for (i = 0; i < height; i++) {
                for (var j = 0; j < width; j++) {
                    var index = data[i * width * 4 + j * 4];
                    grayscaleMap[index]++;
                }
            }

            area = width * height;
            for (k = 0; k < 256; k++) {
                grayscaleMap[k] = grayscaleMap[k];//坑爹的join后是string
                sum += k * grayscaleMap[k];
            }

            // 遍历判断最大类间方差，得到最佳阈值
            for (k = 0; k < 256; k++) {
                //图像前景点数
                areaBefore += grayscaleMap[k];

                // 未获取前景，直接继续增加前景点数
                if (0 == areaBefore) {
                    continue;
                }

                // 前景点数包括了全部时，不可能再增加，退出循环
                if (area == areaBefore) {
                    break;
                }

                // 图像后景点数
                areaAfter = area - areaBefore;
                // 前景灰度总和
                sumBefore += k * grayscaleMap[k];

                // 前景平均灰度
                averageBefore = sumBefore / areaBefore;
                // 后景平均灰度
                averageAfter = (sum - sumBefore) / areaAfter;

                // 方差
                variance = areaBefore * areaAfter * (averageBefore - averageAfter) * (averageBefore - averageAfter);

                // 大于最大类间方差时
                if (variance > varianceMax) {
                    // 设置最大类间方差
                    varianceMax = variance;
                    // 取最大类间方差时对应的灰度的k就是最佳阈值
                    thresh = k;
                }
            }

            for (i = 0; i < height; i++) {
                for (j = 0; j < width; j++) {
                    var index = i * width * 4 + j * 4;
                    if (data[index] > thresh) {
                        //更新下bitmap
                        this.bitMatrix.set(j, i, 0);
                        data[index] = 255;
                        data[index + 1] = 255;
                        data[index + 2] = 255;
                    } else {
                        this.bitMatrix.set(j, i, 1);
                        data[index] = 0;
                        data[index + 1] = 0;
                        data[index + 2] = 0;
                    }

                }
            }
        }
    };
    return preProcess;
});