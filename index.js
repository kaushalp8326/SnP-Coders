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
    isBanned: Boolean,
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
    date: Date,
    interest: String,
    isReported: Boolean,
    isVisible: Boolean,
    comments: [{type: mongoose.Types.ObjectId, ref: "Post"}]
};

const User = new mongoose.model('User', userSchema);
const Post = new mongoose.model('Post', postSchema);


// Landing Page
app.get('/', (req, res) => {
    res.render('index');
});


// Register Pages
app.get('/register', (req, res) => {
    res.render('register', {registerFail: []});
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


// Login Pages
app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('home');
        // Post.find({author: req.session.user.username}).sort({date: -1}).exec(function(findPostError, foundPosts) {
        //     if (findPostError) {
        //         console.log(findPostError);
        //     } else {
        //         res.render('home', {user: req.session.user, posts: foundPosts});
        //     }
        // });
    }
    else {
        res.render('login');
    }
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
                            // Post.find({author: req.session.user.username}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                            //     if (findPostError) {
                            //         console.log(findPostError);
                            //     } else {
                            //         res.render('userPage', {user: req.session.user, posts: foundPosts});
                            //     }
                            // });
                            res.redirect('home');
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


// Home Page
app.get('/home', (req, res) => {
    Post.find({isVisible: true, author: {$in: req.session.user.following}}).sort({date: -1}).exec(function(findPostError, foundPosts) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            res.render('home', {user: req.session.user, posts: foundPosts});
        }
    });
});


//Profile Pages
app.get('/profile', function (req, res) {
    Post.find({author: req.session.user.username, isVisible: true}).sort({date: -1}).exec(function(findPostError, foundPosts) {
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
                Post.find({author: username, isVisible: true}).sort({date: -1}).exec(function(findPostError, foundPosts) {
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


// Explore Page
app.get("/explore", (req, res) => {
    User.find({}).exec(function(findPostError, foundUsers) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            res.render('explore', {users: foundUsers});
        }
    });
});


// Popular Page
app.get('/popular', (req, res) => {
    Post.find({isVisible: true}).sort({likes: -1}).exec(function(findPostError, foundPosts) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            res.render('popular', {user: req.session.user, posts: foundPosts});
        }
    });
});


// Logout
app.get('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/login');
});


// Profile Interactions
app.get('/editBio', (req, res) => {
    res.render('editBio', {user: req.session.user});
});

app.post("/editBio", (req, res) => {
    User.findByIdAndUpdate(req.session.user._id, {bio: req.body.bio}, {new: true}, function (error, updatedUser) {
        if (error) {
            console.log(error);
        }
        else {
            if (updatedUser) {
                req.session.user = updatedUser;
                res.redirect("/profile");
            }
        }
    });
})

app.get('/editInterests', (req, res) => {
    res.render('editInterests', {user: req.session.user});
});

app.post("/addInterest", (req,res) => {
    if(req.body.newInt.length>0){
        User.findOne({username: req.session.user.username}, function(err, foundClient) {
            if (err) {
                console.log(err);
            }
            else {
                if (foundClient) {
                    if (!foundClient.interests.includes(req.body.newInt)){
                        foundClient.interests.push(req.body.newInt);
                    }
                    foundClient.save(function (saveError){
                        if (saveError){
                            console.log(saveError);
                        }
                        else{
                            req.session.user = foundClient;
                            res.redirect('back');
                        }
                    });
                }
            }
        });
    }
});

