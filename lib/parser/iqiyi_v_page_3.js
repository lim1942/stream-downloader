'use strict';

const path = require('path')
var request = require(path.join(__dirname,'../rq'));
var crypto = require('crypto');

var getMacID = function() {
	let macID = ""
	let chars = [ "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "n", "m", "o", "p", "q", "r", "s", "t", "u", "v","w", "x", "y", "z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
	for(let i = 0; i < 32; i++){
		macID += chars[Math.floor(Math.random()*chars.length)]
	}
	return macID
}

var getVF = function(params) {
	let suffix = ""
	for(let j = 0; j < 8; j++){
		for(let k = 0; k < 4; k++) {
			let v8 = 0
			let v4 = 13 * (66*k + 27*j) % 35
			if (v4 >= 10) {
				v8 = v4 + 88
			} else {
				v8 = v4 + 49
			}
			suffix += String.fromCharCode(v8)
		}
	}
	params += suffix

	var md5 = crypto.createHash('md5')
    return md5.update(params).digest('hex')
}

var exec = async function(params, opts){
    console.log("debug: matching video info ")
	let body = await request.get(params.url)
	let tvid_match = body.match(/"tvId":([a-z0-9]+)/iu)
    let tvid = tvid_match[1]
    console.log("debug: tvid " + tvid)

    let vid_match = body.match(/"vid":"([a-z0-9]+)"/iu)
    let vid = vid_match[1]
    console.log("debug: vid " + vid)

    let title_match = body.match(/"tvName":"([^"]*)"/iu)
    let title = title_match[1]
    console.log("debug: title " + title)

    let t =  (new Date()).getTime().toString()

    let rparams = `/vps?tvid=${tvid}&vid=${vid}&v=0&qypid=${tvid}_12&src=01012001010000000000&t=${t}&k_tag=1&k_uid=${getMacID()}&rs=1`
    let vf = getVF(rparams)
    let url = `http://cache.video.qiyi.com${rparams}&vf=${vf}`
    let content = await request.get(url)
    let re_json = JSON.parse(content)
    let urlPrefix = re_json['data']['vp']['du']
    let streams = {}
    for (let i in re_json['data']['vp']['tkl'][0]['vs']) {
    	let video = re_json['data']['vp']['tkl'][0]['vs'][i]
    	let urls = []
    	let stream_id = video['bid'].toString()

	    if(stream_id in streams){
			continue
		}

		if(opts.streamId&&opts.streamId.toUpperCase()!=stream_id){
			continue
		}

	    for (let j in video['fs']) {
	    	let v = video['fs'][j]
	    	let url = urlPrefix+v.l
	    	let v_content = await request.get(url)
    		let v_json = JSON.parse(v_content)
	    	urls.push(v_json['l'])
	    }
		streams[stream_id] = {
			"id":stream_id,
			'video_profile': "f4v", 
			'container': 'f4v', 
			'src': urls, 
			'size' : video['vsize'], 
			'format' : 'mp4', 
			'screenSize': 0
		}
    }
    let streams_sorted = streams

	console.log("debug: matching video completed ")
	return [{
		"title":title,
		"url":params.url,
		"merge":true,
		"streams":streams_sorted
	}]
}
exports = module.exports = {exec,vp:true}