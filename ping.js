

const mongon = require('./index');
const MongonSchema = require('./mongon_schema');
module.exports = {
    async push(){
        let MongonModel = mongon.model(MongonSchema);
        let MongonDoc = new MongonModel({});
        return MongonDoc.save().then((result)=>{
            return MongonModel.find().exec().then((docs)=>{
                return docs;
            });
        });
    }
}