//二值化
// //http://blog.csdn.net/hhygcy/article/details/4280165
// function binarization(imgData, width, height){
// 	var bakData = [].slice.call(imgData.data, 0);
// 	var S = width >> 3;
// 	var T = 15;
// 	var integralImg = 0;
// 	var i , j;
// 	var sum = 0;
// 	var count = 0;
// 	var index;
// 	var x1, y1, x2, y2;
// 	var s2 = S / 2;

// 	//Summed-Area Table
// 	integralImg = [];

// 	for(i = 0; i < width; i++){
// 		sum = 0;
// 		for(j = 0; j < height; j++){
// 			index = j * width + i;
// 			sum += bakData[j * width * 4 + i * 4];
// 			if(i == 0){
// 				integralImg[index] = sum;
// 			}else{
// 				integralImg[index] = integralImg[index - 1] + sum;
// 			}
// 		}
// 	}

// 	for(i = 0; i < width; i++){
// 		for(j = 0 ; j < height; j++){
// 			index = j * width * 4 + i * 4;
// 			x1 = i - s2;
// 			x2 = i + s2;
// 			y1 = j - s2; 
// 			y2 = j + s2;

// 			if (x1 < 0) x1 = 0;  
//             if (x2 >= width) x2 = width - 1;
//             if (y1 < 0) y1 = 0;  
//             if (y2 >= height) y2 = height - 1;

//             count = (x2 - x1) * (y2 - y1);  
//             sum = integralImg[y2 * width + x2] -  
//                 integralImg[y1 * width + x2] -  
//                 integralImg[y2 * width + x1] +  
//                 integralImg[y1 * width + x1];  
//             if ( (bakData[index] * count) < (sum * ( 100 - T ) / 100) ){
//                 imgData.data[index] = 0;
// 	            imgData.data[index + 1] = 0;
// 	            imgData.data[index + 2] = 0;
//             }else{
//                 imgData.data[index] = 255;  
// 	            imgData.data[index + 1] = 255;  
// 	            imgData.data[index + 2] = 255;  
// 	        }
// 		}
// 	}
// 	integralImg = null;
// }


//http://vaero.blog.51cto.com/4350852/822997
//otsu
function binarization(imgData, width, height){
	var area, areaBefore = 0, areaAfter = 0; //图像总点数，前景点数， 后景点数（areaBefore + areaAfter = area） 
	var averageBefore = 0, averageBefore = 0;
	var variance = 0, varianceMax = 0;
	var sum = 0, sumBefore = 0, sumAfter = 0;
	var thresh;

	// 图象灰度直方图[0, 255] 
	var grayscaleMap = [];
	for(var i = 0; i < 256; i++){
		grayscaleMap[i] = 0;
	}

    // 统计各灰度直方图
	var i, j, k;
	for( i = 0; i < height; i++){
		for(var j = 0; j < width; j ++){
			var index = imgData.data[i * width * 4 + j * 4];
			grayscaleMap[index]++;
		}
	}

	area = width * height;
	for(k = 0; k < 256; k++){
		grayscaleMap[k] = grayscaleMap[k];//坑爹的join后是string
		sum += k * grayscaleMap[k];
	}

    // 遍历判断最大类间方差，得到最佳阈值 
	for(k = 0; k < 256; k++){
		//图像前景点数
		areaBefore += grayscaleMap[k];

		// 未获取前景，直接继续增加前景点数 
		if( 0 == areaBefore){
			continue;
		}

		// 前景点数包括了全部时，不可能再增加，退出循环 
		if( area == areaBefore){
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

	var bitmap = [];
	for(i = 0; i < height; i++){
		for(j = 0; j < width; j++){
			var index = i * width * 4 + j * 4;
			if(imgData.data[index] >= thresh){
				bitmap[i * width + j] = 0;
				imgData.data[index] = 255;
				imgData.data[index + 1] = 255;
				imgData.data[index + 2] = 255;
			}else{
				bitmap[i * width + j] = 1;
				imgData.data[index] = 0;
				imgData.data[index + 1] = 0;
				imgData.data[index + 2] = 0;
			}
			
		}
	}
	bitmap.width = width;
	bitmap.height = height;
	bitmap.get = function(x, y){
		return this.width * y + x;
	}
	return bitmap;
}
