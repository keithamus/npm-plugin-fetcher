#!/usr/bin/env node
'use strict';
var cli = require('cli');
var https = require('https');
var path = require('path');
var fs = require('fs');

function get(url, cb) {
    cli.debug('Fetching url ' + url);
    var time = Date.now();
    https.get(url, function (res) {
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) { data += String(chunk); })
           .on('end', function () {
                cli.debug('Fetched: ' + url + ' (' + (Date.now() - time) + 'ms)');
                cb(data);
           });
    });
}

cli.enable('version', 'autocomplete', 'help', 'status', 'glob')
    .setApp(__dirname + '/package.json')
    .setUsage(cli.app + ' [OPTIONS] keyword')
    .parse({
        registry: [
            'r',
            'Registry to use',
            'string',
            'https://registry.npmjs.com'
        ],
        blacklist: [
            'b',
            'A blacklist JSON file to use',
            'string',
            ''
        ],
        out: [
            'o',
            'The output directory to put files into (must exist!)',
            'string',
            './'
        ]
    });


if (!cli.args.length) {
    cli.debug('No keyword given, showing help');
    cli.getUsage(1);
}
var keyword = cli.args[0];
cli.debug('Finding packages with keyword ' + keyword);
var url = [
    cli.options.registry,
    '/-/_view/byKeyword?startkey=%5B%22',
    keyword,
    '%22%5D&endkey=%5B%22',
    keyword,
    '%22,%7B%7D%5D&group_level=2'
].join('');

var blacklist = [];
if (cli.options.blacklist) {
    blacklist = require(path.resolve(process.cwd(), cli.options.blacklist));
}

get(url, function (plugins) {
    plugins = JSON.parse(plugins).rows.map(function (row) {
        return row.key[row.key.length - 1];
    });
    cli.debug('Found the following plugins: \n\t' + plugins.join('\n\t'));
    plugins = plugins.filter(function (item) {
        if (blacklist.indexOf(item) === -1) {
            return true;
        } else {
            cli.debug('Plugin: "' + item + '" has been blacklisted');
            return false;
        }
    });
    cli.info('Fetching data on these plugins: \n\t' + plugins.join('\n\t'));
    plugins.forEach(function (name) {
        get(cli.options.registry + '/' + name, function (packagejson) {
            var file = path.resolve(process.cwd(), cli.options.out, name + '.json');
            cli.debug('Writing file ' + file);
            var time = Date.now();
            fs.writeFile(file, packagejson, function (err) {
                if (err) { throw err; }
                cli.info('Written: ' + file + ' (' + (Date.now() - time) + 'ms)');
            });
        });
    });
});
