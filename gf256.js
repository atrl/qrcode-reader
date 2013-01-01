function GF256(primitive) {
	this.expTable = [];
	this.logTable = [];
	var x = 1;
	for(var i = 0; i < 256; i++) {
		this.expTable[i] = x;
		x <<= 1; 
		if(x >= 0x100) {
			x ^= primitive;
		}
	}
	for(var i = 0; i < 255; i++) {
		this.logTable[this.expTable[i]] = i;
	}
	var at0 = new Array(1);
	at0[0] = 0;
	this.zero = new GF256Poly(this, new Array(at0));
	var at1 = new Array(1);
	at1[0] = 1;
	this.one = new GF256Poly(this, new Array(at1));
}

GF256.prototype = {
	buildMonomial : function(degree, coefficient) {
		if(degree < 0) {
			throw "System.ArgumentException";
		}
		if(coefficient == 0) {
			return zero;
		}
		var coefficients = new Array(degree + 1);
		for(var i = 0; i < coefficients.length; i++) coefficients[i] = 0;
		coefficients[0] = coefficient;
		return new GF256Poly(this, coefficients);
	},
	exp : function(a) {
		return this.expTable[a];
	},
	log : function(a) {
		if(a == 0) {
			throw "System.ArgumentException";
		}
		return this.logTable[a];
	},
	inverse : function(a) {
		if(a == 0) {
			throw "System.ArithmeticException";
		}
		return this.expTable[255 - this.logTable[a]];
	},
	multiply : function(a, b) {
		if(a == 0 || b == 0) {
			return 0;
		}
		if(a == 1) {
			return b;
		}
		if(b == 1) {
			return a;
		}
		return this.expTable[(this.logTable[a] + this.logTable[b]) % 255];
	}
}

GF256.QR_CODE_FIELD = new GF256(0x011D);
GF256.DATA_MATRIX_FIELD = new GF256(0x012D);

GF256.addOrSubtract = function(a, b) {
	return a ^ b;
}