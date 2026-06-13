const parseMongoUrl = require("parse-mongo-url");
const config = require("@bootloader/config");

const MONGODB_SECURED = config.getIfPresent("mongodb.secured.enabled") || false;

var dbState = [
  {
    value: 0,
    label: "disconnected",
  },
  {
    value: 1,
    label: "connected",
  },
  {
    value: 2,
    label: "connecting",
  },
  {
    value: 3,
    label: "disconnecting",
  },
];

module.exports = {
  clean_url: function (mongoUrl) {
    if (!mongoUrl.includes("@")) {
      // No username/password → DO NOTHING
      return mongoUrl;
    }
    let c = mongoUrl.split(":");
    if (c.length > 2) {
      // Make sure there's a part containing user:password@host
      let userPassHost = c[2];
      const lastAtIndex = userPassHost.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        // Split only at the last "@"
        const password = userPassHost.substring(0, lastAtIndex);
        const host = userPassHost.substring(lastAtIndex + 1);
        const encodedPassword = encodeURIComponent(password);
        c[2] = encodedPassword + "@" + host;
      } else {
        // no @ in c[2]
        c[2] = encodeURIComponent(c[2]);
      }
    }
    return c.join(":");
  },
  parse_url: function (mongoUrl) {
    const parsedUrl = parseMongoUrl(mongoUrl);
    /***** ==> {
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
    return parsedUrl;
  },
  mongo_options() {
    let mongoOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ...(MONGODB_SECURED
        ? {
            ssl: true,
            sslValidate: true,
            sslCA: config.get("mongodb.secured.sslCA"),
          }
        : {}),
      //useCreateIndex: true,
      //useFindAndModify: false,
      //autoIndex: true,
      //poolSize: 10,
      //bufferMaxEntries: 0,
      //connectTimeoutMS: 10000,
      //socketTimeoutMS: 30000,
    };

    return mongoOptions;
  },

  connection_state: function (state) {
    return dbState.find((f) => f.value == state).label;
  }

};
