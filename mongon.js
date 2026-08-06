const mongoose = require("mongoose");
const config = require("@bootloader/config");
const log4js = require("@bootloader/log4js");
var logger = log4js.getLogger("mongon");
const mongoUtils = require("./mongo_utils.js");

const { MongoMemoryServer } = require("mongodb-memory-server");
let MongoMemoryServerInstance = null;

var mongoUrl = config.getIfPresent("mongodb.url", "mry.scriptus.mongourl");
var mongoRoUrl = config.getIfPresent("mongodb-ro.url");
var MONGO_GLOBAL = config.getIfPresent("mongodb.global");

var mongoDebugQuery = !!config.getIfPresent(
  "mry.scriptus.mongo.debug",
  "mongodb.debug",
);

if (mongoDebugQuery) {
  logger.level = "debug";
}
// mongo url sample : mongodb+srv://USER:PASS@uat-xxxx.mongodb.net/test?retryWrites=true&w=majority
mongoUrl = mongoUtils.clean_url(mongoUrl);
if (mongoRoUrl) {
  mongoRoUrl = mongoUtils.clean_url(mongoRoUrl);
}

logger.debug("MONGODB_URL=====> ", mongoUrl);
logger.debug("MONGODB_RO_URL=====> ", mongoRoUrl || "(fallback to primary)");
const mongoOptions = mongoUtils.mongo_options();
console.log("mongoOptions", mongoOptions);

if (MONGO_GLOBAL) {
  mongoose.connect(mongoUrl, mongoOptions, () => {
    const state = Number(mongoose.connection.readyState);
    logger.debug(mongoUtils.connection_state(state), "to db"); // connected to db
    const MongonSchema = require("./mongon_schema");

    if ("disconnected" == state) {
      logger.info("StopMockingMonogo", !!MongoMemoryServerInstance);
      if (MongoMemoryServerInstance) {
        MongoMemoryServerInstance.stop();
      }
    }
  });
}

const mongoConfig = mongoUtils.parse_url(mongoUrl);
console.log("mongoConfig", mongoConfig);
const MONGODB_URL = mongoUrl; //`${mongoConfig.servers[0].host}:${mongoConfig.servers[0].port}`;
if (mongoDebugQuery) {
  mongoose.set("debug", mongoDebugQuery);
}
const connect = (url, options) => mongoose.createConnection(url, options);

const connectToMongoDB = async ({ url, label = "primary", allowMock = false } = {}) => {
  const parsed = mongoUtils.parse_url(url);
  const missingCreds = parsed.auth?.user == "<username>" || !url;

  if (missingCreds && allowMock) {
    logger.warn("Mongo Configuration Missing");
    const mongoServer = await MongoMemoryServer.create();
    const db = connect(mongoServer.getUri());
    db.on("open", () => {
      logger.info(`MockDB connection open to ${mongoServer.getUri()}`);
    });
    db.on("error", (err) => {
      logger.info(
        `MockDB connection error: ${err} with connection info ${mongoServer.getUri()}`,
      );
      process.exit(0);
    });
    MongoMemoryServerInstance = mongoServer;
    return db;
  }

  if (missingCreds) {
    throw new Error(`Mongo ${label} configuration missing`);
  }

  const db = connect(url, mongoOptions);
  db.on("open", () => {
    logger.info(
      `Mongoose ${label} connection open to ${JSON.stringify(
        parsed.servers?.[0]?.host,
      )}`,
    );
  });
  db.on("error", (err) => {
    logger.error(
      `Mongoose ${label} connection error: ${err} with connection info ${JSON.stringify(
        parsed.servers?.[0]?.host,
      )}`,
    );
    process.exit(0);
  });
  return db;
};

function QueryBuilder() {
  this.q = {};
}
QueryBuilder.prototype.key = function (key, value) {
  if (value !== undefined) {
    this.q[key] = value;
  }
};
QueryBuilder.prototype.keys = function (keys) {
  for (var k in keys) {
    this.key(k, keys[k]);
  }
  return this;
};
QueryBuilder.prototype.where = function (options, values) {
  if (typeof options === "object") {
    this.keys(options);
  } else if (typeof options === "string") {
    this.key(options, values);
  }
  return this;
};

QueryBuilder.prototype.query = function (k) {
  return this.q;
};

function createDatabaseAccessor(getFactory, label) {
  return function database(dbName) {
    const factory = getFactory();
    if (!factory) {
      throw Error(label === "ro" ? "NODB_RO" : "NODB");
    }
    return factory.useDb(dbName, { useCache: true });
  };
}

module.exports = (function () {
  let factory = null;
  let factoryRo = null;

  (async () => {
    factory = await connectToMongoDB({
      url: MONGODB_URL,
      label: "primary",
      allowMock: true,
    });
    logger.info("connectToMongoDB:Success");

    if (mongoRoUrl && mongoRoUrl !== MONGODB_URL) {
      factoryRo = await connectToMongoDB({
        url: mongoRoUrl,
        label: "readonly",
        allowMock: false,
      });
      logger.info("connectToMongoDB(ro):Success");
    } else {
      factoryRo = factory;
      logger.info("connectToMongoDB(ro):using primary connection");
    }
  })();

  return {
    dbConfig: {
      dbName: mongoConfig.dbName,
    },
    QueryBuilder: QueryBuilder,
    database: createDatabaseAccessor(() => factory, "primary"),
    databaseRo: createDatabaseAccessor(() => factoryRo, "ro"),
    throwError(code, error) {
      console.error(code, error);
    },
  };
})();
