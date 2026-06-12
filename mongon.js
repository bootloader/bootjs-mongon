const mongoose = require("mongoose");
const config = require("@bootloader/config");
const log4js = require("@bootloader/log4js");
const { MongoMemoryServer } = require("mongodb-memory-server");

const logger = log4js.getLogger("mongon");
let MongoMemoryServerInstance = null;

/* Helper functions start */

function configBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }

  return value === 1;
}

function encodeCredential(value) {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch (error) {
    return encodeURIComponent(value);
  }
}

function normalizeMongoUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const mongoUrl = value.trim();
  const match = mongoUrl.match(/^(mongodb(?:\+srv)?:\/\/)([^/?#]*)(.*)$/i);
  if (!match) {
    return mongoUrl;
  }

  const authority = match[2];
  const atIndex = authority.lastIndexOf("@");
  if (atIndex === -1) {
    return mongoUrl;
  }

  const credentials = authority.substring(0, atIndex);
  const hosts = authority.substring(atIndex + 1);
  const separatorIndex = credentials.indexOf(":");
  const username =
    separatorIndex === -1
      ? credentials
      : credentials.substring(0, separatorIndex);
  const password =
    separatorIndex === -1 ? null : credentials.substring(separatorIndex + 1);
  const encodedCredentials =
    password === null
      ? encodeCredential(username)
      : `${encodeCredential(username)}:${encodeCredential(password)}`;

  return `${match[1]}${encodedCredentials}@${hosts}${match[3]}`;
}

function decodeCredential(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function inspectMongoUrl(mongoUrl) {
  if (!mongoUrl) {
    return { auth: null, dbName: "admin", host: null };
  }

  const match = mongoUrl.match(
    /^mongodb(?:\+srv)?:\/\/([^/?#]*)(?:\/([^?#]*))?/i,
  );
  if (!match) {
    return { auth: null, dbName: "admin", host: null };
  }

  const authority = match[1];
  const atIndex = authority.lastIndexOf("@");
  const credentials = atIndex === -1 ? null : authority.substring(0, atIndex);
  const hosts = atIndex === -1 ? authority : authority.substring(atIndex + 1);
  const separatorIndex = credentials ? credentials.indexOf(":") : -1;
  const auth = credentials
    ? {
        user: decodeCredential(
          separatorIndex === -1
            ? credentials
            : credentials.substring(0, separatorIndex),
        ),
      }
    : null;

  if (auth && separatorIndex !== -1) {
    auth.password = decodeCredential(credentials.substring(separatorIndex + 1));
  }

  return {
    auth,
    dbName: decodeCredential(match[2] || "admin"),
    host: hosts.split(",")[0] || null,
  };
}

/* Helper functions end */

const mongoUrl = normalizeMongoUrl(
  config.getIfPresent("mongodb.url", "mry.scriptus.mongourl"),
);
const mongoConfig = inspectMongoUrl(mongoUrl);
const mongoDebugQuery = configBoolean(
  config.getIfPresent("mry.scriptus.mongo.debug", "mongodb.debug"),
);
const mongodbSecured = configBoolean(
  config.getIfPresent("mongodb.secured.enabled"),
);

if (mongoDebugQuery) {
  logger.level = "debug";
  mongoose.set("debug", true);
}

logger.debug("MongoDB configuration", {
  host: mongoConfig.host,
  dbName: mongoConfig.dbName,
  secured: mongodbSecured,
});

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ...(mongodbSecured
    ? {
        ssl: true,
        sslValidate: true,
        sslCA: config.get("mongodb.secured.sslCA"),
      }
    : {}),
};

function addConnectionLogging(db, description) {
  db.on("open", () => {
    logger.info(`${description} connection open`);
  });
  db.on("error", (error) => {
    logger.info(`${description} connection error`, error);
  });
  return db;
}

function connectToMongoDB() {
  if (mongoConfig.auth?.user === "<username>" || !mongoUrl) {
    logger.info("Mongo Configuration Missing");
    const db = addConnectionLogging(mongoose.createConnection(), "MockDB");
    MongoMemoryServer.create()
      .then((mongoServer) => {
        MongoMemoryServerInstance = mongoServer;
        return db.openUri(mongoServer.getUri());
      })
      .catch((error) => {
        logger.info("MockDB startup failed", error);
      });
    return db;
  }

  return addConnectionLogging(
    mongoose.createConnection(mongoUrl, mongoOptions),
    `Mongoose (${mongoConfig.host || "configured host"})`,
  );
}

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
QueryBuilder.prototype.query = function () {
  return this.q;
};

module.exports = (function () {
  let factory = null;

  try {
    factory = connectToMongoDB();
  } catch (error) {
    logger.info("connectToMongoDB:Failed", error);
  }

  return {
    dbConfig: {
      dbName: mongoConfig.dbName,
    },
    QueryBuilder: QueryBuilder,
    database(dbName) {
      if (!factory) {
        throw Error("NODB");
      }
      return factory.useDb(dbName, { useCache: true });
    },
    throwError(code, error) {
      console.error(code, error);
    },
  };
})();
