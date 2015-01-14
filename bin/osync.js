#!/usr/bin/env node
var path = require('path');

var program = require('commander');
var chalk = require('chalk');

var ossSync = require('../lib/sync');

program
  .description('Sync Aliyun OSS bucket')
  .usage('<config file ...>')
  .version(require('../package.json').version)

program.parse(process.argv);

if (program.args.length > 1) {
  program.help()
}

var configFile = program.args[0] || '.oss-sync.json';
try {
  var config = require(path.resolve(process.cwd(), configFile))
} catch (e) {
  console.log();
  console.log(chalk.red('    Failed to load config file'));
  console.log();
  process.exit();
}

var sync = ossSync(config);

console.log();
sync.exec()
  .then(function () {
    console.log();
    console.log('    ' + chalk.cyan('Sync completed'));
    console.log();
  })
  .catch(function (err) {
    console.log();
    console.log('    ' + chalk.bgRed('Error occurred:'));
    console.log();
    console.log('    ' + chalk.red(err));
    console.log();
  })