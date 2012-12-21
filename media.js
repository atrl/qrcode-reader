navigator.getMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
var media = {
  	init : function(video, canvas, config){
  		var self = this;
  		this.video = video;
  		this.canvas = canvas;
  		this.config = config;
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
  		}, 500);
  	},
  	gotStream : function(stream){
  		var self = this;
		this.video.src = (window.URL || window.webkitURL).createObjectURL(stream);
		this.video.onerror = function () {
			stream.stop();
		};
		this.video.addEventListener('loadedmetadata', function () {
			self.canvas.width = self.video.videoWidth * self.config.scale;
			self.canvas.height = self.video.videoHeight * self.config.scale;
			self.progress();
		}, false);
  	},
  	noStream : function() {
		console.log('media close');
	},
	snapshot : function(){
		this.canvas.getContext('2d').drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
		this.config.onSnapshot(this.canvas);
	}
}