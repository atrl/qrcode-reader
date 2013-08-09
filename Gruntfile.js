module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        qunit: {
            files: ['test/**/*.html']
        },
        lint: {
            files: ['GruntFile.js', 'src/**/*.js', 'test/**/*.js']
        },
        watch: {
            files: '<config:lint.files>',
            tasks: 'lint qunit'
        }
    });

    grunt.loadNpmTasks("grunt-contrib-qunit");

    grunt.registerTask("test", ["qunit"]);

};