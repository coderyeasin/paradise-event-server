const express = require('express');
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config()
const ObjectId = require('mongodb').ObjectId
const { MongoClient } = require('mongodb');

const stripe = require('stripe')(process.env.STRIPE_SECRET)

const port = process.env.PORT || 5000;

// paradise-event-819fa-firebase-adminsdk.json


// const serviceAccount = JSON.parse('./paradise-event-819fa-firebase-adminsdk.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });


//middlewear
app.use(cors())
app.use(express.json())


//////////////Database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yrxsm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



/////////admin verify wit jwt---firebase admin
async function verifyToken(req, res, next) {
    if (req?.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        console.log(token);

        try {
            
            const decodedUser = await admin.auth().verifyIdToken(token)
            req.decodedEmail = decodedUser.email;
            //email ta pacchena token thik ache
        } catch {
            
        }

    }
    next()
}






//Generated API
async function server() {
    try {
        await client.connect();
        console.log('db connnect');

        //all events
        const database = client.db('paradise_events')
        const eventsCollection = database.collection('events')

        //all order
        const bookingCollection = client.db('paradise_events').collection('booking')

        //all user
        const usersCollection = client.db('paradise_events').collection('users')

///////////////Events Api
        app.get('/events', async (req, res) => {
            const cursor = await eventsCollection.find({}).toArray()
            res.json(cursor)
        })

        app.post('/events', async (req, res) => {
            const newEvents = req.body;
            const result = await eventsCollection.insertOne(newEvents)
            console.log(result);
            res.json(result)
        })

////////////////////////// Users --- Api
        //email to chk users admin or not
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true
            }
            res.json({ admin: isAdmin });
        })

        //GET api for Testimonial
        app.get('/review', async (req, res) => {
            const cursor = await usersCollection.find({}).toArray()
            res.json(cursor)
        })
        //save user to db
            app.post('/review', async (req, res) => {
                const newReview = req.body;
                const result = await usersCollection.insertOne(newReview)
                console.log(result);
                res.json(result)
            })
        
//////////////////// all user
            app.get('/allusers', async (req, res) => {
                const cursor = await usersCollection.find({}).toArray()
                res.json(cursor)
            })
                    
            app.post('/users', async (req, res) => {
                const newUser = req.body;
                const result = await usersCollection.insertOne(newUser)
                console.log(result);
                res.json(result)
            })
        
        ///google--registration data save data bd
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email }
            const options = { upsert: true }
            const updateDoc = { $set: user }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.json(result)
            })

        //admin api---make admin--- with jwt token
        app.put('/users/admin',verifyToken, async (req, res) => {
            const user = req.body;
            console.log('put', req.decodedEmail);

            // const requester = req.decodedEmail
            // if (requester) {
            //     const requesterAccount = await usersCollection.findOne({ email: requester })
            //     if (requesterAccount.role === 'admin') {
            //         const filter = { email: user.email }
            //         const updateDoc = { $set: { role: 'admin' } };
            //         const result = await usersCollection.updateOne(filter, updateDoc)
            //         res.json(result)
            //     }
            // }
            // else {
            //     res.status(403).json({message:'never make you admin first be admin'})
            // }

            const filter = { email: user.email }
            const updateDoc = { $set: { role: 'admin' } };
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.json(result)
        })



        //normally make admin
        // app.put('/users/admin',verifyToken, async (req, res) => {
        //     const user = req.body;
        //     console.log('put', req.headers.authorization);
        //     const filter = { email: user.email }
        //     const updateDoc = { $set: { role: 'admin' } };
        //     const result = await usersCollection.updateOne(filter, updateDoc)
        //     res.json(result)
        // })

////////////////Booking Api 
        app.get('/allOrders', async (req, res) => {
            const cursor = await bookingCollection.find({}).toArray()
            res.json(cursor)
        })
            
        
        app.get('/booking', async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const query={email: email}
            const cursor = await bookingCollection.find(query).toArray()
            console.log(cursor);
            res.json(cursor)
        })
        //payment
        app.get('/payments/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await bookingCollection.findOne(query)
            res.json(result);
        })
        ///////// --payment post--stripe integration with server
        app.post('/create-payment-intent', async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types:['card']
            })
            res.json({clientSecret: paymentIntent.client_secret})
        })
        //////////////////

        app.post('/booking', async (req, res) => {
            const newEvents = req.body;
            const result = await bookingCollection.insertOne(newEvents)
            console.log(result);
            res.json(result)
        })

        app.put('/updateStatus/:id', (req, res) => {
            const id = req.params.id;
            const updateStatus = req.body.status;
            // console.log(updateStatus);
            const filter = { _id: ObjectId(id) };
            bookingCollection.updateOne(filter, {
                $set: { status: updateStatus },
            })
                .then(result => {
                    res.send(result)
                });
        })

        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)}
            const result = await bookingCollection.deleteOne(filter)
            console.log(result);
            res.json(result)
        })

    }
    finally {
        // await client.close()
    }
}
server().catch(console.dir)

//end generated


app.get('/',  (req, res) => {
    res.send('paradise event is here')
})

app.listen(port, () => {
    console.log(`Listening Paradise At: ${port}`)
})