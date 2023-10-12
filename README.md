# !! Mongo On !!
Multi-tenant wrapper for [`mongoose`](https://mongoosejs.com/).
Once DB models is created use mongoose documentation for further use [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)


## Install
```
npm i @bootloader/mongon --save
```

## Configure
in `.env` or `config/local.properties`
```.ini
####### MONGODB ##############
## DB Credentials
mongodb.url = mongodb://<username>:<password>@<host>:27017/<db>?authSource=admin&authMechanism=SCRAM-SHA-1&maxPoolSize=20&retryWrites=false

## Prefix for DB eg:- tnt_ default is none, domain parameter will be used as it is for dbname
mongodb.db.prefix=

mongodb.debug=false

## ssl configuration
mongodb.secured.enabled=false
mongodb.secured.ssl=true
mongodb.secured.sslValidate=true

## Path to ssl certificate
mongodb.secured.sslCA=./rds-combined-ca-bundle.pem

```

## Add Schema
Usually in your `app/schema` folder, you will have schema file `sample_schema.js`
```javascript
const mongon = require('@bootloader/mongon');
module.exports = mongon.Schema({  
        //Message
        "type" : { type : String },
        "title" :{ type : String },
        "message" :{ type : String },
        //STAMPS
        "createdAt" : mongon.Schema.Types.Mixed,
        "readAt" : mongon.Schema.Types.Mixed,
        "active" :  Boolean,
},{ 
        minimize: false , collection: 'SAMPLE'
});
```


## Use API
```javascript
const mongon = require('@bootloader/mongon')
const SampleScheme = require('../schema/sample_schema');

module.exports = {
    async findAll(){
        let SampleModel = mongon.model(SampleScheme); // Get Model
        let doc = await SampleModel.find(); // Find Model with mongoose API's
        return doc;
    },
    async save({type,message}){  // Save to Default DB
        let SampleModel = mongon.model(SampleScheme,{}); 
        let doc = await SampleModel.save({
            type,message
        });
        return doc;
    },
    async saveToDifferent({type,message},tenant){  // Save to Another DB
        let SampleModel = mongon.model(SampleScheme,{
            domain : tenant
        });
        let doc = await SampleModel.save({
            type,message
        });
        return doc;
    }
}
```
