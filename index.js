#!/usr/bin/env node
require('colors');
const $fs = require('fs');
const $glob = require('glob');
const $path = require('path');
const $tinify = require('tinify');
const $inquirer = require('inquirer');
const { program } = require('commander');

const ERR_NO_KEY = -1;
const ERR_DIR_NOT_EXISTS = -2;
const ERR_NO_QUOTA = -3;

let TINIFY_KEY = process.env.TINIFY_KEY;
if (!TINIFY_KEY) {
  console.error(`Please set environment variable TINIFY_KEY!`.red.bold);
  process.exit(ERR_NO_KEY);
}
$tinify.key = TINIFY_KEY;

program
  .option('-d, --directory <dir>', 'directory contains images to be compressed')
  .option('-f, --filter <pattern>', 'file name filter')
  .option('-e, --ext <pattern>', 'image file extensions')
  .option('--overwrite', 'overwrite original file');

program.parse(process.argv);

let workingDir = process.cwd();
if (program.directory) {
  workingDir = $path.resolve(program.directory);
  if (!$fs.existsSync(workingDir)) {
    console.error(`Directory ${workingDir} does not exists!`.red.bold);
    process.exit(ERR_DIR_NOT_EXISTS);
  }
}
if ($tinify.compressionCount <= 0) {
  console.error(`You don't have compression quota this month.`.red.bold)
  process.exit(ERR_NO_QUOTA);
}
const images = $glob.sync($path.join(workingDir, '**', program.filter || `*.{png,jpg}`));
if (!images.length) {
  console.log(`Nothing to comrpess`);
  process.exit(0);
}
let maxFile = images.length;
if ($tinify.compressionCount < images.length) {
  maxFile = $tinify.compressionCount;
  $inquirer.prompt({
    type: 'confirm',
    name: 'proceed',
    message: `Your compressions quota for this month is ${$tinify.compressionCount} which is not sufficient for ${images.length} files, proceed anyway?`
  }).then(answer => {
    if (answer.proceed) processImages(images)
  });
} else {
  processImages(images);
}
function processImages(images) {
  Promise.all(images.slice(0, maxFile).map(img => {
    const src = $tinify.fromFile(img);
    const ext = $path.extname(img);
    const saveTo = program.overwrite ? img : img.replace(ext, `.compressed${ext}`);
    console.log(`Compressing ${img}`);
    return src.toFile(saveTo).then(() => {
      console.log(`${img} comprssed`.green);
    });
  })).then(() => {
    console.log(`Done!`.green.bold);
    report();
  })
}
function report() {
  console.log(`${$tinify.compressionCount} Compressions used`);
}

