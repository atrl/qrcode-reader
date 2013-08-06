(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {
    function GF256(primitive) {
        this.expTable = [];
        this.logTable = [];
        var x = 1;
        for (var i = 0; i < 256; i++) {
            this.expTable[i] = x;
            x <<= 1;
            if (x >= 0x100) {
                x ^= primitive;
            }
        }
        for (var i = 0; i < 255; i++) {
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
        /**
         * 创建单项式
         * @param degree        最高项次数
         * @param coefficient   系数
         * @return {*}
         */
        buildMonomial: function (degree, coefficient) {
            if (degree < 0) {
                throw "System.ArgumentException";
            }
            if (coefficient == 0) {
                return zero;
            }
            var coefficients = new Array(degree + 1);
            for (var i = 0; i < coefficients.length; i++) coefficients[i] = 0;
            coefficients[0] = coefficient;
            return new GF256Poly(this, coefficients);
        },
        exp: function (a) {
            return this.expTable[a];
        },
        log: function (a) {
            if (a == 0) {
                throw "System.ArgumentException";
            }
            return this.logTable[a];
        },
        inverse: function (a) {
            if (a == 0) {
                throw "System.ArithmeticException";
            }
            return this.expTable[255 - this.logTable[a]];
        },
        multiply: function (a, b) {
            if (a == 0 || b == 0) {
                return 0;
            }
            if (a == 1) {
                return b;
            }
            if (b == 1) {
                return a;
            }
            return this.expTable[(this.logTable[a] + this.logTable[b]) % 255];
        }
    }



    GF256.addOrSubtract = function (a, b) {
        return a ^ b;
    }

    function GF256Poly(field, coefficients) {
        if (coefficients == null || coefficients.length == 0) {
            throw "System.ArgumentException";
        }
        this.field = field;
        var coefficientsLength = coefficients.length;
        if (coefficientsLength > 1 && coefficients[0] == 0) {
            // Leading term must be non-zero for anything except the constant polynomial "0"
            var firstNonZero = 1;
            while (firstNonZero < coefficientsLength && coefficients[firstNonZero] == 0) {
                firstNonZero++;
            }
            if (firstNonZero == coefficientsLength) {
                this.coefficients = field.zero.coefficients;
            } else {
                this.coefficients = new Array(coefficientsLength - firstNonZero);
                for (var i = 0; i < this.coefficients.length; i++) this.coefficients[i] = 0;
                //Array.Copy(coefficients, firstNonZero, this.coefficients, 0, this.coefficients.length);
                for (var ci = 0; ci < this.coefficients.length; ci++) this.coefficients[ci] = coefficients[firstNonZero + ci];
            }
        } else {
            this.coefficients = coefficients;
        }

        this.zero = this.coefficients[0] == 0;
        this.degree = this.coefficients.length - 1;
    }

    GF256Poly.prototype = {
        getCoefficient: function (degree) {
            return this.coefficients[this.coefficients.length - 1 - degree];
        },
        evaluateAt: function (a) {
            if (a == 0) {
                // Just return the x^0 coefficient
                return this.getCoefficient(0);
            }
            var size = this.coefficients.length;
            if (a == 1) {
                // Just the sum of the coefficients
                var result = 0;
                for (var i = 0; i < size; i++) {
                    result = GF256.addOrSubtract(result, this.coefficients[i]);
                }
                return result;
            }
            var result2 = this.coefficients[0];
            for (var i = 1; i < size; i++) {
                result2 = GF256.addOrSubtract(this.field.multiply(a, result2), this.coefficients[i]);
            }
            return result2;
        },
        addOrSubtract: function (other) {
            if (this.field != other.field) {
                throw "GF256Polys do not have same GF256 field";
            }
            if (this.zero) {
                return other;
            }
            if (other.zero) {
                return this;
            }

            var smallerCoefficients = this.coefficients;
            var largerCoefficients = other.coefficients;
            if (smallerCoefficients.length > largerCoefficients.length) {
                var temp = smallerCoefficients;
                smallerCoefficients = largerCoefficients;
                largerCoefficients = temp;
            }
            var sumDiff = new Array(largerCoefficients.length);
            var lengthDiff = largerCoefficients.length - smallerCoefficients.length;
            // Copy high-order terms only found in higher-degree polynomial's coefficients
            //Array.Copy(largerCoefficients, 0, sumDiff, 0, lengthDiff);
            for (var ci = 0; ci < lengthDiff; ci++) sumDiff[ci] = largerCoefficients[ci];

            for (var i = lengthDiff; i < largerCoefficients.length; i++) {
                sumDiff[i] = GF256.addOrSubtract(smallerCoefficients[i - lengthDiff], largerCoefficients[i]);
            }

            return new GF256Poly(this.field, sumDiff);
        },
        multiply1: function (other) {
            if (this.field != other.field) {
                throw "GF256Polys do not have same GF256 field";
            }
            if (this.zero || other.zero) {
                return this.field.zero;
            }
            var aCoefficients = this.coefficients;
            var aLength = aCoefficients.length;
            var bCoefficients = other.coefficients;
            var bLength = bCoefficients.length;
            var product = new Array(aLength + bLength - 1);
            for (var i = 0; i < aLength; i++) {
                var aCoeff = aCoefficients[i];
                for (var j = 0; j < bLength; j++) {
                    product[i + j] = GF256.addOrSubtract(product[i + j], this.field.multiply(aCoeff, bCoefficients[j]));
                }
            }
            return new GF256Poly(this.field, product);
        },
        multiply2: function (scalar) {
            if (scalar == 0) {
                return this.field.zero;
            }
            if (scalar == 1) {
                return this;
            }
            var size = this.coefficients.length;
            var product = new Array(size);
            for (var i = 0; i < size; i++) {
                product[i] = this.field.multiply(this.coefficients[i], scalar);
            }
            return new GF256Poly(this.field, product);
        },
        multiplyByMonomial: function (degree, coefficient) {
            if (degree < 0) {
                throw "System.ArgumentException";
            }
            if (coefficient == 0) {
                return this.field.zero;
            }
            var size = this.coefficients.length;
            var product = new Array(size + degree);
            for (var i = 0; i < product.length; i++) product[i] = 0;
            for (var i = 0; i < size; i++) {
                product[i] = this.field.multiply(this.coefficients[i], coefficient);
            }
            return new GF256Poly(this.field, product);
        },
        divide: function (other) {
            if (this.field != other.field) {
                throw "GF256Polys do not have same GF256 field";
            }
            if (other.zero) {
                throw "Divide by 0";
            }

            var quotient = this.field.zero;
            var remainder = this;

            var denominatorLeadingTerm = other.getCoefficient(other.degree);
            var inverseDenominatorLeadingTerm = this.field.inverse(denominatorLeadingTerm);

            while (remainder.degree >= other.degree && !remainder.zero) {
                var degreeDifference = remainder.degree - other.degree;
                var scale = this.field.multiply(remainder.getCoefficient(remainder.degree), inverseDenominatorLeadingTerm);
                var term = other.multiplyByMonomial(degreeDifference, scale);
                var iterationQuotient = this.field.buildMonomial(degreeDifference, scale);
                quotient = quotient.addOrSubtract(iterationQuotient);
                remainder = remainder.addOrSubtract(term);
            }

            return new Array(quotient, remainder);
        }
    }

    GF256.QR_CODE_FIELD = new GF256(0x011D);
    GF256.DATA_MATRIX_FIELD = new GF256(0x012D);

    return {
        GF256 : GF256,
        GF256Poly : GF256Poly
    }
});