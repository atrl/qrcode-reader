var Decode = function(bitMatrix){
	this.bitMatrix = bitMatrix;
}

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
	0x2EDA, 0x2BED,
];

//18位版本信息 从000111 到 101000
//前6位表示版本
Decode.VERSIONINFO = [	
	0x07C94, 0x085BC, 0x09A99, 0x0A4D3, 0x0BBF6,
	0x0C762, 0x0D847, 0x0E60D, 0x0F928, 0x10B78,
	0x1145D, 0x12A17, 0x13532, 0x149A6, 0x15683,
	0x168C9, 0x177EC, 0x18EC4, 0x191E1, 0x1AFAB,
	0x1B08E, 0x1CC1A, 0x1D33F, 0x1ED75, 0x1F250,
	0x209D5, 0x216F0, 0x228BA, 0x2379F, 0x24B0B,
	0x2542E, 0x26A64, 0x27541, 0x28C69
];
//纠错等级表
Decode.ECL_TABLE = {
	1 : 'L',
	0 : 'M',
	3 : 'Q',
	2 : 'H'
};
Decode.VERSION_TABLE = [
	{ 
		aLigmentPattern : [], 
		L : [1, 26, 19], 
		M : [1, 26, 16], 
		Q : [1, 26, 13], 
		H : [1, 26, 9]
	},{ 
		aLigmentPattern : [6, 18],
		L : [1, 44, 34],
		M : [1, 44, 28],
		Q : [1, 44, 22],
		H : [1, 44, 16]
	},{ 
		aLigmentPattern : [6, 22], 
		L : [1, 70, 55], 
		M : [1, 70, 44], 
		Q : [2, 35, 17], 
		H : [2, 35, 13]
	},{ 
		aLigmentPattern : [6, 26], 
		L : [1, 100, 80], 
		M : [2, 50, 32],
		Q : [2, 50, 24], 
		H : [4, 25, 9]
	},{ 
		aLigmentPattern : [6, 30], 
		L : [1, 134, 108],
		M : [2, 67, 43], 
		Q : [2, 33, 15, 2, 34, 16], 
		H : [2, 33, 11, 2, 34, 12]
	},{ 
		aLigmentPattern : [6, 34], 
		L : [2, 86, 68], 
		M : [4, 43, 27], 
		Q : [4, 43, 19], 
		H : [4, 43, 15]
	},{ 
		aLigmentPattern : [6, 22, 38], 
		L : [2, 98, 78], 
		M : [4, 49, 31], 
		Q : [2, 32, 14, 4, 33, 15], 
		H : [4, 39, 13, 1, 40, 14]
	},{ 
		aLigmentPattern : [6, 24, 42], 
		L : [2, 121, 97], 
		M : [2, 60, 38, 2, 61, 39], 
		Q : [4, 40, 18, 2, 41, 19], 
		H : [4, 40, 14, 2, 41, 15]
	},{ 
		aLigmentPattern : [6, 26, 46], 
		L : [2, 146, 116], 
		M : [3, 58, 36, 2, 59, 37], 
		Q : [4, 36, 16, 4, 37, 17], 
		H : [4, 36, 12, 4, 37, 13]
	},{ 
		aLigmentPattern : [6, 28, 50], 
		L : [2, 86, 68, 2, 87, 69], 
		M : [4, 69, 43, 1, 70, 44], 
		Q : [6, 43, 19, 2, 44, 20], 
		H : [6, 43, 15, 2, 44, 16]
	},{ 
		aLigmentPattern : [6, 30, 54], 
		L : [4, 101, 81], 
		M : [1, 80, 50, 4, 81, 51], 
		Q : [4, 50, 22, 4, 51, 23], 
		H : [3, 36, 12, 8, 37, 13]
	},{ 
		aLigmentPattern : [6, 32, 58], 
		L : [2, 116, 92, 2, 117, 93], 
		M : [6, 58, 36, 2, 59, 37], 
		Q : [4, 46, 20, 6, 47, 21], 
		H : [7, 42, 14, 4, 43, 15]
	},{ 
		aLigmentPattern : [6, 34, 62], 
		L : [4, 133, 107], 
		M : [8, 59, 37, 1, 60, 38], 
		Q : [8, 44, 20, 4, 45, 21], 
		H : [12, 33, 11, 4, 34, 12]
	},{ 
		aLigmentPattern : [6, 26, 46, 66], 
		L : [3, 145, 115, 1, 146, 116], 
		M : [4, 64, 40, 5, 65, 41], 
		Q : [11, 36, 16, 5, 37, 17], 
		H : [11, 36, 12, 5, 37, 13]
	},{ 
		aLigmentPattern : [6, 26, 48, 70], 
		L : [5, 109, 87, 1, 110, 88], 
		M : [5, 65, 41, 5, 66, 42], 
		Q : [5, 54, 24, 7, 55, 25], 
		H : [11, 36, 12]
	},{ 
		aLigmentPattern : [6, 26, 50, 74], 
		L : [5, 122, 98, 1, 123, 99], 
		M : [7, 73, 45, 3, 74, 46], 
		Q : [15, 43, 19, 2, 44, 20], 
		H : [3, 45, 15, 13, 46, 16]
	},{ 
		aLigmentPattern : [6, 30, 54, 78], 
		L : [1, 135, 107, 5, 136, 108], 
		M : [10, 74, 46, 1, 75, 47], 
		Q : [1, 50, 22, 15, 51, 23], 
		H : [2, 42, 14, 17, 43, 15]
	},{ 
		aLigmentPattern : [6, 30, 56, 82], 
		L : [5, 150, 120, 1, 151, 121], 
		M : [9, 69, 43, 4, 70, 44], 
		Q : [17, 50, 22, 1, 51, 23], 
		H : [2, 42, 14, 19, 43, 15]
	},{ 
		aLigmentPattern : [6, 30, 58, 86], 
		L : [3, 141, 113, 4, 142, 114], 
		M : [3, 70, 44, 11, 71, 45], 
		Q : [17, 47, 21, 4, 48, 22], 
		H : [9, 39, 13, 16, 40, 14]
	},{ 
		aLigmentPattern : [6, 34, 62, 90], 
		L : [3, 135, 107, 5, 136, 108], 
		M : [3, 67, 41, 13, 68, 42], 
		Q : [15, 54, 24, 5, 55, 25], 
		H : [15, 43, 15, 10, 44, 16]
	},{ 
		aLigmentPattern : [6, 28, 50, 72, 94], 
		L : [4, 144, 116, 4, 145, 117], 
		M : [17, 68, 42], 
		Q : [17, 50, 22, 6, 51, 23], 
		H : [19, 46, 16, 6, 47, 17]
	},{ 
		aLigmentPattern : [6, 26, 50, 74, 98], 
		L : [2, 139, 111, 7, 140, 112], 
		M : [17, 74, 46], 
		Q : [7, 54, 24, 16, 55, 25], 
		H : [34, 37, 13]
	},{ 
		aLigmentPattern : [6, 30, 54, 78, 102], 
		L : [4, 151, 121, 5, 152, 122], 
		M : [4, 75, 47, 14, 76, 48], 
		Q : [11, 54, 24, 14, 55, 25], 
		H : [16, 45, 15, 14, 46, 16]
	},{ 
		aLigmentPattern : [6, 28, 54, 80, 106], 
		L : [6, 147, 117, 4, 148, 118], 
		M : [6, 73, 45, 14, 74, 46], 
		Q : [11, 54, 24, 16, 55, 25], 
		H : [30, 46, 16, 2, 47, 17]
	},{ 
		aLigmentPattern : [6, 32, 58, 84, 110], 
		L : [8, 132, 106, 4, 133, 107], 
		M : [8, 75, 47, 13, 76, 48], 
		Q : [7, 54, 24, 22, 55, 25], 
		H : [22, 45, 15, 13, 46, 16]
	},{ 
		aLigmentPattern : [6, 30, 58, 86, 114], 
		L : [10, 142, 114, 2, 143, 115], 
		M : [19, 74, 46, 4, 75, 47], 
		Q : [28, 50, 22, 6, 51, 23], 
		H : [33, 46, 16, 4, 47, 17]
	},{ 
		aLigmentPattern : [6, 34, 62, 90, 118], 
		L : [8, 152, 122, 4, 153, 123], 
		M : [22, 73, 45, 3, 74, 46], 
		Q : [8, 53, 23, 26, 54, 24], 
		H : [12, 45, 15, 28, 46, 16]
	},{ 
		aLigmentPattern : [6, 26, 50, 74, 98, 122], 
		L : [3, 147, 117, 10, 148, 118], 
		M : [3, 73, 45, 23, 74, 46], 
		Q : [4, 54, 24, 31, 55, 25], 
		H : [11, 45, 15, 31, 46, 16]
	},{ 
		aLigmentPattern : [6, 30, 54, 78, 102, 126], 
		L : [7, 146, 116, 7, 147, 117], 
		M : [21, 73, 45, 7, 74, 46], 
		Q : [1, 53, 23, 37, 54, 24], 
		H : [19, 45, 15, 26, 46, 16]
	},{ 
		aLigmentPattern : [6, 26, 52, 78, 104, 130], 
		L : [5, 145, 115, 10, 146, 116], 
		M : [19, 75, 47, 10, 76, 48], 
		Q : [15, 54, 24, 25, 55, 25], 
		H : [23, 45, 15, 25, 46, 16]
	},{ 
		aLigmentPattern : [6, 30, 56, 82, 108, 134], 
		L : [13, 145, 115, 3, 146, 116], 
		M : [2, 74, 46, 29, 75, 47], 
		Q : [42, 54, 24, 1, 55, 25], 
		H : [23, 45, 15, 28, 46, 16]
	},{ 
		aLigmentPattern : [6, 34, 60, 86, 112, 138], 
		L : [17, 145, 115], 
		M : [10, 74, 46, 23, 75, 47], 
		Q : [10, 54, 24, 35, 55, 25], 
		H : [19, 45, 15, 35, 46, 16]
	},{ 
		aLigmentPattern : [6, 30, 58, 86, 114, 142], 
		L : [17, 145, 115, 1, 146, 116], 
		M : [14, 74, 46, 21, 75, 47], 
		Q : [29, 54, 24, 19, 55, 25], 
		H : [11, 45, 15, 46, 46, 16]
	},{ 
		aLigmentPattern : [6, 34, 62, 90, 118, 146], 
		L : [13, 145, 115, 6, 146, 116], 
		M : [14, 74, 46, 23, 75, 47], 
		Q : [44, 54, 24, 7, 55, 25], 
		H : [59, 46, 16, 1, 47, 17]
	},{ 
		aLigmentPattern : [6, 30, 54, 78, 102, 126, 150], 
		L : [12, 151, 121, 7, 152, 122], 
		M : [12, 75, 47, 26, 76, 48], 
		Q : [39, 54, 24, 14, 55, 25], 
		H : [22, 45, 15, 41, 46, 16]
	},{ 
		aLigmentPattern : [6, 24, 50, 76, 102, 128, 154], 
		L : [6, 151, 121, 14, 152, 122], 
		M : [6, 75, 47, 34, 76, 48], 
		Q : [46, 54, 24, 10, 55, 25], 
		H : [2, 45, 15, 64, 46, 16]
	},{ 
		aLigmentPattern : [6, 28, 54, 80, 106, 132, 158], 
		L : [17, 152, 122, 4, 153, 123], 
		M : [29, 74, 46, 14, 75, 47], 
		Q : [49, 54, 24, 10, 55, 25], 
		H : [24, 45, 15, 46, 46, 16]
	},{ 
		aLigmentPattern : [6, 32, 58, 84, 110, 136, 162], 
		L : [4, 152, 122, 18, 153, 123], 
		M : [13, 74, 46, 32, 75, 47], 
		Q : [48, 54, 24, 14, 55, 25], 
		H : [42, 45, 15, 32, 46, 16]
	},{ 
		aLigmentPattern : [6, 26, 54, 82, 110, 138, 166], 
		L : [20, 147, 117, 4, 148, 118], 
		M : [40, 75, 47, 7, 76, 48], 
		Q : [43, 54, 24, 22, 55, 25], 
		H : [10, 45, 15, 67, 46, 16]
	},{ 
		aLigmentPattern : [6, 30, 58, 86, 114, 142, 170],
		L : [19, 148, 118, 6, 149, 119], 
		M : [18, 75, 47, 31, 76, 48], 
		Q : [34, 54, 24, 34, 55, 25], 
		H : [20, 45, 15, 61, 46, 16]
	}
];

