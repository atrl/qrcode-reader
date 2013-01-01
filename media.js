navigator.getMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
var media = {
  	init : function(video, canvas, config){
  		var self = this;
  		this.video = video;
  		this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.lastTime = new Date();
  		this.config = config;
        this.finded = false;
  		navigator.getMedia({video:true, audio:false}, function(stream){
  			self.gotStream(stream);
  		}, function(){
  			self.noStream();
  		});
  	},
  	progress : function(){
  		var self = this;
  		this.timer = setInterval(function(){
  			self.snapshot();
  		}, 1000/24);
        self.config.onStart && self.config.onStart();
  	},
    find : function(){
        var imgMatrix = new preProcess(this.getSnapshot());
        var patternInfo = new FindPattern(imgMatrix).find();
        if(patternInfo){
            ctx.fillStyle = "rgb(200,0,0)";
            ctx.arc(patternInfo.topLeft.x, patternInfo.topLeft.y, 5, 0, Math.PI*2, true);
            ctx.arc(patternInfo.topRight.x, patternInfo.topRight.y, 5, 0, Math.PI*2, true);
            ctx.arc(patternInfo.bottomLeft.x, patternInfo.bottomLeft.y, 5, 0, Math.PI*2, true);
            ctx.fill();
        }
        var qrMatrix = new Detector(imgMatrix, patternInfo).process();
        this.stopSnapshot();
        this.finded = true;
        var source = new Decode(qrMatrix).process();
    },
  	gotStream : function(stream){
  		var self = this;
		this.video.src = (window.URL || window.webkitURL).createObjectURL(stream);
		this.video.onerror = function () {
			stream.stop();
		};
		this.video.addEventListener('canplaythrough', function () {
			self.canvas.width = self.video.videoWidth * self.config.scale;
			self.canvas.height = self.video.videoHeight * self.config.scale;
            self.video.style.visibility = "hidden";
            var rect = Math.min(self.canvas.width, self.canvas.height) * self.config.rect
            self.rect = {
                x : (self.canvas.width - rect) / 2,
                y : (self.canvas.height - rect) / 2 ,
                width : rect,
                height : rect
            }
			self.progress();
		}, false);
  	},
  	noStream : function() {
		console.log('media close');
	},
    snapshot : function(){
        var self = this;
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = "#FFF";
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(this.rect.x - 4, this.rect.y - 4, this.rect.width + 4, this.rect.height + 4);

        var now = new Date();
        if(!this.finded && now - this.lastTime > 300){
            this.lastTime = now;
            requestAnimationFrame(function(){
                self.find();
            });
        }
    },
    stopSnapshot : function(){
        clearTimeout(this.timer);
    },
    getSnapshot : function(){
        return this.ctx.getImageData(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
    }
}