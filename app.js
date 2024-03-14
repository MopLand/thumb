
var fs = require('fs')
var path = require('path');
var glob = require('glob');
var request = require('request');

var app = {

	//演员列表
	Dirs : [],

	//任务列队
	Task : [],

	//演員列队
	Star : [],

	//基础目录
	Base : null,

	//任务总数
	Stats : {
		Tasks : 0,	//任务总数
		Renew : 0,	//更新图片
		Error : 0,	//失败次数
	},

	//初始化
	Init : function( dir, type, save ){	
		app.Host = 'https://www.javsee.zone/';
		app.Base = dir;
		app.Scan( app.Stop, type, save );
	},

	Sort : function(obj) {
		return Object.keys(obj).sort().reduce(function (result, key) {
			result[key] = obj[key];
			return result;
		}, {});
	},

	/**
     * 获取命令行参数
     * @param string param 参数名称
     * @param string supple 默认值
     */
	Argv : function(param = null, supple = null) {
		var argvs = process.argv.slice(2);

		var index = argvs.findIndex(function (val, pos) {
			//console.log(param, val, pos);
			
			//找到指定参数
			if( param ){
				return val == '-' + param;
			//}else if( pos == 0 && val.indexOf('-') == -1 ){
			//	return true;
			}
			
			//找到最后指令
			if( pos % 2 === 0 && val.substring(0,1) != '-' ){
				return true;
			}
		});
		
		//console.log( 'param:', param, ' index:', index );

		if (index == -1) {
			return supple;
		} else {
			return param ? argvs[index + 1] : argvs[index];
		}
	},

	//扫描文件
	Scan : function( fn, type, save ){

		//console.log( app.Base );

		if( save ){
			glob('*', { cwd : save, nocase : true }, function (er, files) {
				app.Dirs = files;
			});
		}
	
		glob('**/*.+(avi|mkv|wmv|mp4|m2ts|ts|mpeg)', { cwd : app.Base, nocase : true }, function (er, files) {
			
			files.forEach(function(item,index){
				
				var file = path.parse( item );
				var name = file.name;
				var newl = name.replace('_hd_','-').replace('_','-');
				var part = '';
				var last = files.length - 1;

				//提取番号
				if( movid = /([\w]+[\_\-])?([0-9]*[a-z]+[\_\-]?)(\d{3,})/i.exec( newl ) ){
					//console.log(match);
					/*
					if( match[3].substr(0,2) == '00' && match[3].length > 3 ){
						match[3] = match[3].replace('00','');
					}
					name = match[1] + '-' + match[3];
					name = name.toLowerCase();
					*/
					name = movid[0].toLowerCase();
				}
				
				//console.log('Video:', name);
				//console.log('-----------------------------');
				
				//多个文件
				if( match = /(\d+)\-(\w+)/.exec( newl ) ){
					part += '-' + match[2];
				}
				
				//中文翻译
				//if( match = /\-c/i.exec( newl ) ){
				//	part = '-c';
				//}
				
				//if( file.base == 'pred-498-c.mp4' ){
				//	console.log('Video:', name);
				//	process.exit();
				//}
				
				//原始文件
				var oldnm = app.Base + '/' + file.dir + '/' + file.base;
				
				//封面名称
				var image = app.Base + '/' + file.dir + '/' + name + '.jpg';
				
				//新的名称
				var movie = app.Base + '/' + file.dir + '/' + name + part + file.ext.toLowerCase();

				//console.log( name, oldnm, image, movie );
				//console.log( file.name, name, '-------' );

				//重复视频
				if( file.name.toLowerCase() != name + part && fs.existsSync( movie ) && type != 'actor' ){
					console.log( 'Repeat', file.name, name, movie );
				}
				
				//封面检查
				if( movid && ( !fs.existsSync( image ) || type == 'actor' ) ){
					app.Task.push( { 'name' : name, 'image' : image, 'movie' : movie, 'oldnm' : oldnm, 'object' : file } );
				}
				
				//批量下载
				if( index == last ){
					//console.log( app.Task.length );
					if( type == 'actor' ){
						app.Actor( last );
					}else{
						app.Thumb( last );
					}
					app.Stop();
				}

				app.Stats.Tasks ++;
				
			});
			
		});
	
	},

	Actor : function( last ){

		//console.log( app.Task );

		for( let i in app.Task ){
			
			let url = app.Host + app.Task[i].name;

			//console.log( i, app.Task[i].name );

			request({uri: url, timeout: 1000 * 3, encoding: 'utf-8'}, function (error, response, body) {

				//console.log( i, url, error );
				//console.log( response, body );

				if (!error && response.statusCode == 200) {

					let match = body.match( /<div class="star-name"><a href="(.+)\/star\/(.+)" title="(.+)">/g );

					//console.log( match );

					if( match && match.length == 1 ){

						for( let z in match ){

							let actor = /title="(.+)"/.exec( match[z] )[1];
	
							//console.log( actor );
	
							if( !app.Star[ actor ] ){
								app.Star[ actor ] = app.Dirs.indexOf( actor ) > -1 ? ['Y'] : [];
							}
	
							app.Star[ actor ].unshift( app.Task[i].name );
						}

					}

					app.Stats.Renew ++;
					
				}else{

					app.Stats.Error ++;

				}

			});

		}
	
	},

	Thumb : function(){
	
		for( let i in app.Task ){
			
			//let url = app.Host + app.Task[i].name;
			let url = 'https://www5.javxxx.me/movie/' + app.Task[i].name + '/';
			
			(new Promise(function( resolve, reject ){

				var object = app.Task[i];
			
				//if( app.Task[i].name == 'pred-498' ){
				//	console.log( app.Task[i] );
				//	process.exit();
				//}
				
				request({uri: url, encoding: 'binary', timedout : 5000, agentOptions: { rejectUnauthorized: false } }, function (error, response, body) {
					//console.log( url, error );
					//console.log( response, body );
					
					if( object.name == 'pred-498' ){
						console.log( object.name, url, error, response, body, /<meta name="twitter:image" content="(.+?)">/.exec( body ) );
						process.exit();
					}
					
					if (!error && response.statusCode == 200) {
						if( match = /<meta name="twitter:image" content="(.+?)">/.exec( body ) ){
							if( /^http(s)?:/i.test( match[1] ) ){
								object.cover = match[1];
							}else{
								object.cover = app.Host + match[1];
							}
							resolve( object );
						}else{
							console.log( 'Error:', url, error );
							reject( object );
						}
					}else{
						reject( object );
					}
				});
			
			})).then(function( object ){
			
				console.log( 'Cover:', object.image, object.cover );
				
				return new Promise(function( resolve, reject ){
			
					request({uri: object.cover, encoding: 'binary'}, function (error, response, body) {
						if (!error && response.statusCode == 200) {

							//写入图片
							//console.log( object.image );
							fs.writeFile(object.image, body, 'binary', function (err) {
								if (err) {console.log(err);}

								//重命名视频
								if( !fs.existsSync( object.movie ) ){
									fs.renameSync( object.oldnm, object.movie );
								}else{
									console.log( 'Repeat Movie', object.name );
								}
								
								resolve( object );

							});

						}
					});
				
				});
			
			}).then(function( object ){

				app.Stats.Renew ++;

			}).catch(function( object ) {

				console.log( 'Error:', object.name, object.oldnm );
				app.Stats.Error ++;

			});
		
		};
	
	},	

	//任务终止时回调
	Stop : function(){

		var fn = function(){

			//console.log( app.Task.length, app.Stats );

			if( app.Task.length == app.Stats.Renew + app.Stats.Error ){
				
				var info = ' 任务完成，视频总数：'+ app.Task.length +'，更新封面：'+ app.Stats.Renew +'，失败次数：'+ app.Stats.Error;
					info = info + '\n-----------------------------------';
					console.log( info );
					console.log( app.Sort( app.Star ) );
	
				process.exit();
	
			}

		}

		setInterval( fn, 3000 );

	}

}

//var args = process.argv.splice(2);

//console.log( args );

let base = app.Argv();
let type = app.Argv('type');
let save = app.Argv('save');

//console.log(process.argv.slice(2));
//console.log(type, save, base);

if( !base ){
	console.log( '请输入要处理的目录地址.' );
	console.log( 'node app.js [-type, -save] dir' );
}else{
	app.Init( base, type, save );
}
