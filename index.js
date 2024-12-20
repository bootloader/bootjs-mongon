const mongoose = require('mongoose');
const { QueryBuilder, database, throwError} = require('./mongon');
const config = require('@bootloader/config');

const db_prefix = config.getIfPresent('mongodb.db.prefix');
const db_domain = config.getIfPresent('mongodb.db.domain');

const getTenantDB = (domain, modelName, schema) => {
    const dbName = `${db_prefix}${domain}`;
    if (database) {
      // useDb will return new connection
      const db = database(dbName);
      //console.info(`DB switched to ${dbName}`);
      db.model(modelName, schema);
      return db;
    }
    return throwError(500, 'no database');
};

module.exports = {
    getCollection (domain, collectionName, schema){
        console.info(`getCollectionByTenant tenantId : ${domain}.`);
        const tenantDb = getTenantDB(domain, collectionName, schema);
        return tenantDb.collection(collectionName);
    },
    getModel (domain, modelName, schema){
        console.info(`getModelByTenant tenantId : ${domain}.`);
        const tenantDb = getTenantDB(domain, modelName, schema);
        return tenantDb.model(modelName);
    },
    model (schema, options){
        let { domain , collection  } = options || {};
        let collectionName = collection || schema.options.collection;
        const tenantDb = getTenantDB(domain || db_domain, collectionName, schema);
        return tenantDb.model(collectionName);
    },
    collection (schema, options){
        let { domain , collection  } = options || {};
        let collectionName = collection || schema.options.collection;
        const tenantDb = getTenantDB(domain || db_domain, collectionName, schema);
        return tenantDb.collection(collectionName);
    },
    Schema : mongoose.Schema,
    QueryBuilder,database,throwError
}
