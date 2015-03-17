This is a quick and dirty utility to fetch data about npm packages.

```
Usage:
  npm-plugin-fetcher [OPTIONS] keyword

Options:
  -r, --registry [STRING]Registry to use (Default is https://registry.npmjs.com)
  -b, --blacklist STRING A blacklist JSON file to use
  -o, --out [STRING]     The output directory to put files into (must exist!)  (Default is ./)
  -k, --no-color         Omit color from output
      --debug            Show debug information
  -v, --version          Display the current version
  -h, --help             Display help and usage details
```

Typically you'd use it if you're building a static site's plugin-listing, for
example [Grunt's plugin page](http://gruntjs.com/plugins),
[Gulp's plugin page](http://gulpjs.com/plugins/) or
[Chai's plugin page](http://chaijs.com/plugins).

It fetches a list of npm plugin names by a keyword present in all JSON files,
and then downloads their package.json files.

For example:

```bash
$ npm-plugin-fetcher chai-plugins -o ./plugins/
INFO: Fetching data on these plugins:
    chai-change
    chai-checkmark
    chai-fireproof
    ...
INFO: Written: ./plugins/chai-change.json (2ms)
INFO: Written: ./plugins/chai-fireproof.json (2ms)
INFO: Written: ./plugins/chai-checkmark.json (1ms)
...
```

These can then either be picked up by an API, or by a static site generator
(perhaps [Jekyll](http://jekyllrb.com/docs/datafiles/)).

### Under the hood

The script first fetches a URL like:

```
https://registry.npmjs.com/-/_view/byKeyword?startkey=%5B%22chai-plugin%22%5D&endkey=%5B%22chai-plugin%22,%7B%7D%5D&group_level=2
```

Then iterates over the plugin names, and fetches the npm registry entries for
each one, for example:

```
https://registry.npmjs.com/chai-change
https://registry.npmjs.com/chai-fireproof
https://registry.npmjs.com/chai-checkmark
...
```

The contents of the latter requests are just written out to JSON. They look like
the `package.json` files that are published - but have loads of extra goodies,
such as the README file, and a list of all versions, etc.

### Blacklists

If you dont want packages to be downloaded, but that appear in searches, just
make a blacklist.json, that looks like this:

```
['nasty-plugin', 'security-breach', 'not-really-a-plugin']
```

And those package names will not be downloaded.
