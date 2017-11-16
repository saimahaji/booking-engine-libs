var gulp = require('gulp');
var plumber = require('gulp-plumber');
var merge = require('merge2');
var fsPath=require('fs-path');

var postcss = require('gulp-postcss');
var cssnano = require('cssnano');
var rtlcss = require('rtlcss');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('autoprefixer');
var rename = require('gulp-rename');

var templateCache = require('gulp-angular-templatecache');
var htmlmin= require('gulp-htmlmin');
var path = require('path');
var folders = require('gulp-folders');

var runSequence = require('run-sequence');
var clean = require('gulp-clean');
 
var themeOutputsPath= 'src/main/resources/static/client/themes-output';
var themeBuildPath= 'src/main/resources/static/client/stylesheets/themes-build';
var serverTemplateBody= '$templateCache.put(\'/client/<%= url %>\',\'<%= contents %>\');';

var ts = require('gulp-typescript');

var path = require("path");
var Builder = require('systemjs-builder');

gulp.task('welcome', function() {
	console.log('hello from gulp default');
});

gulp.task('build-sass',function() {
	var processors = [ autoprefixer({browsers: ['last 20 versions']}), cssnano() ];
	var rtlProcessors = [ rtlcss() ].concat(processors);
	
	var compileToCss=gulp.src('src/main/resources/static/client/themes-output/**/*.scss')
						 .pipe(plumber())
						 .pipe(sourcemaps.init())
						 .pipe(sass())
						 .pipe(postcss(processors))
						 .pipe(sourcemaps.write('.'))
						 .pipe(gulp.dest('src/main/resources/static/client/themes-output'))
						 .pipe(gulp.dest('target/classes/static/client/themes-output'));

	var compileToRtlCss=gulp.src('src/main/resources/static/client/themes-output/**/*.scss')
							.pipe(plumber())
							.pipe(sourcemaps.init())
							.pipe(sass())
							.pipe(postcss(rtlProcessors))
							.pipe(rename({ suffix: '-rtl' }))
							.pipe(sourcemaps.write('.'))
							.pipe(gulp.dest('src/main/resources/static/client/themes-output'))
							.pipe(gulp.dest('target/classes/static/client/themes-output'));
	return merge(compileToCss,compileToRtlCss);
});

gulp.task('sass-lib', function() {
	gulp.src('src/main/resources/static/lib/**/*.scss')
		.pipe(plumber())
		.pipe(sourcemaps.init())
		.pipe(sass())
// .pipe(autoprefixer({browsers: ['last 20 versions']}))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('src/main/resources/static/lib'))
// .pipe(rtlcss())
// .pipe(rename({ suffix: '-rtl' }))
// .pipe(gulp.dest('src/main/resources/static/lib'));
});
gulp.task('bootstrap-fonts', function() {
	gulp.src('src/main/resources/static/lib/bootstrap-sass-3.3.5/assets/fonts/bootstrap/*')
		.pipe(plumber())
		.pipe(gulp.dest('src/main/resources/static/assets/stylesheets/css/bootstrap/fonts'));
});

// copy css and html templates to themes

gulp.task('copy-scss',folders(themeBuildPath, function(folder){
	return gulp.src(['src/main/resources/static/client/stylesheets/modules_new/**/*'])
				.pipe( gulp.dest( function( file ) { return path.join(themeOutputsPath,folder); } ) );

}));
gulp.task('copy-default-scss',function(){
	return gulp.src(['src/main/resources/static/client/stylesheets/modules_new/**/*'])
	.pipe(gulp.dest('src/main/resources/static/client/themes-output/default'));
	
});
	gulp.task('copy-html',folders(themeBuildPath, function(folder){
	return gulp.src(['src/main/resources/static/client/**/*.html',
                    '!src/main/resources/static/client/stylesheets/**/*.html',
                    '!src/main/resources/static/client/themes-output/**/*.html'])
				.pipe(gulp.dest('src/main/resources/static/client/themes-output/default'))
				.pipe( gulp.dest( function( file ) { return path.join(themeOutputsPath,folder); } ) );


}));

// override with theme specific files

gulp.task('generate-themes',function() {
	var overrideScss= gulp.src(['src/main/resources/static/client/stylesheets/themes-build/**/*.scss'])
						  .pipe(gulp.dest('src/main/resources/static/client/themes-output/'));
	

	var overrideHtml=gulp.src(['src/main/resources/static/client/stylesheets/themes-build/**/*.html'])
						 .pipe(gulp.dest('src/main/resources/static/client/themes-output/'));
	
	return merge(overrideScss,overrideHtml);
	
});


gulp.task('build-server-template-cache',folders(themeOutputsPath, function(folder){

	return gulp.src(path.join(themeOutputsPath, folder,'/**/*.html'))
				.pipe(htmlmin({collapseWhitespace: true}))
				.pipe(templateCache({standalone : true,templateBody :  serverTemplateBody}))
				.pipe( gulp.dest( function( file ) { return path.join(themeOutputsPath,folder); } ) );
		
}));

gulp.task('build-local-template-cache',function(){
	return fsPath.writeFile('src/main/resources/static/client/themes-output/default/templates.js',
							"angular.module('templates', []);");
	});

gulp.task('clean', function () {
	return gulp.src('src/main/resources/static/client/themes-output', {read: false})
				.pipe(clean());
});

gulp.task('local-sass', function(callback) {
	runSequence('clean',
				'copy-default-scss',
				'build-local-template-cache',
				'build-sass',callback);
});

