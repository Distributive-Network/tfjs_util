const tfn = require('@tensorflow/tfjs-node');
const tf = require('data_serializer').tfjs;
const pm = require('data_serializer');
const fs = require('fs');
const yargs = require('yargs');



const argv = yargs.option(
  'd', {
    alias: 'dcp',
    describe: 'dcpify output file script?',
    type: 'boolean'
  })
  .alias('i','input')
  .describe('i','input file for model')
  .nargs('i',1)
  .alias('o','output')
  .describe('o','output file for script')
  .nargs('o',1)
  .demand('o')
  .argv;



async function main(filepath, outFilePath, dcpify){
  const loadHandler = tfn.io.fileSystem(filepath);
  var model;
  try{
    model = await tf.loadLayersModel(loadHandler);
  }catch(err){
    model = await tf.loadGraphModel(loadHandler); 
  }

  const handler = tf.io.withSaveHandler((modelArtifacts)=> { return modelArtifacts });
  let modelArtifacts = await model.save(handler);
  
  let [ message, proto ] = pm.serializeGeneric({
    modelTopology: modelArtifacts.modelTopology,
    weightSpecs: modelArtifacts.weightSpecs,
    weightData: modelArtifacts.weightData
  }, true); 

  let outFileText = `
    let pm = require('aitf_data_serializer/data_serializer');
    let tf = pm.tfjs;
    
    let message = \`${message}\`;
    let proto   = \`${proto}\`;

    let modelArtifacts = pm.deserializeGeneric( message, proto );


    async function getModel(){
      let model;

      try{
        model = await tf.loadLayersModel( tf.io.fromMemory( modelArtifacts ) );
      }catch(err1){
        try{
          model = await tf.loadGraphModel( tf.io.fromMemory( modelArtifacts ) );
        }catch(err2){
          throw "could not load model";
        }
      }
      return model;
    };

    exports.getModel = getModel;

  `;

  if (dcpify){

    let modulePrefix = `//This module was created by the tfjs utils library from AITF\nmodule.declare(['aitf_data_serializer/data_serializer'], function(require, exports, module) {`;
    let modulePostfix = `\n});//this concludes module definition`;

    outFileText = modulePrefix + outFileText + modulePostfix;
  };

  fs.writeFileSync(outFilePath, outFileText); 

};

main(argv.i, argv.o, argv.d).then(()=>{console.log("Done")}).catch((err)=>{console.error(err)});
