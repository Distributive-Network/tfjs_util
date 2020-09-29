#!/usr/bin/env node

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const _sizeof = require('object-sizeof');
const tfn = require('@tensorflow/tfjs-node');
const tf = require('@tensorflow/tfjs');
const btoa = require('btoa');
require('dcp-client').initSync(process.argv);
const dcpCli = require('dcp/dcp-cli');

const argv = dcpCli.base([
  '\x1b[33mThis application serializes tfjs model.json\'s into files which can be used in a dcp environment. It is also able to upload it to a DCP package manager.\x1b[37m'
].join('\n'))
  .options({
    model: {
      describe: 'Input model.json to serialize.',
      type: 'string',
      demand: true,
      alias: 'm'
    },
    packageVersion: {
      describe: 'Version number to upload package with',
      type: 'string',
      demand: false,
      alias: 'p',
      default: '1.0.0'
    },
    output: {
      describe: 'If the dcpify flag is set, this is the packagename/filename where the model will be published on DCP. If the dcpify flag is not set, this is the path where the serialized model will be written.',
      type: 'string',
      demand: true,
      alias: 'o'
    },
    dcpify: {
      describe: 'Publish and dcpify?',
      type: 'boolean',
      default: false,
      alias: 'd'
    },
    onnx: {
      describe: 'Specify that this is an onnx model',
      type: 'boolean',
      default: false,
      alias: 'x'
    },
  }).argv;





/**
 * _atob  A polyfill for atob
 *
 * @param string
 * @returns {string}
 */
function _atob (string) {
  var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  string = String(string).replace(/[\t\n\f\r ]+/g, ""); 
  // Adding the padding if missing, for semplicity
  string += "==".slice(2 - (string.length & 3));
  var bitmap, result = "", r1, r2, i = 0;
  for (; i < string.length;) {
    bitmap = b64.indexOf(string.charAt(i++)) << 18 | b64.indexOf(string.charAt(i++)) << 12
            | (r1 = b64.indexOf(string.charAt(i++))) << 6 | (r2 = b64.indexOf(string.charAt(i++)));

    result += r1 === 64 ? String.fromCharCode(bitmap >> 16 & 255)
            : r2 === 64 ? String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255)
            : String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255, bitmap & 255);
  }
  return result;
}



/**
 * sizeof Gives the size of an object in MB.
 *
 * @param {object} - The object to measure the size of. 
 * @returns {undefined}
 */
function sizeof(b){
  return _sizeof(b)/1e6;
};

/**
 * abtostr Turns an array buffer into a string.
 *
 * @param {ArrayBuffer} ab - The array buffer to serialize.
 * @returns {string} -  The serialized array buffer.
 */
function abtostr(ab){
  let binary = '';
  var ui8 = new Uint8Array(ab);
  const mss = 9999 //This is the _vm_fun_maxargs from serialize.js
  let segments = [];
  let s = '';
  for (let i = 0; i<ui8.length/mss;i++){
    segments.push(String.fromCharCode.apply(null, ui8.slice(i * mss, (i+1) * mss))); 
  };
  s = segments.join('');
  return btoa(s);
};

/**
 * strtoab  Turns a string to an array buffer
 *
 * @param {string} str - The string to serialize
 * @returns {ArrayBuffer} - The array buffer.
 */
function strtoab(str){
  let strin = _atob(str);
  var binaryArray = new Uint8Array(strin.length);
  for (let i = 0; i < strin.length; ++i){
    binaryArray[i] = strin.charCodeAt(i);
  };
  return binaryArray.buffer;
};

/**
 * onnx_main   The main function which runs the serialization of the model
 * 
 *        into a script.
 *
 * @returns {undefined}
 */
