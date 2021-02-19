const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const saltRounds = 11;
const port = 6969;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
mongoose.connect('mongodb+srv://snpAdmin:s&pCoders@wsm.cuhkw.mongodb.net/test', {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = {
    username: String,
    email: String,
    password: String,
    isAdmin: Boolean
};

const postSchema = {
    text: String,
    author: String,
    likes: Number,
    dislikes: Number,
    master: Boolean,
    date: Date
};

const User = new mongoose.model('User', userSchema);
const Post = new mongoose.model('Post', postSchema);


app.get('/', (req, res) => {
    res.render('index');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/delete', (req, res) => {
    res.render('delete');
});

app.get('/makePost', function (req, res) {
    res.render('makePost');
  });

app.post("/register", (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, function(err, hash){
        const newUser = new User({
            username: req.body.username,
            email: req.body.email,
            password: hash
        });
        newUser.save(function(error) {
            if (error) {
                console.log(error);
            }
            else {
                res.render('userPage', {username: req.body.username});
            }
        });    
    });
});

app.post("/login", (req,res)=> {
    const email = req.body.email;
    const password = req.body.password;
    
    User.findOne({email: email}, function(err, foundUser){
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, function(error, result) {
                    if (error) {
                        console.log(error);
                    } else {
                        if (result === true) {
                            if (!foundUser.isAdmin) {
                                res.render('userPage', {username: foundUser.username});
                            } else if (foundUser.isAdmin) {
                                res.render('admin', {username: foundUser.username});
                            }
                        } else {
                            res.render('login', {loginfail: 'Failed login attempt'});
                        }
                    }
                });
            } else {
                res.render('login', {loginfail: 'Failed login attempt'});
            }
        }
    });
});

app.post("/ban", (req,res)=> {
    console.log(req.body.email);
});

app.post("/makePost",(req,res)=> {
    const newPost = new Post({
        author: req.body.username,
        text: req.body.postContent,
        master: true,
        likes: 0,
        dislikes: 0,
        date: new Date()
    });
    newPost.save(function(error) {
        if (error) {
            console.log(error);
        }
        else {
            res.render('userPage', {username: req.body.email});
        }
    });  
});

app.listen(port, () => console.log('Node server listening on port 6969!'));