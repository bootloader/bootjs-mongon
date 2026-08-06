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
## DB Credentials (primary / read-write)
mongodb.url = mongodb://<username>:<password>@<host>:27017/<db>?authSource=admin&authMechanism=SCRAM-SHA-1&maxPoolSize=20&retryWrites=false

## Optional read-only / secondary URL. Falls back to mongodb.url when unset.
mongodb-ro.url = mongodb://<username>:<password>@<ro-host>:27017/<db>?authSource=admin&authMechanism=SCRAM-SHA-1&maxPoolSize=20&readPreference=secondaryPreferred&retryWrites=false

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
        // Read from readonly / secondary connection when mongodb-ro.url is set
        let SampleModelRo = mongon.ro.model(SampleScheme);
        let doc = await SampleModelRo.find();
        return doc;
    },
    async save({type,message}){  // Write to primary DB
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

### Read-only connection
```javascript
import mongon from "@bootloader/mongon";

let UserSchemaModel = mongon.model(UserSchema);       // primary (rw)
let UserSchemaModelRo = mongon.ro.model(UserSchema);   // readonly (mongodb-ro.url)

// same helpers on mongon.ro:
// mongon.ro.getCollection / mongon.ro.getModel / mongon.ro.collection / mongon.ro.database
```
If `mongodb-ro.url` is missing (or equal to `mongodb.url`), `mongon.ro` reuses the primary connection.
