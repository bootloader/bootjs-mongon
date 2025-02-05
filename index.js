const mongoose = require('mongoose');
const { QueryBuilder, database, throwError} = require('./mongon');
const config = require('@bootloader/config');
const log4js = require("@bootloader/log4js");
var logger = log4js.getLogger('mongon');

const db_prefix = config.getIfPresent('mongodb.db.prefix');
const db_domain = config.getIfPresent('mongodb.db.domain');

const getTenantDB = ({ dbDomain, domain, dbPrefix,dbName, collectionName, schema}) => {
    dbPrefix = dbPrefix || db_prefix;
    dbDomain = dbDomain || domain || db_domain;
    dbName = dbName || (`${dbPrefix}${domain}`)
    if (database) {
      // useDb will return new connection
      const db = database(dbName);
      console.info(`DB switched to ${dbName}`);
      if(collectionName && schema){
        if (!db.models[collectionName]) { // Check if model already exists
            console.info(`DB collectionName : ${collectionName}`);
            db.model(collectionName, schema);
        }
      }
      return db;
    }
    return throwError(500, 'no database');
};

module.exports = {
    getCollection (domain, collectionName, schema, options={}){
        console.info(`getCollectionByTenant tenantId : ${domain}.`);
        const tenantDb = getTenantDB({
            domain, collectionName, schema,
            ...options
        });
        return tenantDb.collection(collectionName);
    },
    getModel (domain, collectionName, schema, options = {}){
        console.info(`getModelByTenant tenantId : ${domain}.`);
        const tenantDb = getTenantDB({
            domain, collectionName, schema,
            ...options
        });
        return tenantDb.model(collectionName);
    },
    model (schema, options={}){
        let { domain , collection } = options || {};
        let collectionName = collection || schema.options.collection;
        const tenantDb = getTenantDB({
                dbDomain:domain, collectionName, schema,
                ...options
        });
        return tenantDb.model(collectionName);
    },
    collection (schema, options={}){
        let { domain , collection  } = options || {};
        let collectionName = collection || schema.options.collection;
        const tenantDb = getTenantDB({
            domain, collectionName, schema,
            ...options
        });
        return tenantDb.collection(collectionName);
    },
    Schema : mongoose.Schema,
    QueryBuilder,database,throwError
}
