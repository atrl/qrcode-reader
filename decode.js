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

//纠错等级表
Decode.ECL_TABLE = {
	1 : 'L',
	0 : 'M',
	3 : 'Q',
	2 : 'H'
};

//模式指示符
Decode.MODE_TABLE = {
	0x00 : {
		type : 'TERMINATOR',
		length : [0, 0, 0]
	},
	0x01 : {
		type : 'NUMERIC',
		length : [10, 12, 14]
	},
	0x02 : {
		type : 'ALPHANUMERIC',
		length : [9, 11, 13]
	},
	0x03 : {
		type : 'STRUCTURED_APPEND',
		length : [0, 0, 0]
	},
	0x04 : {
		type : 'BYTE',
		length : [8, 16, 16]
	},
	0x07 : {
		type : 'ECI',
		length : null
	},
	0x08 : {
		type : 'KANJI',
		length : [8, 10, 12]
	},
	0x05 : {
		tpye : 'FNC1_FIRST_POSITION',
		length : null
	},
	0x09 : {
		type : 'FNC1_SECOND_POSITION',
		length : null
	},
	0x0D : {
		type : 'HANZI',
		length : [8, 10, 12]
	}
}

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

		this.bitSource = new BitSource(this.codeWord);
		this.source = this.parseSource();

		console.log(this.source);
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
		for(var i = 0, targetVersionInfo; targetVersionInfo = version.VERSIONINFO[i]; i++){
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
		var ecbArray = version.VERSION_TABLE[this.version - 1][Decode.ECL_TABLE[this.formatinfo.errorCorrectionLevel]];
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
		var aLigmentPattern = version.VERSION_TABLE[this.version - 1].aLigmentPattern;
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

	//解析内容
	parseSource : function(){
		var mode, length;
		var data = '';
		if (this.version <= 9)
			this.dataLengthMode = 0;
		else if (this.version >= 10 && this.version <= 26)
			this.dataLengthMode = 1;
		else if (this.version >= 27 && this.version <= 40)
			this.dataLengthMode = 2;

		do{
			mode = this.bitSource.readBits(4);
			switch(Decode.MODE_TABLE[mode].type){
				case 'TERMINATOR':
					break;
				case 'NUMERIC':
					break;
				case 'ALPHANUMERIC':
					break;
				case 'STRUCTURED_APPEND':
					break;
				case 'BYTE':
					data += this.parseByte();
					break;
				case 'ECI':
					break;
				case 'KANJI':
					break;
				case 'FNC1_FIRST_POSITION':
					break;
				case 'FNC1_SECOND_POSITION':
					break;
				case 'HANZI':
					break;
			}
		}while(mode == 'TERMINATOR');

		return data;
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
		var length = this.bitSource.readBits(Decode.MODE_TABLE[0x04].length[this.dataLengthMode]);
		var result = [];
		while(length){
			result.push(String.fromCharCode(this.bitSource.readBits(8)));
			length--;
		}
		return result.join('');
	},

	//日本汉字 	1000
	parseKanji : function(){

	},

	//中国汉字	1101
	parseHanzi : function(){

	}
}
