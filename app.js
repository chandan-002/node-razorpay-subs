const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const chalk = require("chalk");
const { db } = require('./config/conn');
var cron = require('node-cron');


const app = express();

//Models
const { Orders } = require('./models/orders');
const { Combined } = require('./models/combined_orders');
const { OrderDetails } = require('./models/order_details');

app.use(express.json());
app.use(cors());

db.authenticate()
    .then((e) => console.log(chalk.bgGreen(chalk.bold.black(`Database connection succeeded`))))
    .catch(err => console.log(chalk.bold.redBright(`Database connection failed : ${err}`)));

var instance = new Razorpay({
    key_id: 'rzp_test_FHG3b2XqJf4TZA',
    key_secret: '4pGdg0EDFTKo0eAS66jjWjD2'
});

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

//Get Subscription by id
app.get('/status/:subs_id', async (req, res) => {
    const { subs_id } = req.params;
    try {

        setInterval(async () => {
            const subsData = await instance.subscriptions.fetch(subs_id);
            console.log(subsData.status)

            if (subsData.status === "active") {
                //   await Orders.update({payment_status:"paid"},{
                //       where :{
                //         subscribeID:subs_id
                //       }
                //   })  
                return res.status(200).json({ success: true, msg: subsData });
            }
        }, 3000);

        // let status = "";
        // while (status !== "active") {
        //     const subsData = await instance.subscriptions.fetch(subs_id);
        //     if (subsData.status === "active") {
        //         //   await Orders.update({payment_status:"paid"},{
        //         //       where :{
        //         //         subscribeID:subs_id
        //         //       }
        //         //   })  
        //         return res.status(200).json({ success: true, msg: subsData });
        //     }
        //     status = subsData.status;
        // }
    } catch (error) {
        console.log('Error -->', error);
        return res.status(400).json({ success: false, msg: error });
    }
})

//cron job
cron.schedule('* * * * *', () => {
    console.log('I run in 1 min');
});

app.get('/registerOrders', async (req, res) => {
    try {
        const allSubscription = await instance.subscriptions.all();
        // allSubscription.items.map(async itm => {
        //     if (itm.status === "active") {
        //         // console.log(itm)
        //         const data = await Orders.findAll({
        //             where: {
        //                 subscribeID: itm.id
        //             }
        //         })
        //         // console.log("Active Found --------->", data)
        //         // await Orders.create(data)
        //     }
        // })
        const data = await Orders.findAll({
            where: {
                subscribeID: 'sub_IjD4N8cdgq4ByN'
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
            ...data["0"] 
        }
        // console.log('Data ----> ', obj)
        Orders.create(obj).then(dt => {
            OrderDetails.findAll({
                where : {order_id:id},
                raw:true
            }).then(dtx => {
                delete dtx[0].id;
                delete dtx[0].order_id
                let obj = {
                    ...dtx[0],
                    order_id:dt.id
                }
                OrderDetails.create(obj).then(obj).then(dataJ => {
                    return res.status(400).json({ success: true, msg: { "createdOrder": {...dt,...dataJ} } })
                }).catch(err => res.status(400).json({ success: false, msg: { "error": err } }))
            })
        }).catch(err => { return res.status(400).json({ success: false, msg: { "error": err } }) });
    } catch (error) {
        console.log('Error --> ', error);
        return res.status(400).json({ success: false, msg: error });
    }
})

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
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`)
})
