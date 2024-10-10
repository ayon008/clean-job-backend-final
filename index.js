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
const subscribedEmail = database.collection('subscribe-email');
const leads = database.collection('leads');



const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    console.log(token);
    if (!token) {
        return res.status(403).send({ message: 'Token is required' });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Token is invalid' });
        }
        req.decoded = decoded;
        next();
    })
}

const verifyAdmin = async (req, res, next) => {
    try {
        // Ensure the decoded token contains the email
        const email = req.decoded?.email;
        if (!email) {
            return res.status(401).json({ message: 'Unauthorized: No email found in token' });
        }

        // Query the database to find the user
        const user = await userCollection.findOne({ email });

        // If user is not found or is not an admin
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Forbidden: You do not have admin privileges' });
        }
        // Proceed to the next middleware or route
        next();
    } catch (error) {
        // Handle any unexpected errors
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};



async function run() {
    try {

        app.post('/user', async (req, res) => {
            const data = req.body;
            const result = await userCollection.insertOne(data);
            console.log(process.env.ACCESS_TOKEN);
            res.send(result);
        })

        app.get('/user', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/userEmail', async (req, res) => {
            const email = req.body.email;
            const userData = await userCollection.findOne({ email: email });
            const token = jwt.sign({
                email: email,
                isAdmin: userData?.isAdmin,
                isSeller: userData?.isSeller
            }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ token })
        })

        app.get('/user/:uid', verifyToken, async (req, res) => {
            const uid = req.params.uid;
            const find = await userCollection.findOne({ userId: { $eq: uid } })
            console.log(find?.email, req.decoded.email);
            if (find?.email !== req.decoded.email) {
                return res.status(404).send({ error: true, message: 'unauthorized access' })
            }
            else if (find?.email === req.decoded.email) {
                return res.send(find);
            }
        })

        app.patch('/user/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const userInfo = req.body;
            console.log(userInfo);

            const find = await userCollection.findOne({ _id: new ObjectId(id) });
            if (find?.email !== req.decoded.email) {
                return res.status(404).send({ error: true, message: 'unauthorized access' })
            }
            const updatedData = {
                $set: {
                    companyName: userInfo?.companyName,
                    email: userInfo?.email,
                    companyWebsite: userInfo?.companyWebsite,
                    serviceState: userInfo?.serviceState,
                    serviceCity1: userInfo?.serviceCity1,
                    serviceCity2: userInfo?.serviceCity2,
                    serviceCity3: userInfo?.serviceCity3,
                    serviceCity4: userInfo?.serviceCity4,
                    yearsInBusiness: userInfo?.yearsInBusiness,
                    numberOfEmployees: userInfo?.numberOfEmployees,
                    mainContact: userInfo?.mainContact,
                    phoneNumber: userInfo?.phoneNumber,
                    socialMedia1: userInfo?.socialMedia1,
                    socialMedia2: userInfo?.socialMedia2,
                    socialMedia3: userInfo?.socialMedia3,
                    socialMedia4: userInfo?.socialMedia4,
                    companyDetails: userInfo?.companyDetails,
                    companyLogo: userInfo?.companyLogo,
                },
            }
            const option = { upsert: true }
            const result = await userCollection.updateOne({ _id: new ObjectId(id) }, updatedData, option)
            console.log(result);
            res.send(result);
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
                    const emailTemplateData = await emailTemplate.findOne({ _id: new ObjectId(emailTemplateId) }, { projection: { _id: 0 } });
                    return {
                        ...lead,
                        emailTemplateData, // Add the fetched email template data to the lead object
                    };
                })
            );
            console.log(result);
            res.send(result);
        })

        // app.get('/search/:leadName', verifyToken, async (req, res) => {
        //     const leadName = req.params.leadName;
        //     const option = {
        //         projection: {
        //             job_details: {
        //                 location: {
        //                     state: 1
        //                 }
        //             }
        //         }
        //     }
        //     let collection;
        //     console.log(leadName);
        //     if (leadName === 'exclusive-leads') {
        //         collection = exclusiveLeads;
        //     }
        //     if (leadName === 'layups') {
        //         collection = layUps;
        //     }
        //     if (leadName === 'opportunities') {
        //         collection = opportunities;
        //     }

        //     const email = req.decoded.email;
        //     const user = await userCollection.findOne({ email: email });

        //     if (user) {
        //         const data = await collection.find({}, option).toArray();
        //         res.send(data)
        //     }
        //     res.status(403).send({ error: true, message: 'unauthorized access' });
        // })

        app.get('/search/:leadName', async (req, res) => {
            const leadName = req.params.leadName;
            const option = {
                projection: {
                    states: 1
                }
            }
            const query = { category: leadName }
            const result = await leads.find(query, option).toArray();
            res.send(result)
        })

        app.get('/search/:leadName/:state', async function (req, res) {
            const leadName = req.params.leadName;
            const state = req.params.state;
            const query = { $and: [{ category: leadName }, { states: state }] }
            const result = await leads.find(query).toArray();
            res.send(result)
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

        app.post('/subscribedEmail', async (req, res) => {
            const data = req.body;
            const result = await subscribedEmail.insertOne(data);
            res.send(result);
        })

        app.post('/leads', verifyToken, verifyAdmin, async (req, res) => {
            const data = req.body;
            const result = await leads.insertOne(data);
            res.send(result);
        })

        app.patch('/makeAdmin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const data = req.body.isAdmin
            console.log(data, id);

            const query = { _id: new ObjectId(id) };
            const updatedData = { $set: { isAdmin: data } }
            const result = await userCollection.updateOne(query, updatedData, { upsert: true });
            res.send(result);
        })
        app.patch('/makeSeller/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const data = req.body.isSeller
            console.log(data, id);
            const query = { _id: new ObjectId(id) };
            const updatedData = { $set: { isSeller: data } }
            const result = await userCollection.updateOne(query, updatedData, { upsert: true });
            res.send(result);
        })

        app.get('/allLeads', verifyToken, verifyAdmin, async (req, res) => {
            const result = await leads.find().toArray();
            res.send(result);
        })

        app.patch('/allLeads/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updatedData = {
                $set: {
                    verified: req.body.verified
                }
            }
            const result = await leads.updateOne(query, updatedData, { upsert: true });
            res.send(result);
        })


        app.patch('/category/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updatedData = {
                $set: {
                    category: req.body.category
                }
            }
            const result = await leads.updateOne(query, updatedData, { upsert: true });
            res.send(result);
            console.log(result);

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




