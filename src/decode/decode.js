(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {

    //纠错
    var ReedSolomonDecoder = require('../reedSolomon/reedSolomon');
    var GF256 = require('../reedSolomon/gf').GF256;

    var BitSource = require('./bitSource');

    //特殊编码
    var urldecode = require('../urldecode');

    var version = require('../version');

    var Decode = function (bitMatrix, callback) {
        this.data = '';
        this.bitMatrix = bitMatrix;
        this.callback = callback || function () {
        };
    };

    //字母数字模式映射表
    Decode.ALPHANUMERIC = [
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
        'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
        'U', 'V', 'W', 'X', 'Y', 'Z', ' ', '$', '%', '*',
        '+', '-', '.', '/', ':'
    ];

    //被掩模后15位格式信息表 从 00000 到 11111
    //前2位表示纠错等级
    //后3位表示掩模图形
    Decode.FORMATINFO = [
        0x5412, 0x5125, 0x5E7C, 0x5B4B, 0x45F9, 0x40CE,
        0x4F97, 0x4AA0, 0x77C4, 0x72F3, 0x7DAA, 0x789D,
        0x662F, 0x6318, 0x6C41, 0x6976, 0x1689, 0x13BE,
        0x1CE7, 0x19D0, 0x0762, 0x0255, 0x0D0C, 0x083B,
        0x355F, 0x3068, 0x3F31, 0x3A06, 0x24B4, 0x2183,
        0x2EDA, 0x2BED
    ];

    //纠错等级表
    Decode.ECL_TABLE = {
        1: 'L',
        0: 'M',
        3: 'Q',
        2: 'H'
    };

    //模式指示符
    Decode.MODE_TABLE = {
        0x00: {
            type: 'TERMINATOR',
            length: [0, 0, 0]
        },
        0x01: {
            type: 'NUMERIC',
            length: [10, 12, 14]
        },
        0x02: {
            type: 'ALPHANUMERIC',
            length: [9, 11, 13]
        },
        0x03: {
            type: 'STRUCTURED_APPEND',
            length: [0, 0, 0]
        },
        0x04: {
            type: 'BYTE',
            length: [8, 16, 16]
        },
        0x07: {
            type: 'ECI',
            length: null
        },
        0x08: {
            type: 'KANJI',
            length: [8, 10, 12]
        },
        0x05: {
            tpye: 'FNC1_FIRST_POSITION',
            length: null
        },
        0x09: {
            type: 'FNC1_SECOND_POSITION',
            length: null
        },
        0x0D: {
            type: 'HANZI',
            length: [8, 10, 12]
        }
    };
    Decode.rsDecoder = new ReedSolomonDecoder(GF256.QR_CODE_FIELD);

    //用于计算差异
    //Offset i holds the number of 1 bits in the binary representation of i
    Decode.BITS_SET_IN_HALF_BYTE = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
    Decode.numBitsDiffering = function (a, b) {
        // a now has a 1 bit exactly where its bit differs with b's
        a ^= b;
        // Count bits set quickly with a series of lookups:
        return Decode.BITS_SET_IN_HALF_BYTE[a & 0x0F] +
            Decode.BITS_SET_IN_HALF_BYTE[(a >>> 4 & 0x0F)] +
            Decode.BITS_SET_IN_HALF_BYTE[(a >>> 8 & 0x0F)] +
            Decode.BITS_SET_IN_HALF_BYTE[(a >>> 12 & 0x0F)] +
            Decode.BITS_SET_IN_HALF_BYTE[(a >>> 16 & 0x0F)] +
            Decode.BITS_SET_IN_HALF_BYTE[(a >>> 20 & 0x0F)] +
            Decode.BITS_SET_IN_HALF_BYTE[(a >>> 24 & 0x0F)] +
            Decode.BITS_SET_IN_HALF_BYTE[(a >>> 28 & 0x0F)];
    };

    Decode.prototype = {

        process: function () {
            this.version = this.getVersionInfo();
            this.dimension = this.version * 4 + 17;
            this.formatinfo = this.getFormatInfo();
            this.codeWord = this.getCodeWord();

            //将读取的codeword整理到每个ECblock中进行纠错
            this.dataBlocks = this.getDataBlocks();
            console.log(this.dataBlocks);

            //纠错
            //最无奈的过程 看不懂GF256
            var resultBytes = [];
            for (var i = 0, dataBlock; dataBlock = this.dataBlocks[i]; i++) {
                this.correctErrors(dataBlock.codeWords, dataBlock.numDataCodewords);
                for (var j = 0; j < dataBlock.numDataCodewords; j++) {
                    resultBytes.push(dataBlock.codeWords[j]);
                }
            }

            this.bitSource = new BitSource(resultBytes, this.formatinfo.errorCorrectionLevel);

            //根据版本号确认数据长度
            if (this.version <= 9)
                this.dataLengthMode = 0;
            else if (this.version >= 10 && this.version <= 26)
                this.dataLengthMode = 1;
            else if (this.version >= 27 && this.version <= 40)
                this.dataLengthMode = 2;

            this.parseSource();
        },

        decode_utf8 : function(){
            var result;
            try{
                result = decodeURIComponent(escape(this.data));
            }catch(e){}
            this.callback(result);
        },

        /**
         * 获取掩模图形在(x, y)坐标的掩模状态
         * @param  {string} maskPattern 掩模图形类型
         * @param  {int}    x           x坐标
         * @param  {int}    y           y坐标
         * @return {boolean}            是否掩模
         */
        getMask: function (maskPattern, x, y) {
            switch (maskPattern) {
                case 0 :
                    return (x + y) % 2 == 0;
                case 1 :
                    return y % 2 == 0;
                case 2 :
                    return x % 3 == 0;
                case 3 :
                    return (x + y) % 3 == 0;
                case 4 :
                    return ( Math.floor(y / 2) + Math.floor(x / 3) ) % 2 == 0;
                case 5 :
                    return (x * y) % 2 + (x * y) % 3 == 0;
                case 6 :
                    return ( (x * y) % 2 + (x * y) % 3 ) % 2 == 0;
                case 7 :
                    return ( (x * y) % 3 + (x + y) % 2 ) % 2 == 0;
                default :
                    throw "error maskPattern:" + maskPattern;
            }
        },
        /**
         * 获取格式信息 直接使用掩模后的格式信息查表
         * @return {json} 返回错误等级和掩模图形
         */
        getFormatInfo: function () {
            //位置探测图形topleft 周围15位获取格式信息
            var maskedFormatInfo1 = 0;
            var x,
                y,
                bitIndex = 0;
            for (y = 0; y <= 5; y++, bitIndex++) {
                maskedFormatInfo1 += this.bitMatrix.get(8, y) << bitIndex;
            }
            maskedFormatInfo1 += this.bitMatrix.get(8, 7) << (bitIndex++);
            maskedFormatInfo1 += this.bitMatrix.get(8, 8) << (bitIndex++);
            maskedFormatInfo1 += this.bitMatrix.get(7, 8) << (bitIndex++);

            for (x = 5; x >= 0; x--, bitIndex++) {
                maskedFormatInfo1 += this.bitMatrix.get(x, 8) << bitIndex;
            }

            //获取由另外2条bit组成的格式信息
            var maskedFormatInfo2 = 0;
            var dimension = this.bitMatrix.height;
            bitIndex = 0;
            for (x = dimension - 1; x >= dimension - 8; x--, bitIndex++) {
                maskedFormatInfo2 += this.bitMatrix.get(x, 8) << bitIndex;
            }

            for (y = dimension - 7; y <= dimension - 1; y++, bitIndex++) {
                maskedFormatInfo2 += this.bitMatrix.get(8, y) << bitIndex;
            }
            console.log(maskedFormatInfo1.toString(2));
            console.log(maskedFormatInfo2.toString(2));
            //从编码后的格式信息列表中寻找一样的格式信息
            var bestFormatInfo, bestDifference;
            for (var i = 0, targetFormatInfo; targetFormatInfo = Decode.FORMATINFO[i]; i++) {
                //格式信息在格式信息表里面停止查找
                if (maskedFormatInfo1 == targetFormatInfo || maskedFormatInfo2 == targetFormatInfo) {
                    bestFormatInfo = i;
                    bestDifference = 0;
                    break;
                }

                //对格式信息不在格式信息表里面的计算差异
                bitsDifference = Decode.numBitsDiffering(maskedFormatInfo1, targetFormatInfo);
                if (bitsDifference < bestDifference) {
                    bestFormatInfo = I;
                    bestDifference = bitsDifference;
                }
                //对于2个格式信息不一致的 从2个中找到最优的
                if (maskedFormatInfo1 != maskedFormatInfo2) {
                    bitsDifference = Decode.numBitsDiffering(maskedFormatInfo2, targetFormatInfo);
                    if (bitsDifference < bestDifference) {
                        bestFormatInfo = i;
                        bestDifference = bitsDifference;
                    }
                }
            }
            //Hamming distance of the 32 masked codes is 7, by construction, so <= 3 bits differing means we found a match
            if (bestDifference <= 3) {
                return {
                    //纠错等级
                    errorCorrectionLevel: bestFormatInfo >> 3,
                    //掩模图形
                    maskPattern: bestFormatInfo & 7
                };
            }
            throw 'error formatinfo'
        },
        /**
         * 获取版本信息 查水表
         * @return {json} 版本信息
         */
        getVersionInfo: function () {
            var dimension = this.bitMatrix.height;
            var v = (dimension - 17 >> 2);
            //版本号小于7没有版本信息
            if (v <= 6) {
                return v;
            }

            var x, y, bitIndex = 0;
            var versionInfo1 = 0;
            //topright的版本信息
            for (var y = 0; y <= 5; y++) {
                for (x = dimension - 11; x <= dimension - 9; x++, bitIndex++) {
                    versionInfo1 += this.bitMatrix.get(x, y) << bitIndex;
                }
            }

            //bottomleft的版本信息
            bitIndex = 0;
            var versionInfo2 = 0;
            for (x = 0; x <= 5; x++) {
                for (y = dimension - 11; y <= dimension - 9; y++, bitIndex++) {
                    versionInfo2 += this.bitMatrix.get(x, y) << bitIndex;
                }
            }

            //从编码后的格式信息列表中寻找一样的格式信息
            var bestVersion, bestDifference;
            for (var i = 0, targetVersionInfo; targetVersionInfo = version.VERSIONINFO[i]; i++) {
                //格式信息在格式信息表里面停止查找
                if (versionInfo1 == targetVersionInfo || versionInfo2 == targetVersionInfo) {
                    bestVersion = i + 7;
                    bestDifference = 0;
                    break;
                }

                //对格式信息不在格式信息表里面的计算差异
                bitsDifference = Decode.numBitsDiffering(versionInfo1, targetVersionInfo);
                if (bitsDifference < bestDifference) {
                    bestVersion = i + 7;
                    bestDifference = bitsDifference;
                }
                //对于2个版本信息不一致的 从2个中找到最优的
                if (versionInfo1 != versionInfo2) {
                    bitsDifference = Decode.numBitsDiffering(versionInfo2, targetVersionInfo);
                    if (bitsDifference < bestDifference) {
                        bestVersion = i + 7;
                        bestDifference = bitsDifference;
                    }
                }
            }
            if (bestDifference <= 3) {
                return bestVersion
            }
            throw 'error version'
        },

        //解析bitmatrix获取ECbBlocks的数据
        getCodeWord: function () {
            //过滤功能图形 function pattern 直接设置null 读取时遇到null的直接continue
            this.clearFunctionPattern();

            var codeWord = [];
            var arrow = -1;
            var bitIndex = 7;
            var byteIndex = 0;
            var y = this.dimension - 1;
            var bit;
            this.totalCodeWord = this.getTotalCodeWord();
            //
            loopX : for (var x = this.dimension - 1; x > 0; x -= 2) {
                //第7列是位置探测图形和定位图形 不存在数据
                //同时修正x坐标
                if (x == 6) x--;
                loopY : for (; y >= 0 && y < this.dimension; y += arrow) {
                    for (var i = 0; i < 2; i++) {
                        if (( bit = this.bitMatrix.get(x - i, y) ) != null) {
                            codeWord[byteIndex] || (codeWord[byteIndex] = 0);
                            codeWord[byteIndex] += (bit ^ this.getMask(this.formatinfo.maskPattern, x - i, y)) << bitIndex;
                            bitIndex--;
                            if (bitIndex == -1) {
                                byteIndex++;
                                bitIndex = 7;

                                //计算数据位已达到容量
                                if (this.totalCodeWord == byteIndex) {
                                    break loopX;
                                }
                            }
                        }
                    }
                }
                arrow *= -1;
                y += arrow;
            }
            if (this.totalCodeWord != byteIndex) {
                throw 'readCodewords : ' + byteIndex + ' != totalcodeWords';
            }
            console.log(codeWord)
            return codeWord;
        },

        //统计ECBlock数量
        getTotalCodeWord: function () {
            var total = 0;
            var ecbArray = version.VERSION_TABLE[this.version - 1][Decode.ECL_TABLE[this.formatinfo.errorCorrectionLevel]];
            for (var i = 0; i < ecbArray.length; i += 3) {
                total += ecbArray[i] * (ecbArray[i + 1]);
            }
            return total;
        },

        /**
         * 整理数据块信息
         * 读取的codeword由每个数据的每个byte依次排列
         * 如版本号 5-H {块1 : [D1, D2, ...], 块2 : [D12, D13, ...], 块3 : [D23, D24, ...], 块4 : [D35, D36, ...]}
         * 得到的顺序为[D1, D12, D23, D35, D2 ...]
         * 需要重新整理顺序，进行纠错
         */
        getDataBlocks: function () {
            var ecbArray = version.VERSION_TABLE[this.version - 1][Decode.ECL_TABLE[this.formatinfo.errorCorrectionLevel]];
            //统计数据块数量
            var BlockCount = 0;
            var dataBlocks = [];
            for (var i = 0; i < ecbArray.length; i += 3) {
                for (var j = 0; j < ecbArray[i]; j++) {
                    dataBlocks[BlockCount] = {
                        codeWords: [],
                        numDataCodewords: ecbArray[i + 2],
                        numTotalCodeWords: ecbArray[i + 1]
                    }
                    BlockCount++;
                }
            }

            //数据块由多个相同或相差1的bytes构成，bytes少的必须排在前面 需要找到bytes多的在哪个位置将byte补上
            var shortBlocksTotalCodewords = ecbArray[1];
            var longerBlockStart = BlockCount - 1;
            while (longerBlockStart >= 0) {
                if (dataBlocks[longerBlockStart].numTotalCodeWords == shortBlocksTotalCodewords) {
                    break;
                }
                longerBlockStart--;
            }
            longerBlockStart++;

            var shortBlocksCodeWords = ecbArray[2];
            var index = 0;
            //循环依次将bytes放入数据块中
            for (var i = 0; i < shortBlocksCodeWords; i++) {
                for (var j = 0; j < BlockCount; j++) {
                    dataBlocks[j].codeWords.push(this.codeWord[index++]);
                }
            }

            //补起长数据块的bytes
            for (var i = longerBlockStart; i < BlockCount; i++) {
                dataBlocks[i].codeWords.push(this.codeWord[index++]);
            }

            //纠错信息
            //每一个数据块的纠错信息长度相同
            for (var i = shortBlocksCodeWords; i < shortBlocksTotalCodewords; i++) {
                for (var j = 0; j < BlockCount; j++) {
                    dataBlocks[j].codeWords.push(this.codeWord[index++]);
                }
            }
            return dataBlocks;
        },

        //清理功能图形
        clearFunctionPattern: function () {
            //清理top-left位置探测图形 + 分隔符 + 格式信息
            this.bitMatrix.setRegion(0, 0, 9, 9);
            //清理top-right位置探测图形 + 分隔符 + 格式信息
            this.bitMatrix.setRegion(this.dimension - 8, 0, 8, 9);
            //清理bottom-right位置探测图形 + 分隔符 + 格式信息
            this.bitMatrix.setRegion(0, this.dimension - 8, 9, 8);

            //清理校正图形
            var alignmentPattern = version.VERSION_TABLE[this.version - 1].alignmentPattern;
            for (var y = 0; y < alignmentPattern.length; y++) {
                for (var x = 0; x < alignmentPattern.length; x++) {
                    //位置探测图形周围没有校正图形
                    if (
                        (x == 0 && y == 0) ||
                            (x == 0 && y == alignmentPattern.length - 1) ||
                            (x == alignmentPattern.length - 1 && y == 0)
                        ) {
                        continue;
                    }
                    this.bitMatrix.setRegion(alignmentPattern[y] - 2, alignmentPattern[x] - 2, 5, 5, null);
                }
            }

            //清理定位图形
            this.bitMatrix.setRegion(6, 9, 1, this.dimension - 17, null);
            this.bitMatrix.setRegion(9, 6, this.dimension - 17, 1, null);

            //版本信息
            if (this.version > 6) {
                this.bitMatrix.setRegion(this.dimension - 11, 0, 3, 6, null);
                this.bitMatrix.setRegion(0, this.dimension - 11, 6, 3, null);
            }
        },

        /**
         * 纠错
         * @param {array} codewordBytes 包含数据码和纠错信息的bytes数组
         * @param {int} numDataCodewords 数据码字数
         */
        correctErrors: function (codewordBytes, numDataCodewords) {
            var codewordsInts = codewordBytes.slice(0);
            //纠错容量
            var numECCodewords = codewordBytes.length - numDataCodewords;
            try {
                Decode.rsDecoder.decode(codewordsInts, numECCodewords);
            } catch (rse) {
                throw rse;
            }
            for (var i = 0; i < numDataCodewords; i++) {
                codewordBytes[i] = codewordsInts[i];
            }
        },

        //解析内容
        parseSource: function () {
            var indicator, mode, len;
            if (this.bitSource.available() < 4) {
                this.decode_utf8();
            } else {
                indicator = this.bitSource.readMode();
                mode = Decode.MODE_TABLE[indicator].type;

                switch (mode) {
                    case 'TERMINATOR':
                        this.decode_utf8();
                        break;
                    case 'STRUCTURED_APPEND':
                        break;
                    case 'FNC1_FIRST_POSITION':
                        break;
                    case 'FNC1_SECOND_POSITION':
                        break;


                    case 'ECI':
                        this.parseECI();
                        break;
                    case 'NUMERIC':
                        this.parseNumber();
                        break;
                    case 'ALPHANUMERIC':
                        this.parseAlphaNumeric();
                        break;
                    case 'BYTE':
                        this.parseByte();
                        break;
                    case 'KANJI':
                        this.parseKanji();
                        break;
                    case 'HANZI':
                        this.parseHanzi();
                        break;
                }
            }
        },
        getModeLength : function(indicator){
            return this.bitSource.readBits(Decode.MODE_TABLE[indicator].length[this.dataLengthMode]);
        },

        //ECI 		0111
        parseECI: function () {

        },

        //数字	 	0001
        //数字分成3个一组转为10位二进制
        //不足3位的时候 2位转成7位二进制 1位转为4位二进制
        parseNumber: function () {
            var length = this.getModeLength(0x01);
            var result = "";
            var num;
            while (length >= 3) {
                if (this.bitSource.available() < 10) {
                    throw "parseNumber : length not enough";
                }
                //3位数最大999
                num = this.bitSource.readBits(10);
                if (num >= 1000) {
                    throw "parseNumber : large then 1000";
                }
                result += num;

                length -= 3;
            }

            if (length == 2) {
                if (this.bitSource.available() < 7) {
                    throw "parseNumber : length not enough";
                }
                //3位数最大999
                num = this.bitSource.readBits(7);
                if (num >= 100) {
                    throw "parseNumber : large then 100";
                }
                result += num;
            } else if (length == 1) {
                if (this.bitSource.available() < 4) {
                    throw "parseNumber : length not enough";
                }
                //3位数最大999
                num = this.bitSource.readBits(4);
                if (num >= 10) {
                    throw "parseNumber : large then 10";
                }
                result += num;
            }
            return result;
        },

        //字母数字 	0010
        //总字符数共45个
        //字母数字模式将2个分成一组，首位乘以45加上第二位， 转为11位二进制
        //不足2位转为6位2进制
        parseAlphaNumeric: function (fc1InEffect) {
            var length = this.getModeLength(0x02);
            var result = [];
            var bit;
            while (length >= 2) {
                if (this.bitSource.available() < 11) {
                    throw "parseAlphaNumeric : length not enough";
                }
                bit = this.bitSource.readBits(11);
                result.push(Decode.ALPHANUMERIC[((bit / 45) | 0)]);
                result.push(Decode.ALPHANUMERIC[bit % 45]);
            }

            if (length == 1) {
                result.push(Decode.ALPHANUMERIC[this.bitSource.readBits(6)]);
            }

            if (fc1InEffect) {
                // We need to massage the result a bit if in an FNC1 mode:
                for (var i = 0; i < result.length; i++) {
                    if (result[i] == '%') {
                        if (i < result.length - 1 && result[i + 1] == '%') {
                            // %% is rendered as %
                            result.splice(i + 1, 1);
                        } else {
                            // In alpha mode, % should be converted to FNC1 separator 0x1D
                            result[i] = String.fromCharCode(0x1D)
                        }
                    }
                }
            }
            this.data += result.join('');
            this.parseSource();
        },

        //8 位字节	0100
        parseByte: function () {
            var length = this.getModeLength(0x04);
            if (length << 3 > this.bitSource.available()) {
                throw 'parseByte : length not enough';
            }
            var result = [];
            while (length) {
                result.push(String.fromCharCode(this.bitSource.readBits(8)));
                length--;
            }
            this.data += result.join('');
            this.parseSource();
        },

        //日本汉字 	1000
        parseKanji: function () {

        },

        //中国汉字	1101
        parseHanzi: function () {
            var self = this,
            // GB／T 18284-2000 6.4
            // 在中文汉字模式下, 再模式指示符之后, 字符计数指示符前, 加入中文汉字子集指示符, 其格式为4位, 指示汉字子集, 目前可选的只有0001
                charset = this.bitSource.readBits(4),
                length = this.getModeLength(0x0D),
                buffer = [], urlencodeStr;
            if (length * 13 > this.bitSource.available()) {
                throw 'parseByte : length not enough';
            }

            while (length) {
                var twoBytes = this.bitSource.readBits(13);
                var assembledTwoBytes = ((twoBytes / 0x060) << 8) | (twoBytes % 0x060);
                if (assembledTwoBytes < 0x003BF) {
                    // In the 0xA1A1 to 0xAAFE range
                    assembledTwoBytes += 0x0A1A1;
                } else {
                    // In the 0xB0A1 to 0xFAFE range
                    assembledTwoBytes += 0x0A6A1;
                }
                buffer.push((assembledTwoBytes >> 8) & 0xFF);
                buffer.push(assembledTwoBytes & 0xFF);
                length--;
            }
            //转成urlencode字符串
            urlencodeStr = buffer.map(function(v){
                return '%' + v.toString(16);
            });

            urldecode(urlencodeStr, 'GB2312', function (str) {
                self.data += str;
                self.parseSource()
            });
        }
    };
    return Decode;
});
