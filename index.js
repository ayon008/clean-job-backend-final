const express = require('express');
require('dotenv').config();
var jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors');
const port = 5000 || process.env.PORT;
const endpointSecret = 'whsec_...';
const stripe = require("stripe")(process.env.STRIPE_KEY);
const Pusher = require('pusher');

const pusher = new Pusher({
    appId: "1884464",
    key: "7a71ab81cc1c36e25c6a",
    secret: "71a5f37c0eb5fb549531",
    cluster: "ap2",
    useTLS: true
});

app.use(cors())
app.use(express.json())


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
const leadList = database.collection('lead-list');
const emailTemplate = database.collection('email-template');
const subscribedEmail = database.collection('subscribe-email');
const leads = database.collection('leads');
const bookmarks = database.collection('bookmarks');
const contacts = database.collection('contacts');
const message = database.collection('messages');
const purchased = database.collection('purchased');


const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
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


const verifySeller = async (req, res, next) => {
    try {
        // Ensure the decoded token contains the email
        const email = req.decoded?.email;
        if (!email) {
            return res.status(401).json({ message: 'Unauthorized: No email found in token' });
        }

        // Query the database to find the user
        const user = await userCollection.findOne({ email });

        // If user is not found or is not an admin
        if (!user || !user.isSeller) {
            return res.status(403).json({ message: 'Forbidden: You do not have seller privileges' });
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
            res.send(result);
        })

        app.get('/user', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/userEmail', async (req, res) => {
            const email = req.body.email;
            const userName = req.body.userName;
            const userData = await userCollection.findOne({ email: email });
            console.log(userData)
            const token = jwt.sign({
                email: email,
                userName: userName,
                isAdmin: userData?.isAdmin,
                isSeller: userData?.isSeller
            }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ token })
        })

        app.post('/', async (req, res) => {
            console.log('Ayon');

        })

        app.get('/user/:uid', verifyToken, async (req, res) => {
            const uid = req.params.uid;
            const find = await userCollection.findOne({ userId: { $eq: uid } })
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
            res.send(result);
        })


        app.get('/search/:leadName', async (req, res) => {
            const leadName = req.params.leadName;
            const option = {
                projection: {
                    states: 1
                }
            }
            const query = { $and: [{ category: leadName }, { verified: true }] }
            const result = await leads.find(query, option).toArray();
            res.send(result)
        })

        // app.get('/search/:leadName/:state', async function (req, res) {
        //     const leadName = req.params.leadName;
        //     const state = req.params.state;
        //     const decodeState = decodeURIComponent(state);
        //     const query = { $and: [{ category: leadName }, { states: decodeState }, { verified: true }] }
        //     const result = await leads.find(query).toArray();
        //     res.send(result)
        // })

        // app.get('/search/:leadName/:state/:id', async function (req, res) {
        //     const leadName = req.params.leadName;
        //     const states = req.params.state;
        //     const id = req.params.id;
        //     const query = { $and: [{ states: { $eq: states } }, { _id: new ObjectId(id) }, { category: { $eq: leadName } }, { verified: true }] }
        //     const data = await leads.findOne(query);
        //     res.send(data)
        // })

        app.get('/search', async function (req, res) {
            const leadName = req.query.leadName;
            const state = req.query.state;
            const id = req.query.id;
            const query = {
                $and: [
                    { verified: true },
                    {
                        $or: [
                            { category: { $eq: leadName } }, { states: { $eq: state } },
                            { _id: new ObjectId(id) }
                        ]
                    }
                ]
            }
            if (id) {
                const data = await leads.findOne(query);
                res.send(data)
            }
            const data = await leads.find(query, {}).toArray();
            res.send(data);
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
            const data = req.body.isAdmin;
            const query = { _id: new ObjectId(id) };
            const updatedData = { $set: { isAdmin: data } }
            const result = await userCollection.updateOne(query, updatedData, { upsert: true });
            res.send(result);
        })
        app.patch('/makeSeller/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const data = req.body.isSeller;
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
        })

        app.patch('/prize/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedData = {
                $set: {
                    prize: req.body.prize
                }
            }
            const result = await leads.updateOne(query, updatedData, { upsert: true });
            res.send(result);
        })

        app.delete('/lead/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const deleteOne = await leads.deleteOne({ _id: new ObjectId(id) })
            res.send(deleteOne);
        })

        app.post('/bookmarks', verifyToken, async (req, res) => {
            const data = req.body;
            const result = await bookmarks.insertOne(data);
            res.send(result);
        })

        app.get('/bookMarks/:uid/:id', verifyToken, async (req, res) => {
            const uid = req.params.uid;
            const id = req.params.id;
            const findUser = await userCollection.findOne({ userId: uid });
            if (findUser?.email !== req.decoded.email) {
                return res.status(401).send({ message: 'Unauthorized' });
            }
            const query = { $and: [{ userId: uid }, { id: id }] }
            const find = await bookmarks.findOne(query);
            if (find) {
                res.send({ status: true })
                return
            }
            res.send({ status: false })
        })

        app.delete('/bookMarks/:uid/:id', verifyToken, async (req, res) => {
            const uid = req.params.uid;
            const id = req.params.id;
            const findUser = await userCollection.findOne({ userId: uid });
            if (findUser.email !== req.decoded.email) {
                return res.status(401).send({ message: 'Unauthorized' });
            }
            const query = { $and: [{ userId: uid }, { id: id }] }
            const find = await bookmarks.deleteOne(query);
            res.send(find);
        })


        app.get('/savedLeads/:uid', verifyToken, async (req, res) => {
            const email = req.decoded.email;
            const uid = req.params.uid;
            const user = await userCollection.findOne({ userId: uid });
            if (email !== user?.email) {
                return res.status(401).send({ message: 'Unauthorized' });
            }
            const bookMarkedId = await bookmarks.find({ userId: uid }, { projection: { id: 1 } }).toArray();
            const savedLeads = await Promise.all(
                bookMarkedId.map(async (id) => {
                    const find = await leads.findOne({ _id: new ObjectId(id?.id) });
                    return find;
                })
            );
            res.send(savedLeads);
        })

        app.get('/sellerLeads/:sellerId', verifyToken, verifySeller, async (req, res) => {
            const sellerId = req.params.sellerId;
            const query = { sellerId: sellerId }
            const sellerLeads = await leads.find(query).toArray();
            res.send(sellerLeads);
        })

        app.post('/contacts', async (req, res) => {
            const data = req.body
            const result = await contacts.insertOne(data);
            res.send(result);
        })

        app.post('/message', async (req, res) => {
            const data = req.body
            const result = await message.insertOne(data);
            res.send(result);
        })

        app.get('/allLeads/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const find = await leads.findOne({ _id: new ObjectId(id) });
            res.send(find);
        })

        app.get('/subscribedEmail', verifyToken, verifyAdmin, async (req, res) => {
            const result = await subscribedEmail.find().toArray();
            res.send(result);
        })

        app.get('/contacts', verifyToken, verifyAdmin, async (req, res) => {
            const result = await contacts.find().toArray();
            res.send(result);
        })
        app.get('/messages', verifyToken, verifyAdmin, async (req, res) => {
            const result = await message.find().toArray();
            res.send(result);
        })

        app.get('/singleLeads/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const data = await leads.findOne({ _id: new ObjectId(id) });
            res.send(data);
        })

        app.patch('/leads/:id', verifyToken, verifyAdmin, async (req, res) => {
            const data = req.body; // Get the incoming data from the request body
            const updatedData = {
                $set: {
                    leadName: data.leadName,
                    businessName: data.businessName,
                    time: data.time,
                    states: data.states,
                    city: data.city,
                    location: data.location,
                    firstName: data.firstName,
                    area: data.area,
                    lastName: data.lastName,
                    phoneNumber: data.phoneNumber,
                    opportunityType: data.opportunityType,
                    type: data.type,
                    scope: data.scope,
                    frequency: data.frequency,
                    cleaning: data.cleaning,
                    category: data.category,
                    additionalDetails: data.additionalDetails,
                    date: data.date,
                }
            };

            try {
                const result = await leads.updateOne(
                    { _id: new ObjectId(req.params.id) }, // Filter by the lead ID
                    updatedData,
                    { upsert: true } // Create a new document if no matching document is found
                ); // Log the result of the update for debugging
                res.status(200).send(result); // Send a success response
            } catch (error) {
                console.error(error); // Log any errors for debugging
                res.status(500).send({ error: 'Failed to update lead. Please try again later.' }); // Send an error response
            }
        });

        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const customer = await stripe.customers.create();
            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                customer: customer.id,
                setup_future_usage: "on_session",
                amount: price * 100,
                currency: "usd",
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
        app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
            let event = request.body;
            // Only verify the event if you have an endpoint secret defined.
            // Otherwise use the basic event deserialized with JSON.parse
            if (endpointSecret) {
                // Get the signature sent by Stripe
                const signature = request.headers['stripe-signature'];
                try {
                    event = stripe.webhooks.constructEvent(
                        request.body,
                        signature,
                        endpointSecret
                    );
                } catch (err) {
                    console.log(`⚠️  Webhook signature verification failed.`, err.message);
                    return response.sendStatus(400);
                }
            }

            // Handle the event
            switch (event.type) {
                // Refund initiated or completed
                case 'charge.refunded':
                    const refund = event.data.object;
                    console.log(`Refund initiated: ${refund.id}`);

                    // Extract refund details
                    const refundData = {
                        refundId: refund.id,
                        refundAmount: refund.amount / 100, // Convert to dollars if needed
                        refundCurrency: refund.currency,
                        refundDate: new Date(refund.created * 1000), // Convert Unix timestamp to JS Date
                        refundStatus: refund.status,
                        chargeId: refund.charge
                    };

                    // Store the refund data in your database
                    // saveRefundData(refundData);
                    console.log(`Refund Details:`, refundData);
                    break;

                // Dispute created
                case 'charge.dispute.created':
                    const dispute = event.data.object;
                    console.log(`Dispute created: ${dispute.id}`);

                    // Extract dispute details
                    const disputeData = {
                        disputeId: dispute.id,
                        disputeAmount: dispute.amount / 100, // Convert to dollars
                        disputeCurrency: dispute.currency,
                        disputeReason: dispute.reason,
                        disputeStatus: dispute.status,
                        disputedOn: new Date(dispute.created * 1000), // Convert Unix timestamp to JS Date
                        evidenceDueBy: new Date(dispute.evidence_due_by * 1000), // Convert Unix timestamp to JS Date
                        chargeId: dispute.charge,
                        disputeNetworkStatus: dispute.network_status
                    };

                    // Store the dispute data in your database
                    // saveDisputeData(disputeData);
                    console.log(`Dispute Details:`, disputeData);
                    break;

                // Dispute evidence submitted
                case 'charge.dispute.updated':
                    const updatedDispute = event.data.object;
                    console.log(`Dispute updated: ${updatedDispute.id}`);

                    // Check if evidence was submitted
                    if (updatedDispute.evidence && updatedDispute.evidence.submitted_at) {
                        const evidenceSubmittedData = {
                            disputeId: updatedDispute.id,
                            evidenceSubmittedAt: new Date(updatedDispute.evidence.submitted_at * 1000) // Convert Unix timestamp to JS Date
                        };

                        // Store evidence submission details in your database
                        // saveEvidenceSubmittedData(evidenceSubmittedData);
                        console.log(`Evidence Submitted Details:`, evidenceSubmittedData);
                    }
                    break;

                // Default case for unhandled events
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            // Return a 200 response to acknowledge receipt of the event
            response.send();
        });

        app.post('/purchasedData', verifyToken, async (req, res) => {
            const data = req.body;
            console.log(data);
            const product_Id = data.product_Id;
            const query = { _id: new ObjectId(product_Id) };
            if (data.status !== 'succeeded') {
                console.log('x');
                return
            }
            const updatedData = {
                $set: {
                    sold: true
                }
            }
            const updateProduct = await leads.updateOne(query, updatedData, { upsert: true });
            const purchasedInfo = await purchased.insertOne(data);
            console.log(updateProduct, purchasedInfo)
            res.send(purchasedInfo);
        })

        app.post('/sanityWebhook', (req, res) => {
            const data = req.body; // Adjust these based on the webhook payload
            const title = data.title;
            const slug = data.slug.current;
            console.log(title, slug);

            // Trigger Pusher event
            pusher.trigger('blog-channel', 'sanityWebhook', {
                title,
                slug
            });

            res.status(200).send('Webhook received and notification sent');
        });

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




