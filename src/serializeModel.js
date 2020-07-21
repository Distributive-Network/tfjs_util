const assert = require('assert');
const path = require('path');
const fs = require('fs');
const _sizeof = require('object-sizeof');
const tfn = require('@tensorflow/tfjs-node');
const tf = require('@tensorflow/tfjs');
const atob = require('atob');
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
    }
  }).argv;

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
  let strin = atob(str);
  var binaryArray = new Uint8Array(strin.length);
  for (let i = 0; i < strin.length; ++i){
    binaryArray[i] = strin.charCodeAt(i);
  };
  return binaryArray.buffer;
};


/**
 * main   The main function which runs the serialization of the model
 *        into a script.
 *
 * @returns {undefined}
 */
async function main(){
  const modelPath = argv.m;
  const outputPath = argv.o;
  const dcpify     = argv.d;

  const modelArtifacts = await tfn.io.fileSystem(modelPath).load();

  modelArtifacts.weightData = abtostr(modelArtifacts.weightData);
  
  const modelSerial = JSON.stringify(modelArtifacts);

  let strtoabSTRING = strtoab.toString();
  let outString =`let tf = require('@tensorflow/tfjs');\n`;
  if (argv.d){
    outString =`let tf = require('tfjs');\n`; //on dcp, we get it by the filename 'tfjs'
  }
  outString    +=`let modelSerial = \`${modelSerial}\`;\n\n`;
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
      version: '1.0.0',
      files: {}
    };

    pkg.files[tempFilePath] = packageFile; 

    await require('dcp/publish').publish(Object.assign({}, pkg));
    console.log("Module published at : ", pkg.name + '/' + pkg.files[tempFilePath]);
  
  }else{
    fs.writeFileSync(outputPath, outString,'utf8');
  };
};


main().then(()=>{console.log("Done")}).catch((err)=>{console.error(err)});