async function onnx_main(){
  const modelPath = argv.m;
  const outputPath = argv.o;
  const dcpify     = argv.d;

  const modelBinary = fs.readFileSync(modelPath);

  let modelStr = abtostr(modelBinary.buffer);
  
  let modelSerial = JSON.stringify(modelStr);
  let _atobSTRING   = _atob.toString();
  let strtoabSTRING = strtoab.toString(); 

  let outString =`\n`;
 
  outString    +=`let modelSerial = \`${modelSerial}\`;\n\n`;
  outString    +=`\n${_atobSTRING}\n\n`;
  outString    +=`\n${strtoabSTRING}\n\n`;
  outString    +=`async function getModel(){
  let modelStr = JSON.parse(modelSerial);
  const modelBinary = strtoab(modelStr);
  return modelBinary;
};\n\n`;

  outString    +=`exports.getModel = getModel;\n\n`;
  
  if (argv.d){
    outString = `//This module was created by the tfjs_util library from AITF\nmodule.declare([], function(require, exports, module) {\n` + outString;
    outString+= `});//this concludes module definition\n`;

    let tempFileName = require('crypto').randomBytes(64).toString('hex') + '.js';
    let tempFilePath = '/tmp/' + tempFileName;

    fs.writeFileSync(tempFilePath, outString);
    let pkgInfo = outputPath.split('/');
    assert(pkgInfo.length < 3);
    let packageName = pkgInfo[0];
    let packageFile = pkgInfo[1];
   
    let pkg = {
      name: `${packageName}`,
      version: argv.p,
      files: {}
    };

    pkg.files[tempFilePath] = packageFile; 

    await require('dcp/publish').publish(Object.assign({}, pkg));
    console.log("Module published at : ", pkg.name + '/' + pkg.files[tempFilePath]);
    fs.unlinkSync(tempFilePath);  
  }else{
    fs.writeFileSync(outputPath, outString,'utf8');
  };
};






/**
 * tf_main   The main function which runs the serialization of the model
 *        into a script.
 *
 * @returns {undefined}
 */
async function tf_main(){
  const modelPath = argv.m;
  const outputPath = argv.o;
  const dcpify     = argv.d;

  const modelArtifacts = await tfn.io.fileSystem(modelPath).load();

  modelArtifacts.weightData = abtostr(modelArtifacts.weightData);
  
  let modelSerial = JSON.stringify(modelArtifacts);
  let _atobSTRING   = _atob.toString();
  let strtoabSTRING = strtoab.toString(); 

  let outString =`let tf = require('@tensorflow/tfjs');\n`;
  if (argv.d){
    outString =`let tf = require('tfjs');\n`; //on dcp, we get it by the filename 'tfjs'
  }
  
  outString  +=`let modelSerial = \`${modelSerial}\`;\n\n`;
  outString    +=`\n${_atobSTRING}\n\n`;
  outString    +=`\n${strtoabSTRING}\n\n`;
  outString    +=`async function getModel(){
  let modelArtifacts = JSON.parse(modelSerial);
  const weightData = strtoab(modelArtifacts.weightData);
  modelArtifacts.weightData = weightData;

  var model;
  try{
    model = await tf.loadLayersModel( tf.io.fromMemory(modelArtifacts) );
  }catch(err1){
    try{
      model = await tf.loadGraphModel( tf.io.fromMemory(modelArtifacts) );
    }catch(err2){
      throw err1 + err2;
    };
  };
  return model;
};\n\n`;

  outString    +=`exports.getModel = getModel;\n\n`;
  
  if (argv.d){
    outString = `//This module was created by the tfjs_util library from AITF\nmodule.declare(['aistensorflow/tfjs'], function(require, exports, module) {\n` + outString;
    outString+= `});//this concludes module definition\n`;

    let tempFileName = require('crypto').randomBytes(64).toString('hex') + '.js';
    let tempFilePath = '/tmp/' + tempFileName;

    fs.writeFileSync(tempFilePath, outString);
    let pkgInfo = outputPath.split('/');
    assert(pkgInfo.length < 3);
    let packageName = pkgInfo[0];
    let packageFile = pkgInfo[1];
   
    let pkg = {
      name: `${packageName}`,
      version: argv.p,
      files: {}
    };

    pkg.files[tempFilePath] = packageFile; 

    await require('dcp/publish').publish(Object.assign({}, pkg));
    console.log("Module published at : ", pkg.name + '/' + pkg.files[tempFilePath]);
    fs.unlinkSync(tempFilePath);  
  }else{
    fs.writeFileSync(outputPath, outString,'utf8');
  };
};

if (argv.x){
  onnx_main().then(()=>{console.log("Done!")}).catch((err)=>console.error(err));
}else{
  tf_main().then(()=>{console.log("Done!")}).catch((err)=>console.error(err));
}
