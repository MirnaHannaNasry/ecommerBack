const NodeCache=require('node-cache');

const MIN= 60
const cache = new NodeCache({stdTTL:MIN * 5 ,checkperiod: MIN});

module.exports= cache;