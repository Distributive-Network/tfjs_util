# TFJS Utils


## Serialization of TFJS model.json and bins

The following script will generate and publish a dcp module with the serialized tfjs model. 
```bash
./bin/serializeModel.js -m $INPUT_MODEL.json -o $MODULENAME/$FILENAME -p 1.0.0 -d
```
If you remove the -d flag, you will have a node compliant module that will be saved at $OUTPUTFILE location.

Additionally, you can specify which identity key and bank keystore you will be using by using the following command:

```bash
./bin/serializeModel.js -I $PATHTOID.keystore --default-bank-account-file $PATHTOBANKACCOUNT.keystore -m $INPUT_MODEL.json -o $OUTPUTFILE.js/$MODULENAME -p 1.0.0 -d
```

Due to certain current restrictions in the package manager, it is important to also mark the version number using the `-p` command. If you have tried to publish before and are getting versioning errors, please increase the version number in the `-p` flag.


## Large Models

For large models, (any model larger than 60MB) can be uploaded using the sharding flag. It's important to note that sharding will always publish to dcp as sharding has no use in local files. The following command is an example of sharding:

```bash
./bin/serializeModel.js -m $INPUT_MODEL.json -o $MODULENAME/$FILENAME -p 1.0.0 -d -s
```