//用于计算差异
//Offset i holds the number of 1 bits in the binary representation of i
Decode.BITS_SET_IN_HALF_BYTE = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
Decode.numBitsDiffering = function(a, b){
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
}

Decode.prototype = {

	process : function(){
		this.version = this.getVersionInfo();
		this.dimension = this.version * 4 + 17;
		this.formatinfo = this.getFormatInfo();
		this.codeWord = this.getCodeWord();


	},

	/**
	 * 获取掩模图形在(x, y)坐标的掩模状态
	 * @param  {string} maskPattern 掩模图形类型
	 * @param  {int} 	x           x坐标
	 * @param  {int} 	y           y坐标
	 * @return {boolean}            是否掩模
	 */
	getMask : function(maskPattern, x, y) {
		switch (maskPattern) {		    
			case 0 : return (x + y) % 2 == 0;
			case 1 : return y % 2 == 0;
			case 2 : return x % 3 == 0;
			case 3 : return (x + y) % 3 == 0;
			case 4 : return ( Math.floor(y / 2) + Math.floor(x / 3) ) % 2 == 0;
			case 5 : return (x * y) % 2 + (x * y) % 3 == 0;
			case 6 : return ( (x * y) % 2 + (x * y) % 3 ) % 2 == 0;
			case 7 : return ( (x * y) % 3 + (x + y) % 2 ) % 2 == 0;
			default :
			    throw "error maskPattern:" + maskPattern;
		}
	},
	/**
	 * 获取格式信息 直接使用掩模后的格式信息查表
	 * 格式信息的第一位是最低位
	 * @return {json} 返回错误等级和掩模图形
	 */
	getFormatInfo : function(){
		//位置探测图形topleft 周围15位获取格式信息
		var maskedFormatInfo1 = 0;
		var x,
			y,
			bitIndex = 0;
		for(y = 0; y <= 5; y++, bitIndex++){
			maskedFormatInfo1 += this.bitMatrix.get(8, y) << bitIndex;
		}
		maskedFormatInfo1 += this.bitMatrix.get(8, 7) << (bitIndex++);
		maskedFormatInfo1 += this.bitMatrix.get(8, 8) << (bitIndex++);
		maskedFormatInfo1 += this.bitMatrix.get(7, 8) << (bitIndex++);

		for(x = 5; x >= 0; x--, bitIndex++){
			maskedFormatInfo1 += this.bitMatrix.get(x, 8) << bitIndex;
		}

		//获取由另外2条bit组成的格式信息
		var maskedFormatInfo2 = 0;
		var dimension = this.bitMatrix.height;
		bitIndex = 0;
		for(x = dimension - 1; x >= dimension - 7; x--, bitIndex++){
			maskedFormatInfo2 += this.bitMatrix.get(x, 8) << bitIndex;
		}

		for(y = dimension - 8; y <= dimension - 1; y++, bitIndex++){
			maskedFormatInfo2 += this.bitMatrix.get(8, y) << bitIndex;
		}
		console.log(maskedFormatInfo1.toString(2))
		console.log(maskedFormatInfo2.toString(2))
		//从编码后的格式信息列表中寻找一样的格式信息
		var bestFormatInfo, bestDifference;
		for(var i = 0, targetFormatInfo; targetFormatInfo = Decode.FORMATINFO[i]; i++){
			//格式信息在格式信息表里面停止查找
			if(maskedFormatInfo1 == targetFormatInfo || maskedFormatInfo2 == targetFormatInfo){
				bestFormatInfo = i;
				bestDifference = 0;
				break;
			}

			//对格式信息不在格式信息表里面的计算差异
			bitsDifference = Decode.numBitsDiffering(maskedFormatInfo1, targetFormatInfo);
			if(bitsDifference < bestDifference){
				bestFormatInfo = I;
				bestDifference = bitsDifference;
			}
			//对于2个格式信息不一致的 从2个中找到最优的
			if(maskedFormatInfo1 != maskedFormatInfo2){
				bitsDifference = Decode.numBitsDiffering(maskedFormatInfo2, targetFormatInfo);
				if (bitsDifference < bestDifference) {
					bestFormatInfo = i;
					bestDifference = bitsDifference;
				}
			}
		}
		//Hamming distance of the 32 masked codes is 7, by construction, so <= 3 bits differing means we found a match
		if (bestDifference <= 3) {
			var formatInfoBit = bestFormatInfo.toString(2)
			return {
				//纠错等级
				errorCorrectionLevel : parseInt(formatInfoBit.substring(0, 2), 2),
				//掩模图形
				maskPattern : parseInt(formatInfoBit.substring(2, 5), 2)
			}
		}
		throw 'error formatinfo'
	},
	/**
	 * 获取版本信息 查水表
	 * 版本信息的第一位是最高位 冏 与格式信息相反
	 * @return {json} 版本信息
	 */
	getVersionInfo : function(){
		var dimension = this.bitMatrix.height;
		var version = (dimension - 17 >> 2);
		//版本号小于7没有版本信息
		if(version <= 6){
			return version;
		}

		var x, y, bitIndex = 0;
		var versionInfo1 = 0;
		//topright的版本信息
		for(var y = 5; y >= 0; y--){
			for(x = dimension - 9; x >= dimension - 11; x--, bitIndex++){
				versionInfo1 += this.bitMatrix.get(x, y) << bitIndex;
			}
		}

		//bottomleft的版本信息
		bitIndex = 0;
		var versionInfo2 = 0;
		for(x = 5; x >= 0; x--){
			for(y = dimension - 9; y >= dimension - 11; y--, bitIndex++){
				versionInfo2 += this.bitMatrix.get(x, y) << bitIndex;
			}
		}

		//从编码后的格式信息列表中寻找一样的格式信息
		var bestVersion, bestDifference;
		for(var i = 0, targetVersionInfo; targetVersionInfo = Decode.VERSIONINFO[i]; i++){
			//格式信息在格式信息表里面停止查找
			if(versionInfo1 == targetVersionInfo || versionInfo2 == targetVersionInfo){
				bestVersion = i + 7;
				bestDifference = 0;
				break;
			}

			//对格式信息不在格式信息表里面的计算差异
			bitsDifference = Decode.numBitsDiffering(versionInfo1, targetVersionInfo);
			if(bitsDifference < bestDifference){
				bestVersion = i + 7;
				bestDifference = bitsDifference;
			}
			//对于2个版本信息不一致的 从2个中找到最优的
			if(versionInfo1 != versionInfo2){
				bitsDifference = Decode.numBitsDiffering(versionInfo2, targetVersionInfo);
				if (bitsDifference < bestDifference) {
					bestVersion = i + 7;
					bestDifference = bitsDifference;
				}
			}
		}
		if (bestDifference <= 3) {
			return {
				version : bestVersion
			}
		}
		throw 'error version'
	},

	//解析bitmatrix获取ECbBlocks的数据
	getCodeWord : function(){
		//过滤功能图形 function pattern 直接设置null 读取时遇到null的直接continue
		//过滤位置探测图形
		this.clearFinderPattern(0, 0);
		this.clearFinderPattern(this.dimension - 7, 0);
		this.clearFinderPattern(0, this.dimension - 7);
		//过滤校验图形
		this.clearALigmentPattern();
		//过滤定位图形
		this.clearTimingPattern();
		//过滤格式信息
		this.clearFormatInfo();
		if(this.version >=7){
			//过滤版本信息
			this.clearVersionInfo();
		}
		var codeWord = [];
		var arrow = -1;
		var bitIndex = 7;
		var byteIndex = 0;
		var y = this.dimension - 1;
		var bit;
		this.totalCodeWord = this.getTotalCodeWord();
		//
		loopX : for(var x = this.dimension - 1; x > 0; x -=2){
			//第7列是位置探测图形和定位图形 不存在数据 
			//同时修正x坐标
			if(x == 6) x--;
			loopY : for(; y >= 0 && y < this.dimension; y += arrow){
				for(var i = 0; i < 2; i ++){
					if( ( bit = this.bitMatrix.get(x - i, y) ) != null ){
						codeWord[byteIndex] || (codeWord[byteIndex] = 0);
						codeWord[byteIndex] += (bit ^ this.getMask(this.formatinfo.maskPattern, x - i, y)) << bitIndex;
						bitIndex--;
						if(bitIndex == -1){
							byteIndex++;
							bitIndex = 7;

							//计算数据位已达到容量
							if(this.totalCodeWord == byteIndex){
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
	getTotalCodeWord : function(){
		var total = 0;
		var ecbArray = Decode.VERSION_TABLE[this.version - 1][Decode.ECL_TABLE[this.formatinfo.errorCorrectionLevel]];
		for (var i = 0;i < ecbArray.length; i+= 3) {
          	total += ecbArray[i] * (ecbArray[i + 1]);
        }
        return total;
	},

	//清理位置探测图形
	clearFinderPattern : function(row, col){
		for (var r = -1; r <= 7; r++) {
			if (row + r <= -1 || this.dimension <= row + r) continue;
			for (var c = -1; c <= 7; c++) {
				if (col + c <= -1 || this.dimension <= col + c) continue;
				this.bitMatrix.set(col + c,row + r, null);
			}		
		}		
	},

	//清理校验图形
	clearALigmentPattern : function(){
		var aLigmentPattern = Decode.VERSION_TABLE[this.version - 1].aLigmentPattern;
		for (var y = 0; y < aLigmentPattern.length; y++) {		
			for (var x = 0; x < aLigmentPattern.length; x++) {
				//位置探测图形周围没有校验图形
				if(
					(x == 0 && y == 0) || 
					(x == 0 && y == aLigmentPattern.length - 1) ||
					(x == aLigmentPattern.length - 1 && y == 0)
				){
                  continue;
                }
				var row = aLigmentPattern[y];
				var col = aLigmentPattern[x];			
				for (var r = -2; r <= 2; r++) {
					for (var c = -2; c <= 2; c++) {
						this.bitMatrix.set(col + c,row + r, null);
					}
				}
			}
		}
	},

	//清理定位图形
	clearTimingPattern : function() {
		for (var i = 8; i < this.dimension - 8; i++) {
			this.bitMatrix.set(i, 6, null);
			this.bitMatrix.set(6, i, null);
		}
	},

	//清理格式信息
	clearFormatInfo : function(){
		var x, y, bitIndex = 0;

		for(y = 0; y <= 5; y++, bitIndex++){
			this.bitMatrix.set(8, y, null);
		}
		this.bitMatrix.set(8, 7, null);
		this.bitMatrix.set(8, 8, null);
		this.bitMatrix.set(7, 8, null);

		for(x = 5; x >= 0; x--, bitIndex++){
			this.bitMatrix.set(x, 8, null);
		}

		for(x = this.dimension - 1; x >= this.dimension - 8; x--){
			this.bitMatrix.set(x, 8, null);
		}

		for(y = this.dimension - 8; y <= this.dimension - 1; y++){
			this.bitMatrix.set(8, y, null);
		}
	},

	//清理版本信息
	clearVersionInfo : function(){
		for(var y = 5; y >= 0; y--){
			for(x = this.dimension - 9; x >= this.dimension - 11; x--){
				this.bitMatrix.set(x, y, null);
			}
		}
		for(x = 5; x >= 0; x--){
			for(y = this.dimension - 9; y >= this.dimension - 11; y--){
				this.bitMatrix.set(x, y, null);
			}
		}
	},

	//ECI 		0111
	parseECI : function(){

	},

	//数字	 	0001
	parseNumber : function(){

	},

	//字母数字 	0010
	parseAlphaNumeric : function(){

	},

	//8 位字节	0100
	parseByte : function(){

	},

	//日本汉字 	1000
	parseKanji : function(){

	},

	//中国汉字	1101
	parseGB2312 : function(){

	}
}
