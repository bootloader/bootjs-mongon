

const mongon = require('./index');
const MongonSchema = require('./mongon_schema');
const {timely} = require('@bootloader/utils');

module.exports = {
    async push(){
        let MongonModel = mongon.model(MongonSchema);
        let MongonDoc = new MongonModel({
            createdAt : timely.getTimeIndex()
        });
        return MongonDoc.save().then((result)=>{
            return MongonModel.findById(result._id).exec().then((docs)=>{
                return docs;
            });
        });
    }
}