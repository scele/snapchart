module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ['out', 'dist'],
    ngmin: {
      default: {
        src: ['src/**/*.js'],
        dest: 'out/pivotchart.js',
      },
    },
    html2js: {
      main: {
        src: ['src/templates/**/*.html'],
        dest: 'out/pivotchart-templates.js',
      },
    },
    uglify: {
      default: {
        files: {
          'out/pivotchart.min.js': [
            'out/pivotchart.js',
            'out/pivotchart-templates.js',
          ],
        }
      }
    },
    less: {
      default: {
        files: {
          'dist/pivotchart.css': 'less/pivotchart.less',
        },
      },
    },
    concat: {
      colorpicker: {
        src: ['bower_components/angular-bootstrap-colorpicker/css/colorpicker.css'],
        dest: 'dist/components.css',
      },
      default: {
        src: [
          'bower_components/angular-bootstrap-colorpicker/js/bootstrap-colorpicker-module.js',
          'bower_components/angular-ui-sortable/sortable.js',
          'bower_components/angular-ui-slider/src/slider.js',
          'bower_components/angular-ui-slider/src/slider.js',
          'bower_components/d3-plugins/sankey/sankey.js',
        ],
        dest: 'dist/components.js',
      },
    },
    copy: {
      dist: {
        expand: true,
        flatten: true,
        filter: 'isFile',
        src: ['out/pivotchart.min.js'],
        dest: 'dist/',
      },
    },
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js'],
    },
    watch: {
      files: ['<%= jshint.files %>', 'index.html', 'src/**/*.html', 'less/**/*.less'],
      tasks: ['jshint', 'less', 'express:dev'],
      options: {
        livereload: true,
      },
    },
    express: {
      options: {
        script: 'server/server.js',
      },
      dev: {
      },
    },
  });

  grunt.loadNpmTasks('grunt-ngmin');
  grunt.loadNpmTasks('grunt-html2js');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('serve', ['default', 'express:dev', 'watch']);
  grunt.registerTask('default', ['jshint', 'ngmin', 'html2js', 'uglify', 'concat', 'less']);
  grunt.registerTask('dist', ['copy:dist']);
};
