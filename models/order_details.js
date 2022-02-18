const { db } = require('../config/conn');
const seq = require('sequelize');

exports.OrderDetails = db.define('order_details', {
    id: {
        autoIncrement: true,
        type: seq.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      order_id: {
        type: seq.INTEGER,
        allowNull: false
      },
      seller_id: {
        type: seq.INTEGER,
        allowNull: true
      },
      product_id: {
        type: seq.INTEGER,
        allowNull: false
      },
      variation: {
        type: seq.TEXT,
        allowNull: true
      },
      price: {
        type: seq.DOUBLE(20,2),
        allowNull: true
      },
      tax: {
        type: seq.DOUBLE(20,2),
        allowNull: false,
        defaultValue: 0.00
      },
      shipping_cost: {
        type: seq.DOUBLE(20,2),
        allowNull: false,
        defaultValue: 0.00
      },
      quantity: {
        type: seq.INTEGER,
        allowNull: true
      },
      payment_status: {
        type: seq.STRING(10),
        allowNull: false,
        defaultValue: "unpaid"
      },
      delivery_status: {
        type: seq.STRING(20),
        allowNull: true,
        defaultValue: "pending"
      },
      shipping_type: {
        type: seq.STRING(255),
        allowNull: true
      } ,upload_wbn: {
        type: seq.TEXT,
        allowNull: true,
      },
      waybill: {
        type: seq.TEXT,
        allowNull: true,
      }
      ,
      return_upload_wbn: {
        type: seq.TEXT,
        allowNull: true,
      },
      return_waybill: {
        type: seq.TEXT,
        allowNull: true,
      },
      is_order_cancel: {
        type: seq.TINYINT,
        allowNull: true,
        defaultValue:false
      },
      pickup_point_id: {
        type: seq.INTEGER,
        allowNull: true
      },
      product_referral_code: {
        type: seq.STRING(255),
        allowNull: true
      }
}, { freezeTableName: true, timestamps: false });
