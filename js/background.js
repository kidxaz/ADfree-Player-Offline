/*
 * This file is part of ADkill Player Offline
 * <http://bbs.kafan.cn/thread-1514537-1-1.html>,
 * Copyright (C) yndoc xplsy 15536900
 * Some codes came from:
 * "Proxy SwitchySharp" (Shyc2001 http://twitter.com/shyc2001)
 * ADkill Player Offline is free software: you can redistribute it and/or
 * modify it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * GNU General Public License, see <http://www.gnu.org/licenses/>.
 */

var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var taburls = []; //存放tab的url与flag，用作判断重定向
var baesite = ['http://tfetcher.duapp.com/player/', 'http://ntrackmypath.duapp.com/player/','http://127.0.0.1/']; //在线播放器地址.因lovejiani拥有大量免费流量,后面将较多的使用baesite[2].如果拥有自己的服务器也可在此修改
var ruleName = ['redirectlist','refererslist','proxylist'];
var localflag = 0; //本地模式开启标示,1为本地,0为在线.在特殊网址即使开启本地模式仍会需要使用在线服务器,程序将会自行替换
var proxyflag = 0;	//proxy调试标记
var cacheflag = false;	//用于确定是否需要清理缓存,注意由于隐身窗口的cookie与缓存都独立与普通窗口,因此使用API无法清理隐身窗口的缓存与cookie.
var severtime = 0;
var proxylist = [];
var refererslist = [];
var redirectlist = [];

initRules();

//====================================Crossdomin Spoofer Test
//pac script
var pac = {
  mode: "pac_script",
  pacScript: {
	data: "function FindProxyForURL(url, host) {\n" +
		"	var regexpr = /.*\\/crossdomain\\.xml/;\n" +	//使用过程中\\将被解析成\,所以在正常正则表达式中的\/需要改写成\\/
		"	if(regexpr.test(url)){\n " +
		"		return 'PROXY yk.pp.navi.youku.com:80';\n" +
		"	}\n" +
		"	return 'DIRECT';\n" +
		"}"
  }
};
//Permission Check + Proxy Control
function ProxyControl(pram) {
	chrome.proxy.settings.get({incognito: false}, function(config){
		//console.log(config.levelOfControl);
		//console.log(config);
		//console.log(pac);

		switch(config.levelOfControl) {
			case "controllable_by_this_extension":
			// 可获得proxy控制权限，显示信息
			console.log("Have Proxy Permission");
			proxyflag = 1;
			if(pram == "set"){
				console.log("Setup Proxy");
				chrome.proxy.settings.set({value: pac, scope: "regular"}, function(details) {});
			}
			break;

			case "controlled_by_this_extension":
			// 已控制proxy，显示信息
			console.log("Already controlled");
			proxyflag = 2;
			if(pram == "unset"){
				console.log("Release Proxy");
				chrome.proxy.settings.clear({scope: "regular"});
				FlushCache();
			}
			break;

			default:
			// 未获得proxy控制权限，显示信息
			console.log("No Proxy Permission");
			console.log("Skip Proxy Control");
			proxyflag = 0;
			break;

		}
	});
}
function FlushCache() {
	if(cacheflag) {
		chrome.browsingData.remove(
			{},{
			"cache": true,
			"fileSystems": true,
		},
		function() {
			console.log('Now flushing Cache!');
		});
	}
}
//Listeners
chrome.webRequest.onBeforeRequest.addListener(function(details) {
	for (var i = 0; i < proxylist.length; i++) {
		if (proxylist[i].find.test(details.url) && proxylist[i].extra == "crossdomain") {
			//console.log(details.url);
			console.log('Crossdomin Spoofer Rule : ' + proxylist[i].name);
			switch (proxylist[i].name) {

				default:
				//console.log("In Proxy Set");
				ProxyControl("set");
				break;

			}
			
		}
	}
	//return {cancel: false};
},
{urls: ["http://*/*", "https://*/*"]},
["blocking"]);

