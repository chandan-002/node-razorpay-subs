const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const chalk = require("chalk");
const axios = require('axios');
const { db } = require('./config/conn');
const cron = require('node-cron');

require('dotenv').config()
const app = express();

//Models
const { Orders } = require('./models/orders');
const { Combined } = require('./models/combined_orders');
const { OrderDetails } = require('./models/order_details');
const { all } = require('express/lib/application');

app.use(express.json());
app.use(cors());

// ------------------ Database connection check and creating razorpay instance --------------------

const r = axios.create({
    baseURL: process.env.URL,
    headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
        Accept: "application/json",
    },
});

// ------------------ Database connection check and creating razorpay instance --------------------

db.authenticate()
    .then((e) => console.log(chalk.bgGreen(chalk.bold.black(`Database connection succeeded`))))
    .catch(err => console.log(chalk.bold.redBright(`Database connection failed : ${err}`)));

var instance = new Razorpay({
    key_id: process.env.RZR_KEY,
    key_secret: process.env.RZR_SECRET
});

// ------------------ Razorpay related APIs --------------------

//Create Plan & subscription
app.post('/subs', async (req, res) => {
    console.log("Creating subscription")
    let currency = "INR";
    let period = "monthly";
    let customer_notify = 1;
    const { interval, name, amount, quantity, total_count, email, number,
    } = req.body;
    //Create Subscription ;
    var plan = {};
    var subs = {};
    try {
        plan = await instance.plans.create({
            interval,
            period,
            item: {
                name,
                amount: (Math.round(amount)) * 100,
                currency
            }
        });
        // console.log("---->",plan)
        subs = await instance.subscriptions.create({
            plan_id: plan.id,
            quantity,
            total_count,
            customer_notify,
            notify_info: {
                // notify_phone: number,
                notify_email: email
            }
        });

    } catch (error) {
        console.log('Error -->', error)
        return res.status(200).json({ success: false, msg: error });
    }

    if (subs) {
        return res.status(200).json({ success: true, msg: { url: subs } });
    }
    return res.status(400).json({ success: false, msg: "Error Occurred" });
})

//cron job for creating new order if subscription is renewed
const registerOrder = async () => {
    try {
        const allSubscription = await instance.subscriptions.all();

        allSubscription.items.map(async (itm, idx) => {
            if (itm.status === "active") {
                const data = await Orders.findAll({
                    where: {
                        subscribeID: itm.id
                    }
                })
                const allInvoices = await instance.invoices.all({
                    'subscription_id': itm.id
                })
                if (data?.invoice_id !== allInvoices.items[allInvoices.items.length - 1].id && allInvoices.items[allInvoices.items.length - 1].status === 'paid') {
                    const data = await Orders.findAll({
                        where: {
                            subscribeID: itm.id
                        },
                        raw: true
                    })
                    const id = data['0'].id;
                    delete data['0'].id;
                    delete data['0'].date;
                    delete data['0'].delivery_status
                    let obj = {
                        date: Number(Date.now().toString().substring(0, 10)),
                        delivery_status: "pending",
                        ...data["0"],
                        invoice_id: allInvoices.items[allInvoices.items.length - 1].id
                    }
                    // console.log('Data ----> ', obj)
                    Orders.create(obj).then(dt => {
                        OrderDetails.findAll({
                            where: { order_id: id },
                            raw: true
                        }).then(dtx => {
                            delete dtx[0].id;
                            delete dtx[0].order_id
                            let obj = {
                                ...dtx[0],
                                order_id: dt.id
                            }
                            OrderDetails.create(obj).then(obj).then(dataJ => {
                                return console.log('Order Created successfully')
                            }).catch(err => console.warn(err))
                        })
                    }).catch(err => {
                        return console.warn(err)
                    });
                }
            }
        })

    } catch (error) {
        console.log('Error --> ', error);
    }
}
cron.schedule('0 0 */3 * * *', () => {
    let date = new Date();
    console.log('Subscription check function running : ', date);
    registerOrder();
});

// Cancel a subscription
app.get('/cancelSub/:subs_id', async (req, res) => {
    try {
        const { subs_id } = req.params;
        const resData = await instance.subscriptions.cancel(subs_id);
        res.status(200).json({ success: true, msg: resData });
    } catch (error) {
        console.log('Error ---> ', error)
        return res.status(400).json({ success: false, msg: error });
    }
})

// ------------------ Delhivery related APIs --------------------

