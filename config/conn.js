require('dotenv').config()
const { Sequelize } = require('sequelize');

if (process.env.NODE_ENV === 'PRODUCTION') {
    exports.db = new Sequelize('databse', 'user_name', 'password', {
        host: '127.0.0.1',
        dialect: 'mysql',
        // operatorsAliases: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
} else {
    exports.db = new Sequelize('ecommerce_test', 'root', 'wemo@1234', {
        host: '127.0.0.1',
        dialect: 'mysql',
        port: '3307', //-------------> change port here
        // operatorsAliases: false,
        logging:false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
}