chrome.webRequest.onCompleted.addListener(function(details) {
	for (var i = 0; i < proxylist.length; i++) {
		if (proxylist[i].monitor.test(details.url) && proxylist[i].extra == "crossdomain") {
			//console.log(details);
			cacheflag = false;
			cacheflag = details.fromCache;
			console.log("Capture Moniter Url :" + details.url + " fromCache :" + details.fromCache + " ip :" + details.ip);
			switch (proxylist[i].name) {

				default:
				console.log("Now Release Proxy ");
				ProxyControl("unset");
				break;

			}
			
			break;
		}
	}
	
},
{urls:  ["http://*/*", "https://*/*"]});
//标签开启
chrome.tabs.onCreated.addListener(function(tab) {
	ProxyControl("unset");
});
///标签关闭
chrome.tabs.onRemoved.addListener(function(tabId) {
	ProxyControl("unset");
});
//====================================Headers Modifier Test
chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
	//console.log(details);
	for (var i = 0; i < refererslist.length; i++) {
		if (refererslist[i].find.test(details.url)) {
			//console.log(details);
			console.log('Referer Modifier Rule : ' + refererslist[i].name);
			for (var j = 0; j < details.requestHeaders.length; ++j) {
				if (details.requestHeaders[j].name === 'Referer') {
				//console.log(details.requestHeaders[j]);
					switch (refererslist[i].name) {
						case "referer_youku":
						if (/(youku|tudou)/i.test(details.requestHeaders[j].value)) {
							console.log("Referer Modifier : No need to change");
							break;
						}

						case "referer_iqiyi":
						if (/qiyi\.com/i.test(details.requestHeaders[j].value)) {
							console.log("Referer Modifier : No need to change");
							break;
						}

						default:
						console.log("Referer Modifier : Switch Default");
						if (refererslist[i].extra === "remove"){
							console.log('Referer Modifier Action : Remove');
							details.requestHeaders.splice(j, 1);
						} else {
							console.log('Referer Modifier Action : Modify');
							details.requestHeaders[j].value = refererslist[i].replace;
						}
						break;
					}

				//console.log(details.requestHeaders[j]);
					break;
				}
				/*if (details.requestHeaders[i].name === 'User-Agent') {
					//details.requestHeaders.splice(i, 1);
					details.requestHeaders[i].value = "Mozilla/5.0 (LETVC1;iPad; CPU OS 5_0 like Mac OS X) AppleWebKit/535.35 (KHTML, like Gecko)";
					//console.log(details.requestHeaders[i]);
				}*/
			}
		}
	}
	//Add Cache Controler
/*	for (var i = 0; i < proxylist.length; i++){
			if (proxylist[i].realurl.test(details.url)) {
				console.log('Cache-Control Modifier');
				for (var j = 0; j < details.requestHeaders.length; ++j) {
					if (details.requestHeaders[j].name === 'Cache-Control') {

						details.requestHeaders[j].value = "no-cache";
				}
				break;
			}
		}
	}
*/
	return {requestHeaders: details.requestHeaders};
},{urls: ["http://*/*", "https://*/*"]},
["blocking", "requestHeaders"]);

//====================================

