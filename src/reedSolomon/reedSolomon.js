(function (definition) {
    if (typeof define == 'function') define(definition);
    else if (typeof module != 'undefined') module.exports = definition(require, module.exports, module);
})(function (require, exports, module) {

    var GF = require('./gf');
    var GF256 = GF.GF256;
    var GF256Poly = GF.GF256Poly;

    function ReedSolomonDecoder(field) {
        this.field = field;
    }

    ReedSolomonDecoder.prototype = {
        decode: function (received, twoS) {
            var poly = new GF256Poly(this.field, received);
            var syndromeCoefficients = new Array(twoS);
            for (var i = 0; i < syndromeCoefficients.length; i++) syndromeCoefficients[i] = 0;
            var dataMatrix = false; //this.field.Equals(GF256.DATA_MATRIX_FIELD);
            var noError = true;
            for (var i = 0; i < twoS; i++) {
                // Thanks to sanfordsquires for this fix:
                var eval = poly.evaluateAt(this.field.exp(dataMatrix ? i + 1 : i));
                syndromeCoefficients[syndromeCoefficients.length - 1 - i] = eval;
                if (eval != 0) {
                    noError = false;
                }
            }
            if (noError) {
                return;
            }
            var syndrome = new GF256Poly(this.field, syndromeCoefficients);
            var sigmaOmega = this.runEuclideanAlgorithm(this.field.buildMonomial(twoS, 1), syndrome, twoS);
            var sigma = sigmaOmega[0];
            var omega = sigmaOmega[1];
            var errorLocations = this.findErrorLocations(sigma);
            var errorMagnitudes = this.findErrorMagnitudes(omega, errorLocations, dataMatrix);
            for (var i = 0; i < errorLocations.length; i++) {
                var position = received.length - 1 - this.field.log(errorLocations[i]);
                if (position < 0) {
                    throw "ReedSolomonException Bad error location";
                }
                received[position] = GF256.addOrSubtract(received[position], errorMagnitudes[i]);
            }
        },
        runEuclideanAlgorithm: function (a, b, R) {
            // Assume a's degree is >= b's
            if (a.degree < b.degree) {
                var temp = a;
                a = b;
                b = temp;
            }

            var rLast = a;
            var r = b;
            var sLast = this.field.one;
            var s = this.field.zero;
            var tLast = this.field.zero;
            var t = this.field.one;

            // Run Euclidean algorithm until r's degree is less than R/2
            while (r.degree >= Math.floor(R / 2)) {
                var rLastLast = rLast;
                var sLastLast = sLast;
                var tLastLast = tLast;
                rLast = r;
                sLast = s;
                tLast = t;

                // Divide rLastLast by rLast, with quotient in q and remainder in r
                if (rLast.zero) {
                    // Oops, Euclidean algorithm already terminated?
                    throw "r_{i-1} was zero";
                }
                r = rLastLast;
                var q = this.field.zero;
                var denominatorLeadingTerm = rLast.getCoefficient(rLast.degree);
                var dltInverse = this.field.inverse(denominatorLeadingTerm);
                while (r.degree >= rLast.degree && !r.zero) {
                    var degreeDiff = r.degree - rLast.degree;
                    var scale = this.field.multiply(r.getCoefficient(r.degree), dltInverse);
                    q = q.addOrSubtract(this.field.buildMonomial(degreeDiff, scale));
                    r = r.addOrSubtract(rLast.multiplyByMonomial(degreeDiff, scale));
                    //r.EXE();
                }

                s = q.multiply1(sLast).addOrSubtract(sLastLast);
                t = q.multiply1(tLast).addOrSubtract(tLastLast);
            }

            var sigmaTildeAtZero = t.getCoefficient(0);
            if (sigmaTildeAtZero == 0) {
                throw "ReedSolomonException sigmaTilde(0) was zero";
            }

            var inverse = this.field.inverse(sigmaTildeAtZero);
            var sigma = t.multiply2(inverse);
            var omega = r.multiply2(inverse);
            return new Array(sigma, omega);
        },
        findErrorLocations: function (errorLocator) {
            // This is a direct application of Chien's search
            var numErrors = errorLocator.degree;
            if (numErrors == 1) {
                // shortcut
                return new Array(errorLocator.getCoefficient(1));
            }
            var result = new Array(numErrors);
            var e = 0;
            for (var i = 1; i < 256 && e < numErrors; i++) {
                if (errorLocator.evaluateAt(i) == 0) {
                    result[e] = this.field.inverse(i);
                    e++;
                }
            }
            if (e != numErrors) {
                throw "Error locator degree does not match number of roots";
            }
            return result;
        },
        findErrorMagnitudes: function (errorEvaluator, errorLocations, dataMatrix) {
            // This is directly applying Forney's Formula
            var s = errorLocations.length;
            var result = new Array(s);
            for (var i = 0; i < s; i++) {
                var xiInverse = this.field.inverse(errorLocations[i]);
                var denominator = 1;
                for (var j = 0; j < s; j++) {
                    if (i != j) {
                        denominator = this.field.multiply(denominator, GF256.addOrSubtract(1, this.field.multiply(errorLocations[j], xiInverse)));
                    }
                }
                result[i] = this.field.multiply(errorEvaluator.evaluateAt(xiInverse), this.field.inverse(denominator));
                // Thanks to sanfordsquires for this fix:
                if (dataMatrix) {
                    result[i] = this.field.multiply(result[i], xiInverse);
                }
            }
            return result;
        }
    }
    return ReedSolomonDecoder;
});
