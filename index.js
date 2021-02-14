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
    email: String,
    password: String,
    isAdmin: Boolean
};

const User = new mongoose.model('User', userSchema);

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post("/register", (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, function(err, hash){
        const newUser = new User({
            email: req.body.email,
            password: hash
        });
        newUser.save(function(error) {
            if (error) {
                console.log(error);
            }
            else {
                res.render('success', {username: req.body.email});
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
                    }
                    else {
                        if (result===true && !foundUser.isAdmin) {
                            res.render('success', {username: foundUser.email});
                        }
                        else if(result===true && foundUser.isAdmin){
                            res.render('admin',{username: foundUser.email});
                        }
                        
                    }
                });
            }
        }
    });
});

app.post("/ban", (req,res)=> {
    console.log(req.body.email);
});

app.listen(port, () => console.log('Node server listening on port 6969!'));