const { db } = require('../config/conn');
const seq = require('sequelize');

exports.Orders = db.define('orders', {
  id: {
    autoIncrement: true,
    type: seq.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  combined_order_id: {
    type: seq.INTEGER,
    allowNull: true
  },
  user_id: {
    type: seq.INTEGER,
    allowNull: true
  },
  guest_id: {
    type: seq.INTEGER,
    allowNull: true
  },
  seller_id: {
    type: seq.INTEGER,
    allowNull: true
  },
  shipping_address: {
    type: seq.TEXT,
    allowNull: true
  },
  delivery_status: {
    type: seq.STRING(20),
    allowNull: true,
    defaultValue: "pending"
  },
  payment_type: {
    type: seq.STRING(20),
    allowNull: true
  },
  payment_status: {
    type: seq.STRING(20),
    allowNull: true,
    defaultValue: "unpaid"
  },
  payment_details: {
    type: seq.TEXT,
    allowNull: true
  },
  grand_total: {
    type: seq.DOUBLE(20, 2),
    allowNull: true
  },
  coupon_discount: {
    type: seq.DOUBLE(20, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  code: {
    type: seq.TEXT,
    allowNull: true
  },
  tracking_code: {
    type: seq.STRING(255),
    allowNull: true
  },
  date: {
    type: seq.INTEGER,
    allowNull: false
  },
  viewed: {
    type: seq.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  delivery_viewed: {
    type: seq.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  payment_status_viewed: {
    type: seq.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  commission_calculated: {
    type: seq.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  subscribeID: {
    type: seq.TEXT,
    allowNull: true,
  },
  subscribeStatus: {
    type: seq.TEXT,
    allowNull: true,
  }
}, { freezeTableName: true, timestamps: true });
