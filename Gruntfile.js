module.exports = function(grunt) {

  grunt.initConfig({
    //pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js'],
    },
    watch: {
      files: ['<%= jshint.files %>', 'index.html'],
      tasks: ['jshint'],
      options: {
        livereload: true,
      },
    },
    connect: {
      server: {
        options: {
          useAvailablePort: true,
          livereload: true,
        },
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.registerTask('serve', ['connect', 'watch']);
  grunt.registerTask('default', ['jshint']);
};
