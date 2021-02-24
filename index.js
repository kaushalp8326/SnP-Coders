const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const express = require('express');
var session = require('client-sessions');

const app = express();
const saltRounds = 11;
const port = 6969;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    cookieName: 'session',
    secret: 'AAKL',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
  }));

mongoose.connect('mongodb+srv://snpAdmin:s&pCoders@wsm.cuhkw.mongodb.net/test', {useNewUrlParser: true, useUnifiedTopology: true});


const userSchema = {
    username: String,
    email: String,
    password: String,
    isAdmin: Boolean,
    bio: String,
    joined: Date,
    following: [String],
    followers: [String],
    interests: [String]
};

const postSchema = {
    text: String,
    author: String,
    likes: [String],
    dislikes: [String],
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

app.get('/profile', function (req, res) {
    User.findOne({username: req.session.user.username}, function(findUserError, foundUser) {
        if (findUserError) {
            console.log(findUserError);
        } else {
            Post.find({author: req.session.user.username}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                if (findPostError) {
                    console.log(findPostError);
                } else {
                    res.render('profile', {userJSON: foundUser, requestsJSON: foundPosts});
                }
            });
        }
    });
});

app.get('/makePost', function (req, res) {
    res.render('makePost', {username: req.session.user.username});
});

app.get('/popular', (req, res) => {
    Post.find({}).sort({likes: -1}).exec(function(findPostError, foundPosts) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            res.render('popular', {popularJSON: foundPosts, popularUser: req.session.user.username});
        }
    });
});


app.post("/register", (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, function(hashError, hash){
        if (hashError) {
            console.log(hashError);
        } else {
            const newUser = new User({
                username: req.body.username,
                email: req.body.email,
                password: hash,
                joined: new Date()
            });
            newUser.save(function(saveError) {
                if (saveError) {
                    console.log(saveError);
                } else {
                    req.session.user = newUser;
                    res.render('userPage', {username: req.body.username});
                }
            });
        } 
    });
});

app.post("/login", (req,res)=> {
    const email = req.body.email;
    const password = req.body.password;
    
    User.findOne({email: email}, function(findUserError, foundUser){
        if (findUserError) {
            console.log(findUserError);
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, function(compareError, result) {
                    if (compareError) {
                        console.log(compareError);
                    } else {
                        if (result === true) {
                            if (!foundUser.isAdmin) {
                                req.session.user = foundUser;
                                res.render('userPage', {username: foundUser.username});
                            } else if (foundUser.isAdmin) {
                                req.session.user = foundUser;
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
        date: new Date()
    });
    newPost.save(function(saveError) {
        if (saveError) {
            console.log(saveError);
        } else {
            res.render('userPage', {username: req.body.email});
        }
    });  
});

app.post('/viewPost', (req, res) => {
    const user = req.body.user;
    const postId = req.body.postId; 
    Post.findOne({_id: mongoose.Types.ObjectId(postId)}, function(findPostError, foundPost) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            if (foundPost) {
                res.render('post', {postJSON: foundPost, user: user});
            }
        }  
    });
});

app.post("/like", (req, res) => {
    const user = req.body.user;
    const postId = req.body.postId;
    Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            if (foundPost.dislikes.includes(user)) {
                foundPost.dislikes.remove(user);
            }
            if (!foundPost.likes.includes(user)) {
                foundPost.likes.push(user);
            }
            foundPost.save(function(saveError) {
                if (saveError) {
                    console.log(saveError);
                } else {
                    res.redirect('back');
                }
            });
        }
    }));
});

app.post("/unlike", (req, res) => {
    const user = req.body.user;
    const postId = req.body.postId;
    Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            if (foundPost.likes.includes(user)) {
                foundPost.likes.remove(user);
            }
            foundPost.save(function(saveError) {
                if (saveError) {
                    console.log(saveError);
                } else {
                    res.redirect('back');
                }
            });
        }
    }));
});

app.post("/dislike", (req, res) => {
    const user = req.body.user;
    const postId = req.body.postId;
    Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            if (foundPost.likes.includes(user)) {
                foundPost.likes.remove(user);
            }
            if (!foundPost.dislikes.includes(user)) {
                foundPost.dislikes.push(user);
            }
            foundPost.save(function(saveError) {
                if (saveError) {
                    console.log(saveError);
                } else {
                    res.redirect('back');
                }
            });
        }
    }));
});

app.post("/undislike", (req, res) => {
    const user = req.body.user;
    const postId = req.body.postId;
    Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            if (foundPost.dislikes.includes(user)) {
                foundPost.dislikes.remove(user);
            }
            foundPost.save(function(saveError) {
                if (saveError) {
                    console.log(saveError);
                } else {
                    res.redirect('back');
                }
            });
        }
    }));
});


app.listen(port, () => console.log('Node server listening on port 6969!'));