///阻挡广告及重定向
chrome.webRequest.onBeforeRequest.addListener(function(details) {
	var url = details.url;
	var id = "tabid" + details.tabId; //记录当前请求所属标签的id
	var type = details.type;

	if (details.tabId == -1) //不是标签的请求直接放过
		return;

	if (type == "main_frame") { //是标签主框架的url请求
		console.log(id);
		//console.log(url);
		taburls[id] = []; //二维数组
		taburls[id][0] = url;
//		console.log(url);
		taburls[id][1] = 1; //默认值,对于iqiyi来说是载入v5播放器,对于letv来说是载入普通LETV播放器可本地(但在线调用letv播放器如:AB站 Letvcloud LetvViKi,不能使用本地地址)http://www.letv.com/ptv/pplay/90558/2.html
		//=======================
		if (/.*\.iqiyi\.com/i.test(url)) { //消耗流量与资源对iqiyi和letv的进一步判断,不过现在只有iqiyi的有作用letv不需要这样判断了
//		if (/(^((?!(baidu|61)).)*\.iqiyi\.com)|(letv.*\..*htm)/i.test(url)) {
			var xhr = new XMLHttpRequest();
			xhr.open("GET", url, true);
			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {	
//					console.log(/iqiyi|letv/i.exec(url));
					switch (/iqiyi|letv/i.exec(url)[0]) {
						case "iqiyi":
						console.log("XHR Switch : iqiyi|pps");
						taburls[id][1] = /data-flashplayerparam-flashurl/i.test(xhr.responseText);
						break;
/*
						case "letv":
						console.log("XHR Switch : letv");
						taburls[id][1] = !/VLetvPlayer/.test(xhr.responseText);
						break;
*/
						default:
						console.log("XHR Switch : default");
						break;
					}					
					console.log("Url : " + taburls[id][0]);
					console.log("Flag State : " + taburls[id][1]);
					//console.log(xhr.responseText);
				}
			}
			xhr.send();
		}
		//=======================
	} else {
//		console.log(id);
	}

	try {//在此运行代码

		var testUrl = taburls[id][0]; //该请求所属标签的url
	} catch(err) {

		return;//在此处理异常
	}
	
	//console.log(testUrl);
	//URL重定向列表
	for (var i = 0; i < redirectlist.length; i++) {
		if (type == "main_frame") //是主框架请求则规则失效
			continue;
		if (redirectlist[i].find.test(url)) {
			console.log(url);
			var newUrl = url.replace(redirectlist[i].find, redirectlist[i].replace);
			//重定向细化规则部分开始
			//console.log(redirectlist[i].name);
			console.log("Switch : " + redirectlist[i].name);

			switch (redirectlist[i].name)
			{
				case "letv":
				//console.log("Switch : letv");
				//letvflag = taburls[id][1];
				if (redirectlist[i].exfind.test(testUrl) && localflag) { //特殊网址的Flash内部调用特例,只处理设置为本地模式的情况
					newUrl = url.replace(redirectlist[i].find, baesite[2] + 'letv.swf'); //转换成在线
				}
				break;
/*
				case "letvpccs":
				//console.log("Switch : letvpccs");
				
				break;
*/
				case "iqiyi":
				//console.log("Switch : iqiyi");	
				if(/v\..*iqiyi\.com/i.test(testUrl)){	//强制v5名单 无法使用v5flag进行判断的特殊类型
					console.log("Force to iqiyi5");
				} else {
					if (redirectlist[i].exfind.test(testUrl)) { //外链名单
						console.log("Out Side");
						if (/(bili|acfun)/i.test(testUrl)) { //特殊网址Flash内部调用切换到非本地模式
							//							newUrl = url.replace(redirectlist[i].find,baesite[ getRandom(3) ] + 'iqiyi_out.swf');	//多服务器均衡,因服务器原因暂未开启
							newUrl = url.replace(redirectlist[i].find, baesite[2] + 'iqiyi_out.swf');
						} else {
							newUrl = newUrl.replace(/iqiyi5/i, 'iqiyi_out');
						}
					} else { //iqiyi本站v4 v5
						//newUrl = newUrl.replace(/iqiyi5/i,'iqiyi');	//先行替换成v4
						console.log("Judge Flag");
						v5flag = taburls[id][1]; //读取flag存储
						if (!v5flag || /pps\.tv/i.test(testUrl)) {	//不满足v5条件换成v4,或者在pps.tv域名下强制改变
							newUrl = newUrl.replace(/iqiyi5/i, 'iqiyi');
						} 
					}
				}
				break;

				case "youkuloader":
				//console.log("Switch : youku");
				if (redirectlist[i].exfind.test(testUrl) && localflag) { //特殊网址Flash内部调用切换到非本地模式
				//		newUrl = url.replace(redirectlist[i].find,baesite[ getRandom(3) ] + 'loader.swf' + "?showAd=0&VideoIDS=$2");	//多服务器均衡,因服务器原因暂未开启
						newUrl = url.replace(redirectlist[i].find, baesite[2] + 'loader.swf');
					}
				break;

				case "youkuplayer":
				//console.log("Switch : youku");
				if (redirectlist[i].exfind.test(testUrl) && localflag) { //特殊网址Flash内部调用切换到非本地模式
				//		newUrl = url.replace(redirectlist[i].find,baesite[ getRandom(3) ] + 'loader.swf' + "?showAd=0&VideoIDS=$2");	//多服务器均衡,因服务器原因暂未开启
						newUrl = url.replace(redirectlist[i].find, baesite[2] + 'player.swf');
					}
				break;

				//case "tudou_sp":
				case "tudou":
				//console.log("Switch : tudou");
				if (redirectlist[i].exfind.test(testUrl)) { //特殊网址由于网页本身参数不全无法替换tudou
						console.log("Can not redirect Player!");
						newUrl = url;
					}
				break;

				case "sohu":
				//console.log("Switch : sohu");
				letvflag = taburls[id][1];
				if (redirectlist[i].exfind.test(testUrl) && localflag) { //特殊网址的Flash内部调用特例,只处理设置为本地模式的情况
					newUrl = url.replace(redirectlist[i].find, baesite[2] + 'sohu.swf'); //转换成在线
				}
				break;

				default:
				console.log("Switch : Default");
				break;
			}

			//重定向细化规则部分结束
			console.log(newUrl);
			newUrl = decodeURIComponent(newUrl);
			return {
				redirectUrl: newUrl
			};
		}
	}

	return {
		cancel: false
	};
}, {
	urls: ["http://*/*", "https://*/*"]
}, ["blocking"]);

function getUrl(path) {
	return chrome.extension.getURL(path);
}

function getRandom(num) //生成0到num-1的伪随机数
{
	return Math.floor(Math.random() * num);
}

///标签关闭
chrome.tabs.onRemoved.addListener(function(tabId) {
	var id = "tabid" + tabId; //记录当前请求所属标签的id
	if (taburls[id])
		delete taburls[id];
});