app.get("/delete/userint/:interest", (req, res) => {
    const uint = req.params.interest;
    User.findOne({username: req.session.user.username}, (function(error, foundUser) {
        if (error) {
            console.log(error);
        } else {
            if(foundUser){
                foundUser.interests.remove(uint);
                foundUser.save(function (saveError){
                    if(saveError){
                        console.log(saveError);
                    }
                    else{
                        req.session.user = foundUser;
                        res.redirect('back');
                    }
                });
            }   
        }
    }));
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


// User Interactions
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


// Post Interactions
app.get('/makePost', function (req, res) {
    res.redirect("login");
});

app.post("/makePost",(req,res)=> {
    const newPost = new Post({
        author: req.body.username,
        text: req.body.postContent,
        interest: req.body.interest,
        master: true,
        date: new Date(),
        isReported: false,
        isVisible: true
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

app.post("/searchPost", (req,res)=>{
    Post.find({interest: req.body.interest, isVisible: true}).sort({date: -1}).exec(function(findPostError, foundPosts) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            res.render('searchPostResults', {user: req.session.user, interest: req.body.interest, posts: foundPosts});
        }
    });
});

app.get("/viewPost/postId/:postId", (req,res)=>{
    const postId = req.params.postId;
    Post.findOne({_id: mongoose.Types.ObjectId(postId)}).populate('comments').exec(function(err, post) {
        if (err) {
            console.log(err);
        }
        else {
            if (post) {
                res.render('viewPost', {post: post, user: req.session.user});
            }
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

app.post("/makeComment", (req,res)=>{
    const newPost = new Post({
        author: req.body.username,
        text: req.body.postContent,
        interest: req.body.interest,
        master: false,
        date: new Date(),
        isReported: false,
        isVisible: true
    });
    Post.findOne({_id: mongoose.Types.ObjectId(req.body.parentPost)}, function(error, post){
        if (error){
            console.log(error);
        }
        else {
            if (post) {
                newPost.save();
                post.comments.push(newPost);
                post.save();
                res.redirect("back");

            }
        }
    })
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

app.get("/report/postId/:postId", (req, res) => {
    const postId = req.params.postId;
    const username = req.params.profile;
    Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(reportPostError, reportPost) {
        if (reportPostError) {
            console.log(reportPostError);
        } else {
            reportPost.isReported=true;
            reportPost.save(function(saveError) {
                if (saveError) {
                    console.log(saveError);
                } else {
                    res.redirect('back');
                }
            });
        }
    }));
});


// Admin Functionalities
app.get("/viewReportedPosts", (req,res)=>{
    Post.find({isReported: true}).sort({date: -1}).exec(function(findPostError, foundPosts) {
        if (findPostError) {
            console.log(findPostError);
        } else {
            res.render('reportedPosts', {user: req.session.user, posts: foundPosts});
        }
    });
});

app.get("/ban/username/:username", (req, res) => {
    if (req.session.user.isAdmin) {
        const username = req.params.username;
        User.findOne({username: username}, function(error, foundUser) {
            foundUser.isBanned = true;
            foundUser.save(function (saveErr) {
                if (saveErr) {
                    console.log(saveErr);
                } else {
                    Post.find({author: username}, function(findPostError, foundPosts) {
                        foundPosts.forEach(function(post) {
                            post.isVisible = false;
                            post.save(function(postSaveErr) {
                                if (postSaveErr) {
                                    console.log(postSaveErr);
                                }
                            });
                        });
                    });
                    res.redirect('back');
                }
            });
        });
    } else {
        res.redirect('back');
    }
});

app.get("/unban/username/:username", (req, res) => {
    if (req.session.user.isAdmin) {
        const username = req.params.username;
        User.findOne({username: username}, function(error, foundUser) {
            foundUser.isBanned = false;
            foundUser.save(function (saveErr) {
                if (saveErr) {
                    console.log(saveErr);
                } else {
                    Post.find({author: username}, function(findPostError, foundPosts) {
                        foundPosts.forEach(function(post) {
                            post.isVisible = true;
                            post.save(function(postSaveErr) {
                                if (postSaveErr) {
                                    console.log(postSaveErr);
                                }
                            });
                        });
                    });
                    res.redirect('back');
                }
            });
        });
    } else {
        res.redirect('back');
    }
});

// Deprecated?
// app.get('/delete', (req, res) => {
//     res.render('delete');
// });


// Run Site
app.listen(port, () => console.log('Node server listening on port 6969!'));