'use strict';
const path = require('path')
const cheerio = require('cheerio')
const superagent = require('superagent')
let UserAgent = require(path.join(__dirname, '../util/userAgents')).get()
var obtain_all_play_url = async function(params, opts) {
    logger.info("matching albumlist info ")
    var body = await superagent.get(params.url)
    let match = body.text.match(/PageConfig\s*=\s*([^script].*?);/iu)
    let showid_match = match[1].match(/showid:"([^"].*?)"/iu)
    let showid = showid_match[1]
    logger.info("showid " + showid)

    let t = (new Date()).getTime().toString()

    let url = `https://list.youku.com/show/module?id=${showid}&tab=showInfo&cname=%E7%94%B5%E8%A7%86%E5%89%A7&callback=jQuery111206169174529002659_1564107718829&_=${t}`
    let vcontent = await superagent.get(url)
        .set('referer', params.url)
        .set('accept', 'application/json; charset=utf8')
        .set('User-Agent', UserAgent)
        .buffer(true).parse(function(res, fn) {
            res.text = ""
            res.setEncoding("utf-8");
            res.on("data", function(chunk) {
                res.text += chunk.toString()
            })
            res.on("end", function() {
                fn(null, res)
            })
        })
    let html_match = vcontent.text.match(/_1564107718829\((.*)\);/iu)
    let list_json = JSON.parse(html_match[1])

    let urls = []

    let $ = cheerio.load(list_json['html'])
    $(".p-panel").find('a').each(function(index, item) {
        let $this = $(this);
        let url = $this.attr("href")
        var http_index = url.indexOf('//');
        if (http_index == 0) {
            url = 'https:' + url
        }
        urls.push(url)
    })

    logger.info("matching albumlist completed ")
    return urls
}
exports = module.exports = { obtain_all_play_url, vp: false }