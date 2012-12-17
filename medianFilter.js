//中值滤波
//http://blog.csdn.net/hhygcy/article/details/4325462
function medianFilter(imgData, width, height){
	//复制一份
	var bakData = [].slice.call(imgData.data, 0);
	width *= 4;

	//过滤边界
	for(var j = 1; j < height - 1; j++){
		for(var i = 4; i < width - 4; i+=4){
			var k = 0;
			var arr = [];//3*3
			var average = 0;
			for(var jj = j - 1; jj < j+2; ++jj){
				for(var ii = i - 4; ii < i +8; ii+=4){
					arr[k++] = bakData[jj * width + ii];
				}
			}

			arr.sort();

			imgData.data[j * width + i] = arr[4];
			imgData.data[j * width + i + 1] = arr[4];
			imgData.data[j * width + i + 2] = arr[4];
		}
	}
}
