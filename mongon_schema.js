const mongon = require('./index');

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
        minimize: false , collection: 'MONGON_TEST'
});