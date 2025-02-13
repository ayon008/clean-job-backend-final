const express = require('express');
require('dotenv').config();
var jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors');
const port = 5000 || process.env.PORT;
const endpointSecret = process.env.stripe_webhook_secret;
const stripe = require("stripe")(process.env.STRIPE_KEY);
const Pusher = require('pusher');
const { Resend } = require("resend"); // Directly import Resend
const resend = new Resend(process.env.RESEND_API_KEY);


app.use(cors());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://www.janitorialappointment.com");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});



const pusher = new Pusher({
    appId: "1884464",
    key: "7a71ab81cc1c36e25c6a",
    secret: "71a5f37c0eb5fb549531",
    cluster: "ap2",
    useTLS: true
});


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
const premiumUsers = database.collection('premiumUsers');
const appointments = database.collection('appointments');


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


async function sendEmail(email, data) {
    try {
        const response = await resend.emails.send({
            from: "contact@janitorialappointment.com", // Your verified email address
            to: email,
            subject: "Welcome to Janitorial Appointment",
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Janitorial Appointment</title>
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
                <table align="center" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td align="center">
                            <table width="600px" cellspacing="0" cellpadding="0" border="0" style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0px 2px 5px rgba(0,0,0,0.1);">
                                <!-- Header with Logo -->
                                <tr>
                                    <td align="center" style="background-color: #008000; padding: 20px;">
                                        <img src="https://i.ibb.co.com/fdfzFtXc/1904c9e7a4e1664e4e229a2f3c9155941-result-result.webp" alt="Janitorial Appointments" style="max-width: 180px;">
                                    </td>
                                </tr>
    
                                <!-- Welcome Message -->
                                <tr>
                                    <td align="center" style="padding: 20px;">
                                        <h2 style="color: #333;">Welcome to Janitorial Appointment</h2>
                                        <p style="color: #555; font-size: 16px;">
                                            🎉 We’re excited to have you on board.
                                        </p>
                                    </td>
                                </tr>
    
                                <!-- Steps & Info -->
                                <tr>
                                    <td style="padding: 20px; font-size: 16px; color: #444;">
                                        <p>Here’s what you can do next:</p>
                                        <ul>
                                            <li>✅ Explore our <a href="https://www.janitorialappointment.com/search/exclusive-leads" style="color: #008000;">services</a> and offerings.</li>
                                            <li>✅ Stay updated with exclusive insights and tips.</li>
                                            <li>✅ Get the best support from our dedicated team.</li>
                                        </ul>
                                        <p>If you have any questions, feel free to reach out at 
                                            <a href="mailto:contact@janitorialappointment.com" style="color: #008000;">contact@janitorialappointment.com</a>.
                                        </p>
                                    </td>
                                </tr>
    
                                <!-- CTA Button -->
                                <tr>
                                    <td align="center" style="padding: 20px;">
                                        <a href="https://www.janitorialappointment.com/search/exclusive-leads" 
                                           style="background-color: #008000; color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-size: 16px; display: inline-block;">
                                           Get Latest Commercial Cleaning Leads
                                        </a>
                                    </td>
                                </tr>
    
                                <!-- Footer -->
                                <tr>
                                    <td align="center" style="background-color: #f4f4f4; padding: 10px; font-size: 14px; color: #666;">
                                        <p>&copy; 2024 Janitorial Appointment. All Rights Reserved.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            `,
        });

        console.log("Email sent successfully:", response);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

async function run() {
    try {

        app.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
            const sig = request.headers['stripe-signature'];
            let event;
            try {
                // Construct the event using the raw body
                event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret); // Replace with your endpoint secret
                // console.log('Event constructed successfully:', event); // Log the event if successful
            } catch (err) {
                console.error('Webhook signature verification failed:', err.message); // Log verification errors
                response.status(400).send(`Webhook Error: ${err.message}`);
                return;
            }

            // Handle the event
            switch (event.type) {
                case 'payment_intent.succeeded':
                    const paymentIntentSucceeded = event.data.object;
                    break;

                case 'checkout.session.completed':
                    const session = await stripe.checkout.sessions.retrieve(
                        event.data.object.id,
                        { expand: ['line_items'] }
                    );
                    const customerId = session.customer;
                    console.log(customerId)
                    const customerDetails = session.customer_details;
                    if (customerDetails?.email) {
                        const user = await userCollection.findOne({ email: customerDetails.email });
                        if (!user) throw new Error(`User not found`)
                        if (user?.customerId) {
                            await userCollection.updateOne({ userId: user?.userId }, {
                                $set: {
                                    customerId: customerId
                                }
                            })
                        }
                        const line_items = session.line_items?.data || [];

                        for (const item of line_items) {
                            const priceId = item.price?.id;
                            const isSubscription = item?.price?.type === 'recurring';
                            if (isSubscription) {
                                let endDate = new Date();
                                if (priceId === process.env.YEARLY_PRICE_ID) {
                                    endDate.setFullYear(endDate.getFullYear() + 1); // Add one year to the current date
                                } else if (priceId === process.env.BI_ANNUALLY_PRICE_ID) {
                                    endDate.setMonth(endDate.getMonth() + 6); // Add one month to the current date
                                } else {
                                    throw new Error('Invalid price Id')
                                }
                                await userCollection.updateOne({ email: customerDetails.email }, {
                                    $set: {
                                        plan: item?.description,
                                    }
                                })
                                const user = await userCollection.findOne({ email: customerDetails.email });
                                const subscribedUser = await premiumUsers.findOne({ userId: user.userId })
                                if (subscribedUser) {
                                    await premiumUsers.updateOne({ userId: user.userId }, {
                                        $set: {
                                            startDate: new Date(), endDate: endDate, plan: "premium", period: priceId === process.env.BI_ANNUALLY_PRICE_ID ? "Bi-Annually" : 'Yearly'
                                        }
                                    })
                                }
                                else {
                                    await premiumUsers.insertOne({ userId: user.userId, startDate: new Date(), endDate: endDate, plan: "premium", period: priceId === process.env.BI_ANNUALLY_PRICE_ID ? "Bi-Annually" : 'Yearly' })
                                }
                            }
                        }
                    }
                    break;

                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            // Return a 200 response to acknowledge receipt of the event
            response.send();
        })

        app.use(express.json())

        app.post("/create-payment-intent", async (req, res) => {
            try {
                // Get price from the request body
                const { price } = req.body;

                // Validate if price exists and is a valid number
                if (!price || isNaN(price) || price <= 0) {
                    return res.status(400).send({ message: 'Invalid price' });
                }

                // Create a new customer on Stripe
                const customer = await stripe.customers.create();

                // Create the PaymentIntent
                const paymentIntent = await stripe.paymentIntents.create({
                    customer: customer.id,
                    setup_future_usage: "on_session", // Optional: Allows saving the payment method for future use
                    amount: price * 100, // Convert to cents (Stripe expects amounts in cents)
                    currency: "usd", // Specify your desired currency
                    automatic_payment_methods: {
                        enabled: true, // Automatically attempt to pay using available methods
                    },
                });

                // Send the client secret back to the frontend to confirm the payment
                res.send({
                    clientSecret: paymentIntent.client_secret,
                });
            } catch (error) {
                console.error('Error creating payment intent:', error); // Log error to server console
                res.status(500).send({ message: 'Internal Server Error', error: error.message }); // Return error response
            }
        });

        app.post('/user', async (req, res) => {
            const data = req.body;
            await sendEmail(data?.email, data);
            const result = await userCollection.insertOne(data);
            res.send(result);
        })

        app.get('/user', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/userEmail', async (req, res) => {
            const email = req.body.email;
            const userName = req.body.userName;
            const userData = await userCollection.findOne({ email: email });
            const token = jwt.sign({
                email: email,
                userName: userName,
                isAdmin: userData?.isAdmin,
                isSeller: userData?.isSeller
            }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ token })
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

        app.get('/getLeads', async (req, res) => {
            const leadName = req.query.leadName;
            const id = req.query.id;
            const states = req.query.states;
            console.log(leadName, id, states);
            let query = { verified: { $eq: true } };
            if (leadName && states && id) {
                query = { $and: [{ category: { $eq: leadName } }, { verified: { $eq: true } }, { states: { $eq: states } }, { _id: new ObjectId(id) }] }
                const result = await leads.findOne(query);
                return res.send(result);
            }
            else if (leadName && states) {
                query = { $and: [{ category: { $eq: leadName } }, { verified: { $eq: true } }, { states: { $eq: states } }] }
            }
            else if (leadName) {
                query = { $and: [{ category: { $eq: leadName } }, { verified: { $eq: true } }] }
            }
            const result = await leads.find(query, {
                projection: {
                    lastName: 0, phoneNumber: 0, additionalDetails: 0, audio: 0, businessName: 0, time: 0, location: 0, firstName: 0, sellerId: 0, companyName: 0, date: 0, sellerPayment: 0
                }
            }).toArray();
            return res.send(result);
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
            console.log(result);
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

        app.post('/appointment', async (req, res) => {
            const data = req.body;
            const result = await appointments.insertOne(data);
            res.send(result);
        })

        app.get('/appointment', verifyToken, verifyAdmin, async (req, res) => {
            const data = await appointments.find().toArray();
            res.send(data);
        })

        app.get('/premiumUsers', verifyToken, verifyAdmin, async (req, res) => {
            const subscribedUsers = await premiumUsers.find().toArray();
            const result = await Promise.all(
                subscribedUsers.map(async (user) => {
                    const premiumUser = await userCollection.findOne({ userId: user.userId }, {
                        projection: {
                            companyName: 1,
                            email: 1,
                            plan: 1,
                            phoneNumber: 1,
                        }
                    });
                    return {
                        user: premiumUser,
                        startDate: user.startDate,
                        endDate: user.endDate,
                        plan: user.plan,
                        period: user.period,
                    }
                })
            );
            res.send(result)
        })

        app.get('/myProducts/:userId', verifyToken, async (req, res) => {
            const userId = req.params.userId;
            const products = await purchased.find({ userId: userId }).toArray();
            const result = await Promise.all(
                products.map(async (product) => {
                    const lead = await leads.findOne({ _id: new ObjectId(product.product_Id) }, { projection: { leadName: 1, city: 1 } })
                    return (
                        {
                            leadName: lead.leadName,
                            city: lead.city,
                            amount: product.amount,
                            status: product.status,
                            time: product.time
                        }
                    )
                })
            )
            res.send(result)
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




