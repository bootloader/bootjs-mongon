const mongoose = require('mongoose');
const { QueryBuilder, database, throwError, dbConfig} = require('./mongon');
const config = require('@bootloader/config');
const log4js = require("@bootloader/log4js");
var console = log4js.getLogger('mongon');
const {context} = require('@bootloader/utils');

const db_prefix = config.getIfPresent('mongodb.db.prefix') || "";
const db_domain = config.getIfPresent('mongodb.db.domain') || dbConfig.dbName || "";

const getTenantDB = ({ dbDomain, domain, dbPrefix,dbName, db, collectionName, schema}) => {
    console.debug(`DB:getTenantDB({
        dbDomain:${dbDomain}, domain:${domain}, dbPrefix:${dbPrefix}, dbName:${dbName},
        collectionName:${collectionName}, schema:${schema}
    })`);
    dbPrefix = dbPrefix || db_prefix || "";
    let tnt = context.getTenant();
    tnt = ("~~~" == tnt) ? "" : tnt
    dbDomain = dbDomain || domain || tnt || db_domain || context.getTenant() || "";
    dbName = db || dbName || (`${dbPrefix}${dbDomain}`)
    console.debug(`DB:getTenantDB({
        dbDomain:${dbDomain}, domain:${domain}, dbPrefix:${dbPrefix}, dbName:${dbName},tnt:${tnt}
    })`);
    if (database) {
      // useDb will return new connection
      const db = database(dbName);
      console.debug(`DB switched to ${dbName} for ${context.getTenant()}`);
      if(collectionName && schema){
        if (!db.models[collectionName]) { // Check if model already exists
            console.debug(`DB collectionName : ${collectionName}`);
            db.model(collectionName, schema);
        }
      }
      return db;
    }
    return throwError(500, 'no database');
};

module.exports = {
    getCollection (domain, collectionName, schema, options={}){
        console.debug(`getCollectionByTenant tenantId : ${domain}.`);
        const tenantDb = getTenantDB({
            domain, collectionName, schema,
            ...options
        });
        return tenantDb.collection(collectionName);
    },
    getModel (domain, collectionName, schema, options = {}){
        console.debug(`getModelByTenant tenantId : ${domain}.`);
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
    Types : mongoose.Types,
    QueryBuilder,database,throwError
}
