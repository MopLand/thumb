
var fs = require('fs')
var path = require('path');
var glob = require('glob');
var request = require('request');

var app = {

	//任务列队
	Task : [],

	//基础目录
	Base : null,

	//任务总数
	Stats : {
		Tasks : 0,	//任务总数
		Renew : 0,	//更新图片
		Error : 0,	//失败次数
	},

	//初始化
	Init : function( dir ){	
		app.Base = dir;
		app.Scan( app.Stop );
	},

	//扫描文件
	Scan : function( fn ){
	
		glob('**/*.+(avi|mkv|wmv|mp4|m2ts)', { cwd : app.Base, nocase : true }, function (er, files) {
			
			files.forEach(function(item,index){
				
				var file = path.parse( item );
				var name = file.name;
				var newl = name.replace('_hd_','_');
				var part = '';

				//提取番号
				if( match = /([a-z]+)([\_\-]?)(\d{3,})/i.exec( newl ) ){
					//console.log(match);
					if( match[3].substr(0,2) == '00' && match[3].length > 3 ){
						match[3] = match[3].replace('00','');
					}
					name = match[1] + '-' + match[3];
					name = name.toLowerCase();
				}
				
				//console.log('Video:', name);
				//console.log('-----------------------------');
				
				//多个文件
				if( match = /cd(\d+)/.exec( newl ) ){
					part = '-cd' + match[1];
				}
				
				//原始文件
				var oldnm = app.Base + '/' + file.dir + '/' + file.base;
				
				//封面名称
				var image = app.Base + '/' + file.dir + '/' + name + '.jpg';
				
				//新的名称
				var movie = app.Base + '/' + file.dir + '/' + name + part + file.ext.toLowerCase();

				//console.log( name, oldnm, image, movie );
				//console.log( file.name, name, '-------' );

				//重复视频
				if( file.name != name && fs.existsSync( movie ) ){
					console.log( 'Repeat', file.name );
				}
				
				//封面检查
				if( !fs.existsSync( image ) ){
					app.Task.push( { 'name' : name, 'image' : image, 'movie' : movie, 'oldnm' : oldnm, 'object' : file } );									
				}
				
				//批量下载
				if( index == files.length - 1 ){
					app.Thumb();
					app.Stop();
				}

				app.Stats.Tasks ++;
				
			});
			
		});
	
	},

	Thumb : function(){
	
		for( var i in app.Task ){		
			
			var url = 'https://www.javbus12.pw/' + app.Task[i].name;
			
			(new Promise(function( resolve, reject ){

				var object = app.Task[i];
				
				request({uri: url, encoding: 'binary'}, function (error, response, body) {
					//console.log( url, body );
					if (!error && response.statusCode == 200) {
						if( match = /<a class="bigImage" href="(.+?)">/.exec( body ) ){
							object.cover = match[1];
							resolve( object );
						}else{
							console.log( 'Error:', url );
							reject( object );
						}
					}else{
						reject( object );
					}
				});
			
			})).then(function( object ){
			
				console.log( 'Cover:', object.cover );
				
				return new Promise(function( resolve, reject ){
			
					request({uri: object.cover, encoding: 'binary'}, function (error, response, body) {
						if (!error && response.statusCode == 200) {

							//写入图片
							//console.log( object.image );
							fs.writeFile(object.image, body, 'binary', function (err) {
								if (err) {console.log(err);}

								//重命名视频
								if( !fs.existsSync( object.movie ) ){
									fs.rename( object.oldnm, object.movie );
								}else{
									console.log( 'Repeat', object.name );
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
	Stop : function( ){

		var fn = function(){

			if( app.Task.length == app.Stats.Renew + app.Stats.Error ){
				
				var info = ' 任务完成，视频总数：'+ app.Task.length +'，更新封面：'+ app.Stats.Renew +'，失败次数：'+ app.Stats.Error;
					info = info + '\n-----------------------------------';
					console.log( info );
	
				process.exit();
	
			}

		}

		setInterval( fn, 3000 );

	}

}

var param = process.argv.splice(2);

if( !param ){
	console.log( '请输入要处理的目录地址.' );
}else{
	app.Init( param.shift() );
}
 
