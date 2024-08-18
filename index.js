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
const emailTemplate = database.collection('email-template');

async function run() {
    try {

        app.post('/user', async (req, res) => {
            const data = req.body;
            const result = await userCollection.insertOne(data);
            console.log(process.env.ACCESS_TOKEN);
            res.send(result);
        })

        app.post('/userEmail', async (req, res) => {
            const email = req.body.email;
            const token = jwt.sign({
                data: email
            }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ token })
        })


        app.post('/leadList', async (req, res) => {
            const data = req.body;
            const result = await leadList.insertOne(data);
            res.send(result)
        })

        app.post('/email-template', async (req, res) => {
            const data = req.body;
            const result = await emailTemplate.insertOne(data);
            res.send(result);
        })


        app.delete('/leadList/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await leadList.deleteOne(query);
            res.send(result);
        })

        app.delete('/email-template/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await emailTemplate.deleteOne(query);
            res.send(result);
        })

        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        app.get('/leadList/:uid', async (req, res) => {
            const uid = req.params.uid;
            const query = { uid: { $eq: uid } };
            const data = await leadList.find(query).toArray();
            const result = await Promise.all(
                data.map(async (lead) => {
                    const emailTemplateId = lead.emailTemplate;
                    const emailTemplateData = await emailTemplate.findOne({ _id: new ObjectId(emailTemplateId) },{ projection: { _id: 0 } });
                    return {
                        ...lead,
                        emailTemplateData, // Add the fetched email template data to the lead object
                    };
                })
            );
            console.log(result);
            res.send(result);
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

        app.get('/email-template/:uid', async (req, res) => {
            const uid = req.params.uid;
            const query = { uid: { $eq: uid } }
            const data = await emailTemplate.find(query).toArray();
            res.send(data)
        })

        app.get('/email-template/:uid/:id', async (req, res) => {
            const uid = req.params.uid;
            const id = req.params.id;
            const query = { $and: [{ uid: { $eq: uid } }, { _id: new ObjectId(id) }] }
            const data = await emailTemplate.findOne(query);
            res.send(data)
        })

        app.put('/email-template/:id', async function (req, res) {
            const id = req.params.id;
            const data = req.body;
            const query = { _id: new ObjectId(id) };
            const updatedData = {
                $set: {
                    templateName: data.templateName,
                    subject: data.subject,
                    body: data.body,
                    emailSignature: data.emailSignature,
                    websiteLink: data.websiteLink,
                    file: data.file,
                }
            }
            const result = await emailTemplate.updateOne(query, updatedData);
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




