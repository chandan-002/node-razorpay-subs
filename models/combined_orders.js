const { db } = require('../config/conn');
const seq = require('sequelize');

exports.Combined = db.define('combined_orders', {
    id: {
        autoIncrement: true,
        type: seq.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    user_id: {
        type: seq.INTEGER,
        allowNull: false
    },
    shipping_address: {
        type: seq.TEXT,
        allowNull: true
    },
    grand_total: {
        type: seq.DOUBLE(20, 2),
        allowNull: false,
        defaultValue: 0.00
    }
}, { freezeTableName: true, timestamps: false, })
