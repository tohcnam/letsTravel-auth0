const express = require('express');
const app =  express();
const mongoose = require('mongoose');
const multer = require('multer');
const dotenv = require('dotenv');
dotenv.config();

let auth = require('./controllers/auth');
app.use(auth.oidc);
const session = require('express-session');
const url = require('url');
const fetch = require('node-fetch');

let postsRouter = require('./routes/posts');
let callbackRequestsRouter = require('./routes/callback-requests');
let emailsRouter = require('./routes/emails');
let Post = require('./models/post').Post;

app.set('view engine', 'ejs');
dotenv.config();
let connectionString = 'mongodb://travel:Password123@demodb-auth0:27017/travel?authSource=travel&w=1';
mongoose.connect(connectionString, { useUnifiedTopology: true, useNewUrlParser: true })
    .catch(error => console.log(error));

app.use(express.json());

// session support is required to use ExpressOIDC
app.use(session({
    secret: 'this should be secure',
    resave: true,
    saveUninitialized: false
}));

let imageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/images'),
    filename: (req, file, cb) => cb(null, file.originalname)
})
app.use(multer({storage: imageStorage}).single('imageFile'));

app.use(express.static('public'));

var ManagementClient = require('auth0').ManagementClient;
var management = new ManagementClient({
  token: process.env.API_TOKEN,
  domain: process.env.AUTH_DOMAIN,
});

app.use('/posts', postsRouter);
app.use('/callback-requests', callbackRequestsRouter);
app.use('/emails', emailsRouter);

app.get('/', (req, res) => {
    const userinfo = req.oidc.user;
    res.render('index', {
      pageTitle: process.env.TITLE,
      isLoggedIn: !!userinfo,
      user: userinfo
    });
})
app.get('/register', (req, res) => {
    res.oidc.login({returnTo: '/', authorizationParams: { screen_hint: 'signup' } });
  }) 

app.get('/sight', async (req, res) => {
    const userinfo = req.oidc.user;
    let id = req.query.id;
    let post = await Post.findOne({id: id});
    let date = new Date(post.date);
    res.render('sight', {
        pageTitle: post.title, 
        imageURL: post.imageURL, 
        date: date.toLocaleString(),
        text: post.text,
        user: userinfo,
        isLoggedIn: !!userinfo
    })
});

app.get('/admin', auth.requiresAuth(), (req, res) => {
    const userinfo = req.oidc.user;
    let isLoggedIn = !!userinfo;

    if(isLoggedIn && userinfo[process.env.NAMESPACE+"demoAdmin"]){
        res.render('admin', {
            pageTitle: 'Admin Page',
            user: userinfo,
            isLoggedIn: isLoggedIn
        })
    } else {
        res.status(401);
        res.send('Rejected, not enough rights!');
    }
});

app.get('/profile', auth.requiresAuth(), (req, res) => {
    const tokens = {
        "token_type": req.oidc.accessToken.token_type,
        "expires_in": req.oidc.accessToken.expires_in,
        "access_token": req.oidc.accessToken.access_token,
        "refresh_token": req.oidc.refreshToken,
        "id_token": req.oidc.idToken,
    }
    const userinfo = req.oidc.user;
    res.render('profile', {
        pageTitle: 'Profile Page',
        user: userinfo,
        isLoggedIn: !!userinfo,
        tokens: tokens
    });
});

app.get('/user/:id', auth.requiresAuth(), async (req, res) => {
    const userinfo = req.oidc.user;
    let userId = userinfo.sub;

    management.users.get({id: userId})
        .then((user) => {
            res.send(JSON.stringify(user))
        })
        .catch((e) => console.log(e));

});

app.post('/user', auth.requiresAuth(), async (req, res) => {
    const userinfo = req.oidc.user;
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let mfa = req.body.mfa;
    let userId = userinfo.sub;

    if(userId === req.body.userId){

        let data = {
            "family_name": lastName, 
            "given_name": firstName,
            "name": firstName + " " + lastName,
            "user_metadata": {"mfa": mfa}
        }
        management.users.update({ id: userId }, data)
            .then((resp) => res.send('successful'))
            .catch((e) => console.error(e));
    } else
        res.send('denied');
});

app.get('/registration', async (req, res) => {
    const userinfo = req.oidc.user;
    res.render('registration', {
        pageTitle: 'Registration',
        user: userinfo,
        isLoggedIn: !!userinfo
    })
});

app.post('/registration', async (req, res) => {
    let email = req.body.email;
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let phone = req.body.phone;
    let terms = req.body.terms;

    let newUser = await fetch(baseUrl+'/api/v1/users?activate=true', {
        method: 'POST', 
        headers: {
            "Accept": "application/json", 
            "Content-Type": "application/json", 
            "Authorization": 'SSWS ' + process.env.ADMINTOKEN
        }, 
        body: JSON.stringify({
            "profile": {
                "firstName": firstName,
                "lastName": lastName,
                "email": email, 
                "login": email, 
                "primaryPhone": phone,
                "terms": terms.toString()
            },
            "groupIds": [
              "00g1hkt8owx7t9jBd0x7"
            ]
        })
    })
    .then((resp) => resp.json())
    .then((data) => data)
    .catch(error => {
        console.log('error', error)
        res.status(500).send('Registration failed')
    });
    if(process.env.AUTOENROLL_SMS){
        await fetch(baseUrl+'/api/v1/users/' + newUser.id + '/factors?activate=true', {
            method: 'POST', 
            headers: {
                "Accept": "application/json", 
                "Content-Type": "application/json", 
                "Authorization": 'SSWS ' + process.env.ADMINTOKEN
            }, 
            body: JSON.stringify({
                "factorType": "sms",
                "provider": "OKTA",
                "profile": {
                    "phoneNumber": phone
                }
            })
        })
        .then((resp) => resp.json())
        .then((data) => data)
        .catch(error => {
            console.log('error', error)
            res.status(500).send('Registration failed')
        });
    }
    res.send('successful')
});

let port = process.env.PORT;
app.listen(port, () => console.log('Listening on port '+ port));