const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const chalk = require("chalk");
const { db } = require('./config/conn');

const app = express();

//Models
const { Orders } = require('./models/orders');
const { Combined } = require('./models/combined_orders');

app.use(express.json());
app.use(cors());

db.authenticate()
    .then((e) => console.log(chalk.bgGreen(chalk.bold.black(`Database connection succeeded`))))
    .catch(err => console.log(chalk.bold.redBright(`Database connection failed : ${err}`)));

var instance = new Razorpay({
    key_id: 'rzp_test_FHG3b2XqJf4TZA',
    key_secret: '4pGdg0EDFTKo0eAS66jjWjD2'
});

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
        return res.status(200).json({ success: false, msg: error });
    }
})

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`)
})
