

const process = require('process');
const tf      = require('@tensorflow/tfjs');

var job;

async function main(){

  await require('dcp-client').init(process.argv);

  const compute = require('dcp/compute');
  const wallet = require('dcp/wallet');
  const dcpCli = require('dcp/dcp-cli');

  const argv = dcpCli.base([
    '\x1b[33mThis application is for testing.\x1b[37m'
  ].join('\n')).argv;
  
  const identityKeystore = await dcpCli.getIdentityKeystore();
  wallet.addId(identityKeystore);

  const accountKeystore = await dcpCli.getAccountKeystore();

  console.log("Loaded Keystore");
  
  job = compute.for([...Array(1).keys()], async function(sim_id){
    
    progress(0.01);
    console.log("Beginning require with index: ", sim_id);
    try{
      var tf = require('tfjs');
      var { getModel } = require('prestriate');
      progress(0.5);
      console.log(tf.version);
      let model = await getModel();

      progress(0.6);
      let t = model.predict(tf.randomNormal([1,416,416,3]))
      progress(0.7);
      console.log(t);
    }catch(err){
      console.log(err);
    }
    progress(1.0);
    return "Done Require";     
  });

  console.log('Deploying Job!');

  job.on('accepted', ()=>{
    console.log('Job accepted....');
  });

  job.on('status', (status)=>{
    console.log('Got a status update: ', status);
  });

  job.on('result', (value) =>{
    console.log('Got a result: ', value.result);
  });

  job.on('console', (Output) => {
    console.log(Output.message);
  });

  job.on('error', (err)=>{
    console.log(err);
  });

  job.on('uncaughException', (Output) =>{
    console.log(Output);
  });

  job.requires('aistensorflow/tfjs');
  job.requires('aisight/prestriate');
  job.public.name = 'DCP-tfjs_utils-Test';
  await job.exec(compute.marketValue, accountKeystore);

  console.log("Done!");

};




main().then( ()=> process.exit(0)).catch(e=>{console.error(e);job.cancel();console.log("Cancelled Job.");process.exit(1)});
