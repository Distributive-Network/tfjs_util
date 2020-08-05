# TFJS Utils


## Serialization of TFJS model.json and bins

The following script will generate and publish a dcp module with the serialized tfjs model. 
```bash
node ./src/serializeModel.js -m $INPUT_MODEL.json -o $OUTPUTFILE.js/$MODULENAME -d
```
If you remove the -d flag, you will have a node compliant module that will be saved at $OUTPUTFILE location.

Additionally, you can specify which identity key and bank keystore you will be using by using the following command:

```bash
node ./src/serializeModel.js -I $PATHTOID.keystore --default-bank-account-file $PATHTOBANKACCOUNT.keystore -m $INPUT_MODEL.json -o $OUTPUTFILE.js/$MODULENAME -d
```

