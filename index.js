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
    res.render('register', {registerFail: []});
});

app.get('/editBio', (req, res) => {
    res.render('editBio', {user: req.session.user});
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        Post.find({author: req.session.user.username}).sort({date: -1}).exec(function(findPostError, foundPosts) {
            if (findPostError) {
                console.log(findPostError);
            } else {
                res.render('userPage', {user: req.session.user, posts: foundPosts});
            }
        });
    }
    else {
        res.render('login');
    }
});

app.get('/delete', (req, res) => {
    res.render('delete');
});

app.get('/profile', function (req, res) {
    Post.find({author: req.session.user.username}).sort({date: -1}).exec(function(findPostError, foundPosts) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            res.render('userPage', {user: req.session.user, posts: foundPosts});
        }
    });
});

app.get('/profile/:profile', (req, res) => {
    const username = req.params.profile;
    if (req.params.profile == req.session.user.username) {
        res.redirect('/profile');
    } else {
        User.findOne({username: username}, function(error, foundUser) {
            if (error) {
                console.log(error);
            } else {
                Post.find({author: username}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                    if (findPostError) {
                        console.log(findPostError);
                    } else {
                        if (foundUser) {
                            res.render('profile', {user: foundUser, posts: foundPosts, local: req.session.user});    
                        }
                    }
                });
            }
        });
    }
});

app.get('/followers/:username', (req, res) => {
    const username = req.params.username;
    User.findOne({username: username}, function(error, foundUser) {
        if (error) {
            console.log(error);
        } else {
            res.render('followers', {user: foundUser});
        }
    });
});

app.get('/following/:username', (req, res) => {
    const username = req.params.username;
    User.findOne({username: username}, function(error, foundUser) {
        if (error) {
            console.log(error);
        } else {
            res.render('following', {user: foundUser});
        }
    });
});

app.get('/makePost', function (req, res) {
    res.redirect("login");
});

app.get('/popular', (req, res) => {
    Post.find({}).sort({likes: -1}).exec(function(findPostError, foundPosts) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            res.render('popular', {user: req.session.user, posts: foundPosts});
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/login');
});


app.get("/like/postId/:postId", (req, res) => {
    const user = req.session.user.username;
    const postId = req.params.postId;
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

app.get("/unlike/postId/:postId", (req, res) => {
    const user = req.session.user.username;
    const postId = req.params.postId;
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

app.get("/dislike/postId/:postId", (req, res) => {
    const user = req.session.user.username;
    const postId = req.params.postId;
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

app.get("/undislike/postId/:postId", (req, res) => {
    const user = req.session.user.username;
    const postId = req.params.postId;
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

app.get("/follow/username/:username", (req, res) => {
    const username = req.params.username;
    User.findOne({username: username}, function(error, foundUser) {
        if (!foundUser.followers.includes(req.session.user.username)) {
            foundUser.followers.push(req.session.user.username);
        }
        User.findOne({username: req.session.user.username}, function(err, foundClient) {
            if (err) {
                console.log(err);
            }
            else {
                if (foundClient) {
                    if (!foundClient.following.includes(foundUser.username)) {
                        foundClient.following.push(foundUser.username);
                        foundClient.save(function (saveError) {
                            if (saveError) {
                                console.log(saveError);
                            } else {
                                foundUser.save(function (saveErr) {
                                    if (saveErr) {
                                        console.log(saveErr);
                                    } else {
                                        req.session.user = foundClient;
                                        res.redirect('back');
                                    }
                                });
                            }
                        });
                    }
                }
            }
        });
        
    });
});

app.get("/unfollow/username/:username", (req, res) => {
    const username = req.params.username;
    User.findOne({username: username}, function(error, foundUser) {
        if (foundUser.followers.includes(req.session.user.username)) {
            foundUser.followers.remove(req.session.user.username);
        }
        User.findOne({username: req.session.user.username}, function(err, foundClient) {
            if (err) {
                console.log(err);
            }
            else {
                if (foundClient) {
                    if (foundClient.following.includes(foundUser.username)) {
                        foundClient.following.remove(foundUser.username);
                        foundClient.save(function (saveError) {
                            if (saveError) {
                                console.log(saveError);
                            } else {
                                foundUser.save(function (saveErr) {
                                    if (saveErr) {
                                        console.log(saveErr);
                                    } else {
                                        req.session.user = foundClient;
                                        res.redirect('back');
                                    }
                                });
                            }
                        });
                    }
                }
            }
        });
    });
});

app.get("/delete/postId/:postId", (req, res) => {
    const postId = req.params.postId;
    Post.deleteOne({_id: mongoose.Types.ObjectId(postId)}, (function(deletePostError) {
        if (deletePostError) {
            console.log(deletePostError);
        } else {
            res.redirect('back');
        }
    }));
});

app.get("/explore", (req, res) => {
    User.find({}).exec(function(findPostError, foundUsers) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            res.render('explore', {users: foundUsers});
        }
    });
});

app.post("/register", (req, res) => {
    let validEmail = true;
    let validUsername = true;
    let registerFail = [];

    User.findOne({email: req.body.email}, function(error, foundEmail) {
        if (error) {
            console.log(error);
        } else {
            if (foundEmail) {
                validEmail = false;
            }
            User.findOne({username: req.body.username}, function(erro, foundUser) {
                if (erro) {
                    console.log(erro);
                } else {
                    if (foundUser) {
                        validUsername = false;
                    }
                    if (validEmail && validUsername) {
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
                                        Post.find({author: req.session.user.username}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                                            if (findPostError) {
                                                console.log(findPostError);
                                            } else {
                                                res.render('userPage', {user: req.session.user, posts: foundPosts});
                                            }
                                        });
                                    }
                                });
                            } 
                        });
                    } else {
                        if (!validEmail) {
                            registerFail.push("Email is already taken.");
                        }
                        if (!validUsername) {
                            registerFail.push("Username is already taken.");
                        }
                        res.render("register", {registerFail: registerFail});
                    }
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
                            req.session.user = foundUser;
                            Post.find({author: req.session.user.username}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                                if (findPostError) {
                                    console.log(findPostError);
                                } else {
                                    res.render('userPage', {user: req.session.user, posts: foundPosts});
                                }
                            });
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
            Post.find({author: req.session.user.username}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                if (findPostError) {
                    console.log(findPostError);
                } else {
                    res.render('userPage', {user: req.session.user, posts: foundPosts});
                }
            });
        }
    });  
});

app.post("/editBio", (req, res) => {
    console.log(req.body.bio);
    User.findByIdAndUpdate(req.session.user._id, {bio: req.body.bio}, {new: true}, function (error, updatedUser) {
        if (error) {
            console.log(error);
        }
        else {
            if (updatedUser) {
                req.session.user = updatedUser;
                console.log(updatedUser);
                res.redirect("/profile");
            }
        }
    });
})

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

app.listen(port, () => console.log('Node server listening on port 6969!'));