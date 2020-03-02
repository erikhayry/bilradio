const fs = require('fs');
const path = require('path');
const manifestPath = './manifest.json';
const manifest = require(manifestPath);
const semver = require('semver');
const _ = require('lodash');
const filesToCopy = [
    'icons/off.png',
    'icons/off@2x.png',
    'icons/microphone.svg',
    'dist/player.js'
];

function map(data){
    if(data.length !== undefined){
        return data.map(traverse)
    }

    return _.mapValues(data, traverse)
}

function traverse(obj){
    if(typeof obj !== 'object'){
        if(obj.indexOf){
            const isFile = fileTypes.some(fileType => obj.indexOf(fileType) > -1);

            if(isFile){
                filesToCopy.push(obj);
            }
        }

        return obj
    } else {
        return map(obj)
    }
}

const versionInc = process.env.version || 'patch';
const newVersion = semver.inc(manifest.version, versionInc);

const fileTypes = [
    'js',
    'html',
    'png',
    'svg',
    'woff2'
];


map(manifest);
const newManifest = JSON.stringify({
    ...manifest,
    version: newVersion
}, null,'\t');

function copyFileSync(source, target) {
    const targetFolderPath = path.dirname(target);
    fs.mkdirSync(targetFolderPath, {recursive: true});
    fs.copyFile(source, target, (err) => {
        if (err) throw err;
    });
}


var dir = `${__dirname }/product/profiler-[${newVersion}]`;
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}
fs.writeFileSync(dir + '/manifest.json', newManifest, 'UTF-8');
filesToCopy.forEach(filePath => {
    copyFileSync(`${__dirname }/${filePath}`, `${dir}/${filePath}`);
});
fs.writeFileSync(manifestPath, newManifest, 'UTF-8');
