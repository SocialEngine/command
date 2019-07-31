
exports.without = function (object, without) {
    let out = null;
    if (!Array.isArray(without)) {
        without = [without];
    }
    if (Array.isArray(object)) {
        out = [];
        for (let key of object) {
            if (without.includes(key)) {
                continue;
            }
            out.push(key);
        }
    } else {
        out = {};
        for (let key of Object.keys(object)) {
            if (without.includes(key)) {
                continue;
            }
            out[key] = object[key];
        }
    }
    return out;
};