//Base64 decode
function utf8_decode(utftext) {
	var string = "";
	var i = 0;
	var c = c1 = c2 = 0;

	while ( i < utftext.length ) {

		c = utftext.charCodeAt(i);

		if (c < 128) {
			string += String.fromCharCode(c);
			i++;
		}
		else if((c > 191) && (c < 224)) {
			c2 = utftext.charCodeAt(i+1);
			string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
			i += 2;
		}
		else {
			c2 = utftext.charCodeAt(i+1);
			c3 = utftext.charCodeAt(i+2);
			string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
			i += 3;
		}

	}

	return string;
}

function decode64(input) {
	var output = "";
	var chr1, chr2, chr3;
	var enc1, enc2, enc3, enc4;
	var i = 0;

	input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

	while (i < input.length) {

		enc1 = _keyStr.indexOf(input.charAt(i++));
		enc2 = _keyStr.indexOf(input.charAt(i++));
		enc3 = _keyStr.indexOf(input.charAt(i++));
		enc4 = _keyStr.indexOf(input.charAt(i++));

		chr1 = (enc1 << 2) | (enc2 >> 4);
		chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
		chr3 = ((enc3 & 3) << 6) | enc4;

		output = output + String.fromCharCode(chr1);

		if (enc3 != 64) {
			output = output + String.fromCharCode(chr2);
		}
		if (enc4 != 64) {
			output = output + String.fromCharCode(chr3);
		}

	}

	output = utf8_decode(output);

	return output;

}
//Base64 decode End

//外部记录到background console
function recordlog(text) {  
	console.log(text);
}

//获取规则url是地址 value是本地storage的名称
function fetchRules(url,value){
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status==200) {
			var list = xhr.responseText;
			switch(value){
				case 'redirectlist':
				chrome.storage.local.set({'redirectlist' : list}, function() {
					// Notify that we saved.
					console.log('Rules Saved:' + value);
				});
				break;

				case 'refererslist':
				chrome.storage.local.set({'refererslist': list}, function() {
					// Notify that we saved.
					console.log('Rules Saved:' + value);
				});
				break;

				case 'proxylist':
				chrome.storage.local.set({'proxylist': list}, function() {
					// Notify that we saved.
					console.log('Rules Saved:' + value);
					initRules();	//在最后的规则导入之后启动初始化过程
				});
				break;

				default:
				break;
			}
					
		}else{
			console.log("Fetch Rule Error!");
		}
	}
	xhr.send();
}

//直接更新所有规则
function fetchAllRules(){
	console.log("Now Fetching RuleList");
	for(var i = 0; i < ruleName.length; i++){
		fetchRules(baesite[2] + "/rulelist/" + ruleName[i],ruleName[i]);
	}
	setLastUpdate();
}

//判断是否需要更新规则
function isNeedUpdate(){
	console.log("In isNeedUpdate");
	var url = baesite[2] + "/rulelist/update";
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status==200) {
			severtime = xhr.responseText;
			chrome.storage.local.get('LastUpdate', function(items) {
			if(items['LastUpdate'] == null){
				fetchAllRules();
			}else if(items['LastUpdate'] < severtime){
				fetchAllRules();
			}
//			console.log(items);
			});
		}else{
			//
		}
	}
	xhr.send();
}

//存储最后更新时间
function setLastUpdate(){
	console.log("In setLastUpdate");
	chrome.storage.local.set({'LastUpdate': Date.now()}, function() {
		// Notify that we saved.
		console.log('LastUpdate Saved');
		});
}

//规则初始化
function initRules(){
	console.log("Now Initial RuleLists");
	chrome.storage.local.get('proxylist', function(items) {
		if(items['proxylist'] != null) {
			for(var i = 0; i < ruleName.length; i++){
				switch(ruleName[i]){
					case 'redirectlist':
					chrome.storage.local.get('redirectlist', function(items) {
						if(items['redirectlist'] != null) redirectlist = genRules(items['redirectlist']);
					});
					break;

					case 'refererslist':
					chrome.storage.local.get('refererslist', function(items) {
						if(items['refererslist'] != null) refererslist = genRules(items['refererslist']);
					});
					break;

					case 'proxylist':
					chrome.storage.local.get('proxylist', function(items) {
						if(items['proxylist'] != null) proxylist = genRules(items['proxylist']);
					});
					break;

					default:
					break;
				}
			}
		}else{
			console.log("Initial RuleLists Error!");
			isNeedUpdate();
		}
	});
}

//通过JSON数组生成所需规则结构
function genRules(listdata){
//	var tempa = decode64(listdata);
//	var tampb = JSON.parse(tempa);
	var list = JSON.parse(decode64(listdata));
	for (var i = 0; i < list.length; i++) {
		list[i].find = new RegExp(list[i].find,"i");
		if(list[i].exfind != null) list[i].exfind = new RegExp(list[i].exfind,"i");
		if(list[i].monitor != null) list[i].monitor = new RegExp(list[i].monitor,"i");
	}
	return list;
}