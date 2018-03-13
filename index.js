#!/usr/bin/env node
'use strict'
var cli = require('cli')
var https = require('https')
var path = require('path')
var fs = require('fs')
var {URL} = require('url')

function bufferStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

function getJSON(url) {
  return new Promise((resolve) => https.get(url, resolve))
    .then(bufferStream)
    .then(JSON.parse)
}

async function getAllPages(urlBase) {
  const url = new URL(urlBase)
  url.searchParams.set('size', 1)
  url.searchParams.set('from', 0)
  cli.debug(`Getting first page: ${url}`)
  const firstPage = await getJSON(url)
  const pageCount = Math.ceil(firstPage.total / 20)
  const rest = await Promise.all(
    new Array(pageCount).fill(url).map((urlBase, i) => {
      const url = new URL(urlBase)
      url.searchParams.set('size', 20)
      url.searchParams.set('from', i * 20 + 1)
      cli.debug(`Getting page ${i}: ${url}`)
      return getJSON(url)
    })
  )
  return rest.reduce((total, page) => total.concat(page.objects), firstPage.objects)
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
    })


if (!cli.args.length) {
    cli.debug('No keyword given, showing help')
    cli.getUsage(1)
}
const keyword = cli.args[0]
cli.debug('Finding packages with keyword ' + keyword)

let blacklist = []
if (cli.options.blacklist) {
    blacklist = require(path.resolve(process.cwd(), cli.options.blacklist))
}

const url = `${cli.options.registry}/-/v1/search?text=keywords%3A${keyword}`
getAllPages(url).then(async plugins => {
  plugins = plugins.map(plugin => plugin.package.name)
  cli.debug('Found the following plugins: \n\t' + plugins.join('\n\t'))
  plugins = plugins.filter(name => {
    const isBlacklisted = blacklist.includes(name)
    if (isBlacklisted) cli.debug('Plugin: "' + name + '" has been blacklisted')
    return !isBlacklisted
  })
  cli.info('Fetching data on these plugins: \n\t' + plugins.join('\n\t'))
  return Promise.all(plugins.map(async name => {
    const res = await new Promise(resolve => https.get(`${cli.options.registry}/${name.replace(/\//g, '%2F')}`, resolve))
    const file = path.resolve(process.cwd(), cli.options.out, `${name.replace(/[^a-z]/g, '_')}.json`)
    const fileWrite = fs.createWriteStream(file)
    cli.debug('Writing file ' + file)
    res.pipe(fileWrite)
    await new Promise((resolve, reject) => fileWrite.on('end', resolve).on('error', reject))
    cli.info('Written: ' + file + ' (' + (Date.now() - time) + 'ms)')
  }))
}).catch(e => {
  console.error(e.stack || e)
  process.exit(1)
})
