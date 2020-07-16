# TFJS Utils


## Serialization of TFJS model.json and bins

The following script will generate an $OUTPUTFILE.js which is DCP compatible.
```bash
node ./src/serializeModel.js -i $INPUT_MODEL.json -o $OUTPUTFILE.js -d
```

If you remove the -d flag, you will have a node compliant module.
