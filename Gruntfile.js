const { cp } = require('shelljs');
module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        typedoc: {
            build: {
                options: {
                    module: 'commonjs',
                    out: './docs',
                    name: 'face-command-common',
                    target: 'es2018'
                },
                src: ['./src/**/*']
            }
        },
        clean: ["lib"],
        ts: {
            default : {
              outDir: "lib",
              tsconfig: './tsconfig.json'
            }
        }
    });

    grunt.registerTask('extraDocStuff', function () {
        cp("-r", "./.docs/.*", "./.docs/*", "./docs");
    });

    grunt.loadNpmTasks('grunt-typedoc');
    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-contrib-clean');
    
    grunt.registerTask('build', ['clean', 'ts']);
    grunt.registerTask('default', ['build']);

    grunt.registerTask('docs', ['typedoc', 'extraDocStuff']);
};