const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const chalk = require("chalk");
const axios = require('axios');
const { db } = require('./config/conn');
var cron = require('node-cron');

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
    baseURL: 'https://staging-express.delhivery.com/',
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
    // key_id: 'rzp_test_FHG3b2XqJf4TZA',
    key_id: process.env.RZR_KEY,
    key_secret: process.env.RZR_SECRET
});

// ------------------ Razirpay related APIs --------------------

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
app.post('api/cmu/create.json', async (req, res) => {
    const { product, name, city, pin, country, phone, add } = req.body;
    try {
        const creation = await axios.post('api/cmu/create.json', {
            "shipments": [
                ...product
            ],
            "pickup_location": {
                "name": name,
                "city": city,
                "pin": pin,
                "country": country,
                "phone": phone,
                "add": add
            }
        })
        if (creation) {
            console.log(creation);
            // Orders.update({

            // }, {
            //     where: {
            //         order_id
            //     }
            // })
        }
    } catch (error) {
        console.warn(error)
    }
})

// Track a Order
app.get('/delivery/tracking', async (req, res) => {
    const { waybill, token } = req.query;
    try {
        const track = await r.get(`api/v1/packages/json/?waybill=${waybill}&token=${token}`);
        console.log(track);
    } catch (error) {
        console.warn(error)
    }
})

// Cancel a delivery
app.post('/delivery/cancel', async (req, res) => {
    const { waybill } = req.body;
    try {
        const track = await r.post(`api/p/edit`, {
            "waybill": waybill,
            "cancellation": true
        });
        console.log(track);
    } catch (error) {
        console.warn(error)
    }
})

// check if deliverable 

app.get('/delivery/pincode/:pincode', async (req, res) => {
    try {
        const { pincode } = req.params;
        const pincodeData = await r.get(`c/api/pin-codes/json/?token=${process.env.DELHIVERY_TOKEN}&filter_codes=${pincode}`)
        console.log(pincodeData.data)
        if (pincodeData) {
            res.status(200).json({ success: true, msg: pincodeData.data })
        }
    } catch (error) {
        res.json({ success: true, msg: error})
        console.warn(error)

    }
})




const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`)
})
