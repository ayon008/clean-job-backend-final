const express = require('express');
require('dotenv').config();
var jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors');
const port = 5000 || process.env.PORT;


app.use(express.json());
app.use(cors());


app.get('/', (req, res) => {
    res.send('server is running');
})



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.km1azrr.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const database = client.db('CleanJobs');
const userCollection = database.collection('users');
const exclusiveLeads = database.collection('exclusive-leads');
const layUps = database.collection('lay-ups');
const opportunities = database.collection('opportunities');
const leadList = database.collection('lead-list');

async function run() {
    try {

        // Post user to database
        app.post('/user', async (req, res) => {
            const data = req.body;
            const result = await userCollection.insertOne(data);
            console.log(process.env.ACCESS_TOKEN);
            res.send(result);
        })

        // post user email to get hwt token
        app.post('/userEmail', async (req, res) => {
            const email = req.body.email;
            const token = jwt.sign({
                data: email
            }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ token })
        })

        // Post leadList to database
        app.post('/leadList', async (req, res) => {
            const data = req.body;
            const result = await leadList.insertOne(data);
            res.send(result)
        })

        // Delete lead list from database
        app.delete('/leadList/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await leadList.deleteOne(query);
            res.send(result);
        })


        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        // get single User
        app.get('/user/:uid', async (req, res) => {
            const userId = req.params.uid;
            const query = { userId: { $eq: userId } };
            const data = await userCollection.findOne(query);
            console.log(data);
            res.send(data);
        })


        app.get('/search/:leadName', async (req, res) => {
            const leadName = req.params.leadName;
            const option = {
                projection: {
                    job_details: {
                        location: {
                            state: 1
                        }
                    }
                }
            }
            let collection;
            console.log(leadName);
            if (leadName === 'exclusive-leads') {
                collection = exclusiveLeads;
            }
            if (leadName === 'layups') {
                collection = layUps;
            }
            if (leadName === 'opportunities') {
                collection = opportunities;
            }
            const data = await collection.find({}, option).toArray();
            res.send(data)
        })

        app.get('/search/:leadName/:state', async function (req, res) {
            const leadName = req.params.leadName;
            const state = req.params.state;
            console.log(leadName, state);
            let collection;
            const query = { "job_details.location.state": { $eq: state } }
            if (leadName === 'exclusive-leads') {
                collection = exclusiveLeads;
            }
            if (leadName === 'layups') {
                collection = layUps;
            }
            if (leadName === 'opportunities') {
                collection = opportunities;
            }
            const data = await collection.find(query).toArray();
            res.send(data)
        })

        app.get('/search/:leadName/:state/:id', async function (req, res) {
            const leadName = req.params.leadName;
            const state = req.params.state;
            const id = req.params.id;
            console.log(leadName, state, id);
            let collection;
            if (leadName === 'exclusive-leads') {
                collection = exclusiveLeads;
            }
            if (leadName === 'layups') {
                collection = layUps;
            }
            if (leadName === 'opportunities') {
                collection = opportunities;
            }
            const query = { $and: [{ "job_details.location.state": { $eq: state } }, { _id: new ObjectId(id) }] }
            const data = await collection.findOne(query);
            res.send(data)
        })

        app.patch('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const userInfo = req.body;
            const updatedData = {
                $set: {
                    companyName: userInfo?.companyName,
                    email: userInfo?.email,
                    companyWebsite: userInfo?.companyWebsite,
                    serviceState: userInfo?.serviceState,
                    serviceState1: userInfo?.serviceState1,
                    serviceState2: userInfo?.serviceState2,
                    serviceState3: userInfo?.serviceState3,
                    socialMedia: userInfo?.socialMedia,
                    socialMedia1: userInfo?.socialMedia1,
                    socialMedia2: userInfo?.socialMedia2,
                    socialMedia3: userInfo?.socialMedia3,
                    serviceCities: userInfo?.serviceCities,
                    serviceCities1: userInfo?.serviceCities1,
                    serviceCities2: userInfo?.serviceCities2,
                    serviceCities3: userInfo?.serviceCities3,
                    yearsInBusiness: userInfo?.yearsInBusiness,
                    employeeAmount: userInfo?.employeeAmount,
                    mainContact: userInfo?.mainContact,
                    phoneNumber: userInfo?.phoneNumber,
                    file: userInfo?.file,
                    companyDetails: userInfo?.companyDetails,
                }
            }
            const result = await userCollection.updateOne(query, updatedData, options);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(port);
})




