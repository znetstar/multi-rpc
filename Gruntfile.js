const pkg = JSON.parse(require('fs').readFileSync("./package.json", "utf8"))
module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: ["lib"],
        ts: {
            default : {
              outDir: "lib",
              tsconfig: './tsconfig.json'
            }
        }
    });

    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks('grunt-contrib-clean');
    
    grunt.registerTask('build', ['clean', 'ts']);
    grunt.registerTask('default', ['build']);
};