gulp.task('server-ts', function(callback) {
	runSequence('local-ts','systemjs-builder',callback);
});

gulp.task('server-sass', function(callback) {
	runSequence('clean',
			    'copy-default-scss',
			    'copy-scss',
			    'copy-html',
			    'generate-themes',
			    'build-server-template-cache',
			    'build-sass',callback);
});
/* ES6/TypeScript */

var scriptsSources = "src/main/resources/static";
var compiledScriptsSources = "target/classes/static";
var tsSources = scriptsSources + "/**/*.ts";
var dtsSources = "typings/typings.d.ts";
var dtsSourcesToRemove = "!" + scriptsSources + "/**/*.d.ts";

gulp.task('local-ts', function() {
	var tsResult = gulp.src([ tsSources, dtsSources, dtsSourcesToRemove ])
					   .pipe(plumber()).pipe(sourcemaps.init())
					   .pipe(ts({
						   module : 'system',
						   declaration : true
					   }));

	/*
	 * var dtsDestination = tsResult.dts.pipe(gulp.dest(scriptsSources))
	 * .pipe(gulp.dest(compiledScriptsSources));
	 */
	
	var tsDestination = tsResult.js.pipe(sourcemaps.write())
								   .pipe(gulp.dest(scriptsSources))
								   .pipe(gulp.dest(compiledScriptsSources));

	return merge([ /* dtsDestination, */ tsDestination ]);
});

/* Live compilation */
gulp.task('watch', function() {
    gulp.watch('src/**/*.scss', ['local-sass']);
    gulp.watch([ tsSources, dtsSourcesToRemove ], ['local-ts']);
});

gulp.task('systemjs-builder', function() {
	var builder = new Builder('src/main/resources/static', 'src/main/resources/static/client/system.config.js');

	
	function buildModule(modulePath, excludePath) {
		
		
		builder
			.bundle(modulePath + excludePath , scriptsSources + '/' + modulePath.replace(/^booking-engine\//, "") + '.js', { minify : false })
			.then(function() {
				console.log(modulePath + ' Build complete');
			})
			.catch(function(err) {
				console.log(modulePath + ' Build error');
				console.log(err);
		});
	};
	
	builder
		.buildStatic('framework.module', scriptsSources + '/client/components/framework.module.js', { minify : false }).then(function(){
			console.log('Framework Build complete');
			builder.bundle('booking-engine/client/modules/user-auth/user-auth.module', scriptsSources + '/client/modules/user-auth/user-auth.module.js', { minify : false })
			.then(function() {
				console.log('User Auth Build complete');
				buildModule('booking-engine/client/modules/utilities/utilities.module', '');
				buildModule('booking-engine/client/modules/product-commons/product-common.module', '');
				buildModule('booking-engine/client/components/shared-components.module', '');
				
				var userPath = ' - booking-engine/client/modules/user-auth/user-auth.module';
				buildModule('booking-engine/client/modules/air/air-search.module', userPath);
				buildModule('booking-engine/client/modules/hotel/hotel-search.module', userPath);
				buildModule('booking-engine/client/modules/package/package-search.module', userPath);
				buildModule('booking-engine/client/modules/dynamic-package/dynamic-package-search.module', userPath);
				buildModule('booking-engine/client/modules/hotel-air/hotel-air-search.module', userPath);
				buildModule('booking-engine/client/modules/transfer/transfer-search.module', userPath);
				buildModule('booking-engine/client/modules/sightseeing/sightseeing-search.module', userPath);
				buildModule('booking-engine/client/modules/my-account/my-trips/my-trips.module', userPath);
				buildModule('booking-engine/client/modules/travel-request/travel-request.module',userPath);
			})
			.catch(function(err) {
			  	console.log('User Auth Build error');
			  	console.log(err);
			});
	}).catch(function(err) {
		  console.log('Framework Build error');
		  console.log(err);
	});
	
});


//Automatic update code 
gulp.task('upgrade-libs', function() {
	var libPath = 'src/main/resources/static/lib';
	
	gulp.src('node_modules/angular/angular.js')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/angular'));
	
	gulp.src('node_modules/angular-animate/angular-animate.js')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/angular'));

	gulp.src('node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/angular-ui'));

    gulp.src('node_modules/font-awesome/scss/*.scss')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/font-awesome/scss'));

	gulp.src('node_modules/font-awesome/fonts/**.*')
		.pipe(plumber())
		.pipe(gulp.dest('src/main/resources/static/client/stylesheets/modules_new/fonts/font-awesome'));
		
	gulp.src('node_modules/angular-i18n/*.js')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/angular-i18n'));	
		
	gulp.src('node_modules/angular-cookies/angular-cookies.js')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/angular-cookies'));
		
	gulp.src('node_modules/angular-sanitize/angular-sanitize.js')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/angular-sanitize'));
		
	gulp.src('node_modules/angular-mocks/angular-mocks.js')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/angular-mocks'));
		
	gulp.src('node_modules/angular-messages/angular-messages.js')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/angular-messages'));

	gulp.src('node_modules/systemjs-builder/node_modules/systemjs/dist/system-polyfills.js')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/system'));
	
	gulp.src('node_modules/systemjs/dist/system.js')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/system'));
	
	gulp.src('node_modules/es6-shim/es6-shim.js')
		.pipe(plumber())
		.pipe(gulp.dest(libPath + '/es6-shim'));
	
});



