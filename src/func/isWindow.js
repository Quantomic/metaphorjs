
module.exports = function(obj) {
    return obj && obj.document && obj.location && obj.alert && obj.setInterval;
};