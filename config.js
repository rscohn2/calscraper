module.exports = {
    callbackURL: onHeroku() ? "https://aqueous-peak-9810.herokuapp.com/auth/callback" : "http://localhost:5000/auth/callback",
    consumer_key: '768665063514-kg36j8rih2re987eu3t2c5cilugr64uc.apps.googleusercontent.com',
    consumer_secret: 'zxXge2iXxHtJ2IYzZCBiKB60',
};

function onHeroku() {
    return !!process.env.ON_HEROKU;
}
