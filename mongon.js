const mongoose = require('mongoose');
const config = require('@bootloader/config');
const parseMongoUrl = require('parse-mongo-url');

const { MongoMemoryServer } =  require('mongodb-memory-server');
let MongoMemoryServerInstance = null;


var mongoUrl = config.getIfPresent("mry.scriptus.mongourl","mongodb.url");
var mongoDebugQuery = !!config.getIfPresent("mry.scriptus.mongo.debug","mongodb.debug");

// mongo url sample : mongodb+srv://USER:PASS@uat-xxxx.mongodb.net/test?retryWrites=true&w=majority
mongoUrl = (function(mongoUrl){
   let c = mongoUrl.split(":");
   let at = c[2].split("@");
   at[0] = encodeURIComponent(at[0]);
   c[2] = at.join("@");
   return c.join(":");
})(mongoUrl);
console.log("mongoUrl=====> ",mongoUrl);
const MONGODB_SECURED = config.get("mongodb.secured.enabled");
console.log("MONGODB_SECURED=====> ",MONGODB_SECURED);
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ...(MONGODB_SECURED ? {
          ssl: true,
          sslValidate: true,
          sslCA: config.get("mongodb.secured.sslCA")
    } : {})
    //useCreateIndex: true,
    //useFindAndModify: false,
    //autoIndex: true,
    //poolSize: 10,
    //bufferMaxEntries: 0,
    //connectTimeoutMS: 10000,
    //socketTimeoutMS: 30000,
  };


var dbState = [{
    value: 0,
    label: "disconnected"
},
{
    value: 1,
    label: "connected"
},
{
    value: 2,
    label: "connecting"
},
{
    value: 3,
    label: "disconnecting"
}];


mongoose.connect(mongoUrl,
    mongoOptions,
() => {
    const state = Number(mongoose.connection.readyState);
    console.log(dbState.find(f => f.value == state).label, "to db"); // connected to db
    const MongonSchema = require('./mongon_schema');

    if('disconnected' == state){
        console.log("StopMockingMonogo",!!MongoMemoryServerInstance);
        if(MongoMemoryServerInstance){
            MongoMemoryServerInstance.stop();
        }
    }
});

const mongoConfig = parseMongoUrl(mongoUrl); /***** ==> {
    auth: { user: '*******', password: '*****' },
    server_options: { socketOptions: {} },
    db_options: {
      read_preference_tags: null,
      authSource: 'admin',
      authMechanism: 'SCRAM-SHA-1',
      read_preference: 'primary'
    },
    rs_options: { socketOptions: {} },
    mongos_options: {},
    dbName: 'meherybot',
    servers: [ { host: 'mongo.mongodb.io', port: 27017 } ]
  } ******/
const MONGODB_URL = mongoUrl;//`${mongoConfig.servers[0].host}:${mongoConfig.servers[0].port}`;
if(mongoDebugQuery){
    mongoose.set('debug', mongoDebugQuery);
}
const connect = (url,options) => mongoose.createConnection(url, options);

const connectToMongoDB = async () => {
    if(mongoConfig.auth.user == '<username>'){
        console.log("Mongo Configuration Missing");
        const mongoServer = await MongoMemoryServer.create();
        const db = connect(mongoServer.getUri());
        db.on('open',()=>{
            console.info(`MockDB connection open to ${mongoServer.getUri()}`);
        })
        db.on('error', (err) => {
            console.info(`MockDB connection error: ${err} with connection info ${mongoServer.getUri()}`);
            process.exit(0);
        });
        MongoMemoryServerInstance = mongoServer;
        return db;
        //return;
    } 
    const db = connect(MONGODB_URL,mongoOptions);
    db.on('open', () => {
        console.info(`Mongoose connection open to ${JSON.stringify(mongoConfig.servers[0].host)}`);
    });
    db.on('error', (err) => {
      console.info(`Mongoose connection error: ${err} with connection info ${JSON.stringify(mongoConfig.servers[0].host)}`);
      process.exit(0);
    });
    return db;
};

function QueryBuilder(){
    this.q = {};
}
QueryBuilder.prototype.key =  function(key,value){
    if(value !== undefined){
        this.q[key] = value;
    } 
}
QueryBuilder.prototype.keys =  function(keys){
    for(var k in keys){
        this.key(k,keys[k])
    }
    return this;
}
QueryBuilder.prototype.where =  function(options,values){
    if(typeof options === 'object'){
        this.keys(options);
    } else if(typeof options === 'string'){
        this.key(options,values)
    }
    return this;
}

QueryBuilder.prototype.query =  function(k){
    return this.q;
}

module.exports = function(){
    let factory =  null;
    (async () => {
        factory = await connectToMongoDB();
    })();
    return {
        QueryBuilder : QueryBuilder,
        database(dbName){
            if(!factory){
                throw Error("NODB")
            }
            return factory.useDb(dbName, { useCache: true });
        },
        throwError (code, error){
            console.error(code, error)
        }
    }
}();
