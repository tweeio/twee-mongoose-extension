/**
 * Mongoose extension for Twee.IO
 *
 * Allows to establish multiply connections to different databases with aliases support
 * Allows to create models and attach them to each-other as nested
 *
 * Usage:
 *      var User = twee.get('mongoose').getModel('frontend/User');
 *      User.find({}, function(err, records){
            console.log(records);
        });
 */
module.exports.extension = function() {
    "use strict";

    var mongoose = require('mongoose')
        , fs = require('fs')
        , databases = {}
        , modelProvider = {}
        , config = twee.getConfig('twee:extension:twee-mongoose')
        , mongooseFolders = twee.getModulesFolders(config['modelsFolders']);

    if (!config['databases'] || !(config['databases'] && config['databases'] instanceof Object)) {
        return;
    }

    var dbName;

    for (dbName in config['databases']) {
        var dbConfig = config['databases'][dbName],
            connectionString = String(dbConfig['connection']).trim()
            , connectionOptions = dbConfig['options'] || {};

        if (!connectionString) {
            throw new Error('Mongoose connection string for database "' + dbName + '" is incorrect');
        }

        databases[dbName] = mongoose.createConnection(connectionString, connectionOptions);

        databases[dbName].once('open', function (callback) {
            twee.log('Opened Mongoose DB connection: "' + dbName + '" (' + connectionString + ')');
            if (typeof callback === 'function') {
                callback();
            }
        });

        databases[dbName].on('error', function(error){
            twee.error('Mongoose DB Connection Error: "' + dbName + '" (' + connectionString + '): ' + error.stack || error.toString());
        });
    }

    modelProvider.databases = databases;
    modelProvider.modelsRegistry = modelProvider.modelsRegistry || {};
    modelProvider.modelsProps = modelProvider.modelsProps || {};

    /**
     * Parse model string and find moduleName and collectionName in it
     * According to pattern: [Module:][Collection/]Model
     * @param modelName
     * @returns {*}
     */
    modelProvider.parseModelName = function(modelName) {
        modelName = String(modelName || '');

        if (this.modelsProps[modelName]) {
            return this.modelsProps[modelName];
        }

        var modelProps = {
            modelName: '',
            modelDbName: '',
            moduleName: '',
            collectionName: '',
            modelRegistryName: '',
            modelFilename: ''
        };

        if (!modelName) {
            return null;
        }

        var index, chr, parsedPart = '';

        for (index = 0; index < modelName.length; ++index) {
            chr = modelName[index];
            if (chr === ':' && !modelProps.moduleName) {
                modelProps.moduleName = parsedPart;
                parsedPart = '';
            } else if (chr === '/' && !modelProps.collectionName) {
                modelProps.collectionName = parsedPart;
                parsedPart = '';
            } else {
                parsedPart += chr;
            }
        }

        modelProps.modelName = parsedPart;
        var parsedPartArray = parsedPart.split('/');
        modelProps.modelDbName = modelProps.moduleName + parsedPartArray[parsedPartArray.length - 1];
        modelProps.modelRegistryName = JSON.stringify(modelProps);

        if (modelProps.moduleName) {
            if (mongooseFolders[modelProps.moduleName] && fs.existsSync(mongooseFolders[modelProps.moduleName])) {
                modelProps.modelFilename = mongooseFolders[modelProps.moduleName] + modelProps.modelName + 'Model.js';
                if (!fs.existsSync(modelProps.modelFilename)) {
                    throw new Error('Model does not exists: ' + modelProps.modelFilename);
                }
            } else {
                throw new Error('No module exists or it is not active: ' + modelProps.moduleName);
            }
        } else {
            var mName;
            for (mName in mongooseFolders) {
                var modelsFolder = mongooseFolders[mName];
                modelProps.modelFilename = modelsFolder + modelProps.modelName + 'Model.js';

                if (fs.existsSync(modelProps.modelFilename)) {
                    modelProps.moduleName = mName;
                    modelProps.modelDbName = modelProps.moduleName + modelProps.modelName;
                } else {
                    throw new Error('Model filename does not exists: ' + modelProps.modelFilename);
                }
            }
        }

        this.modelsProps[modelName] = modelProps;

        return modelProps;
    }

    /**
     * Looking for model schema definition in needed Module Folder if specified.
     * If not specified then looking for first occurrence.
     * @param modelName
     * @returns {*}
     */
    modelProvider.getDefinition = function(modelName) {

        var modelProps = {}
            , model = null;

        if (modelName instanceof Object) {
            modelProps = modelName;
        } else {
            modelProps = this.parseModelName(modelName);
        }

        try {
            return mongoose.model(modelProps.modelDbName);
        } catch (e) {
            // We didn't register model name yet.
            model = require(modelProps.modelFilename).schema(mongoose);

            if (!model) {
                throw new Error('Model not found: ' + modelProps.modelFilename);
            }

            if (modelProps.collectionName) {
                model.set('collection', modelProps.collectionName);
            }

            this.modelsProps[modelName] = modelProps;
            mongoose.model(modelProps.modelDbName, model);
            return mongoose.model(modelProps.modelDbName);
        }
    };

    /**
     * Get model definition allocated for some concrete connection
     * @param modelName
     * @param databaseName
     * @returns {*}
     */
    modelProvider.getModel = function(modelName, databaseName) {
        databaseName = databaseName || config['defaultDatabase'];
        databaseName = String(databaseName).trim();

        var  modelInstance = null;

        var modelProps = {};
        if (modelName instanceof Object) {
            modelProps = modelName;
        } else if (this.modelsProps[modelName]) {
            modelProps = this.modelsProps[modelName];
        } else {
            modelProps = this.parseModelName(modelName);
        }

        if (this.modelsRegistry[modelProps.modelRegistryName]) {
            return this.modelsRegistry[modelProps.modelRegistryName];
        }

        this.getDefinition(modelName);

        if (!databaseName || !databases[databaseName]) {
            throw new Error('Database config does not exists: ' + databaseName);
        } else {
            modelInstance = databases[databaseName].model(modelProps.modelDbName);
        }

        this.modelsRegistry[modelProps.modelRegistryName] = modelInstance;

        return modelInstance;
    };

    twee.set('mongoose', modelProvider);
};

module.exports.configNamespace = 'twee-mongoose';
module.exports.config = {
    "databases": {
        "test": {
            "connection": "mongodb://localhost/tweeIoTest",
            "options": {}
        }
    },
    "defaultDatabase": "test",
    "modelsFolders": "models/mongoose/"
};