// Create a order
app.post('/delivery/create', async (req, res) => {
    const { order_id, shipments, pickup_location, type } = req.body;
    try {
        var obj;
        if (type === 'return') {
            obj = JSON.stringify({ pickup_location: pickup_location, shipments: shipments })
        } else {
            obj = JSON.stringify({ shipments: shipments, pickup_location: pickup_location })
        }
        const creation = await axios({
            method: 'post',
            headers: { 'content-type': 'application/x-www-form-urlencoded', Authorization: `Token ${process.env.DELHIVERY_TOKEN}` },
            data: `format=json&data=${obj}`,
            url: `${process.env.URL}/api/cmu/create.json`,
        })
        if (creation?.data) {
            // console.log(creation)
            if (type === 'return') {
                OrderDetails.update({
                    return_upload_wbn: creation?.data?.upload_wbn,
                    return_waybill: creation?.data?.packages[0]?.waybill
                }, {
                    where: {
                        id: order_id
                    }
                })
                    .then(dt => {
                        // console.log('Order id --->',order_id,'-->',creation?.data?.packages[0]?.waybill)
                        res.status(200).json({
                            success: true, msg: "Successfully created !", response: creation?.data
                        })
                    })
                    .catch(err => {
                        res.json({
                            success: false, msg: "failed"
                        })
                    })
            } else {
                OrderDetails.update({
                    upload_wbn: creation?.data?.upload_wbn,
                    waybill: creation?.data?.packages[0]?.waybill
                }, {
                    where: {
                        id: order_id
                    }
                })
                    .then(dt => {
                        // console.log('Order id --->',order_id,'-->',creation?.data?.packages[0]?.waybill)
                        res.status(200).json({
                            success: true, msg: "Successfully created !", response: creation?.data
                        })
                    })
                    .catch(err => {
                        res.json({
                            success: false, msg: "failed"
                        })
                    })
            }
        }
    } catch (error) {
        res.json({ success: false, msg: error })
        console.warn(error)
    }
})
// Create a reverse pickup
app.post('/delivery/reverse', async (req, res) => {
    const { order_id } = req.body;
    const orders = await Orders.findOne({
        where: {
            id: order_id
        }, raw: true
    })
    pickup_location = {
        add: process.env.DE_ADD,
        country: process.env.DE_COUNTRY,
        pin: process.env.DE_PIN,
        phone: process.env.DE_PHONE,
        city: process.env.DE_CITY,
        name: process.env.DE_PICKEUP_WAREHOUSE,
        state: process.env.DE_STATE
    }
    const order_details = await OrderDetails.findAll({
        where: {
            order_id: order_id
        },
        raw: true
    });
    const arr = [];
    order_details.map.map(itm => {
        shipments.push({
            "country": orders?.country,
            "city": orders?.city,
            "return_phone": orders?.phone,
            "pin": orders?.postal_code,
            "seller_inv": "",
            "state": orders?.state,
            "return_name": orders?.name,
            "order": "",
            "add": orders?.address,

            "payment_mode": orders?.payment_type,
            "quantity": itm?.quantity,
            "return_add": orders?.address,
            "phone": orders?.phone,
            "total_amount": orders?.grand_total,
            "name": orders?.name,
            "return_country": orders?.country,
            "return_city": orders?.city,
            "return_state": orders?.state,
            "return_pin": orders?.postal_code
        })
    })
    console.log(arr);
    res.status(200).json({success:true,msg:'Working'})
})

// Track a Order
app.get('/delivery/tracking', async (req, res) => {
    const { waybill } = req.query;
    // console.log('Watbill --> ', waybill)
    try {
        const track = await r.get(`api/v1/packages/json/?waybill=${waybill}&token=${process.env.DELHIVERY_TOKEN}`);
        if (track?.data) {
            // console.log(track)
            res.status(201).json({ success: true, msg: { ...track?.data?.ShipmentData[0]?.Shipment?.Status, StatusAWB: track?.data?.ShipmentData[0]?.Shipment?.AWB } })
        }
    } catch (error) {
        console.warn(error)
        res.json({ success: false, msg: error })
    }
})

// Cancel a delivery
app.post('/delivery/cancel', async (req, res) => {
    const { waybill, order_id } = req.body;
    console.log(waybill, order_id);
    console.log('_________')
    console.log(req.body)
    try {
        const cancel = await r.post(`api/p/edit`, {
            "waybill": waybill,
            "cancellation": true
        });
        console.log(cancel)
        if (cancel?.data) {
            OrderDetails.update({
                is_order_cancel: 1
            }, {
                where: {
                    id: order_id
                }
            }).then(dt => {

                res.status(200).json({ success: true, msg: { text: "Order Cancelled", data: cancel?.data } })
            })
                .catch(err => {
                    res.json({
                        success: false,
                        msg: "Order might be cancelled, database update failed",
                        error_response: err
                    })
                })
        }
    } catch (error) {
        res.json({ success: true, msg: error })
        console.warn(error)
    }
})

// check if deliverable 
app.get('/delivery/pincode/:pincode', async (req, res) => {
    try {
        const { pincode } = req.params;
        const pincodeData = await r.get(`c/api/pin-codes/json/?token=${process.env.DELHIVERY_TOKEN}&filter_codes=${pincode}`)
        // console.log(pincodeData.data)
        if (pincodeData) {
            let why = pincodeData?.data?.delivery_codes.length === 0 ? 'No' : 'Yes'
            res.status(200).json({ success: true, msg: { text: why, data: pincodeData?.data?.delivery_codes } })
        }
    } catch (error) {
        res.json({ success: true, msg: error })
        console.warn(error)

    }
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`)
})
