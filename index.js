const bcrypt = require('bcrypt');
const isImageUrl = require('is-image-url');
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

// module.exports = app;


mongoose.connect('mongodb+srv://snpAdmin:s&pCoders@wsm.cuhkw.mongodb.net/test', {useNewUrlParser: true, useUnifiedTopology: true});


const userSchema = {
    username: String,
    email: String,
    password: String,
    isAdmin: Boolean,
    isBanned: Boolean,
    picture: String,
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
    isAnnouncement: Boolean,
    comments: [{type: mongoose.Types.ObjectId, ref: "Post"}]
};

const interestSchema = {
    name: String,
    approved: Boolean
};

const User = new mongoose.model('User', userSchema);
const Post = new mongoose.model('Post', postSchema);
const Interest = new mongoose.model('Interest', interestSchema);


// Landing Page
app.get('/', (req, res) => {
    res.render('index');
});


// Error Page
app.get('/error', (req, res) => {
    res.render('error', {user: req.session.user});
});


// Register Pages
app.get('/register', (req, res) => {
    res.render('register', {registerFail: []});
});

app.post("/register", (req, res) => {
    let validEmail = true;
    let validUsername = true;
    let validPassword = true;
    let registerFail = [];

    if (!/[a-z]/i.test(req.body.email)) {
        validEmail = false;
        registerFail.push("Please enter an email.");
    }

    if (!/[a-z]/i.test(req.body.username)) {
        validUsername = false;
        registerFail.push("Please enter a username.");
    }

    if (!/[a-z]/i.test(req.body.password)) {
        validPassword = false;
        registerFail.push("Please enter a password.");
    }

    User.findOne({email: req.body.email}, function(error, foundEmail) {
        if (error) {
            console.log(error);
            res.redirect('register');
        } else {
            if (foundEmail) {
                validEmail = false;
                registerFail.push("Email is already taken.");
            }
            User.findOne({username: req.body.username}, function(erro, foundUser) {
                if (erro) {
                    console.log(erro);
                    res.redirect('register');
                } else {
                    if (foundUser) {
                        validUsername = false;
                        registerFail.push("Username is already taken.");
                    }
                    if (validEmail && validUsername && validPassword) {
                        bcrypt.hash(req.body.password, saltRounds, function(hashError, hash){
                            if (hashError) {
                                console.log(hashError);
                                res.redirect('register');
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
                                        res.redirect('register');
                                    } else {
                                        req.session.user = newUser;
                                        Post.find({author: req.session.user.username}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                                            if (findPostError) {
                                                console.log(findPostError);
                                            } else {
                                                // res.render('userPage', {user: req.session.user, posts: foundPosts});
                                                res.redirect('/home');
                                            }
                                        });
                                    }
                                });
                            } 
                        });
                    } else {
                        res.status(406).render("register", {registerFail: registerFail});
                    }
                }
            });
        }
    });
});

// Login Pages
app.get('/login', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            res.redirect('home');
        }
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
            res.redirect('login');
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, function(compareError, result) {
                    if (compareError) {
                        console.log(compareError);
                        res.redirect('login');
                    } else {
                        if (result === true) {
                            if (foundUser.isBanned) {
                                res.render('ban', {user: foundUser, banned: foundUser});
                            } else {
                                req.session.user = foundUser;
                                res.redirect('home');
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


// Home Page
app.get('/home', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            Post.find({isVisible: true, author: {$in: req.session.user.following}}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                if (findPostError) {
                    console.log(findPostError);
                    res.redirect('error');
                } else {
                    let authors = [];
                    for (let post of foundPosts) {
                        authors.push(post.author);
                    }
                    User.find({username:{$in: authors}}).exec(function(findUserError, foundUsers) {
                        if (findUserError) {
                            console.log(findUserError);
                            res.redirect('error');
                        } else {
                            Interest.find({approved: true}).exec(function (findInterestError, foundInterests) {
                                if (findInterestError) {
                                    res.redirect('error');
                                } else {
                                    if (foundInterests) {
                                        res.render('home', {user: req.session.user, posts: foundPosts, users: foundUsers, interests: foundInterests});
                                    }
                                }
                            });
                        }
                    });
                }
            });
        }
    }
    else {
        res.redirect('/');
    }
});


//Profile Pages
app.get('/profile', function (req, res) {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            res.redirect('/profile/' + req.session.user.username);
        }
    } else {
        res.redirect('/');
    }
});

app.get('/profile/:profile', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.redirect('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const username = req.params.profile;
            if (req.params.profile == req.session.user.username) {
                Post.find({author: req.session.user.username, isVisible: true}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                    if (findPostError) {
                        console.log(findPostError);
                        res.redirect('../error');
                    } else {
                        Interest.find({approved: true}).exec(function (findInterestError, foundInterests) {
                            if (findInterestError) {
                                res.redirect('../error');
                            } else {
                                if (foundInterests) {
                                    res.render('userPage', {user: req.session.user, posts: foundPosts, interests: foundInterests});
                                }
                            }
                        });
                    }
                });
            } else {
                User.findOne({username: username}, function(error, foundUser) {
                    if (error) {
                        console.log(error);
                        res.redirect('../error');
                    } else {
                        if(foundUser == null){
                            res.redirect('../error');
                        }
                        Post.find({author: username, isVisible: true}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                            if (findPostError) {
                                console.log(findPostError);
                            } else {
                                if (foundUser) {
                                    Interest.find({approved: true}).exec(function (findInterestError, foundInterests) {
                                        if (findInterestError) {
                                            res.redirect('../error');
                                        } else {
                                            if (foundInterests) {
                                                if (foundUser.isBanned) {
                                                    res.render('ban', {user: req.session.user, banned: foundUser});
                                                } else {
                                                    res.render('profile', {user: req.session.user, profileUser: foundUser, posts: foundPosts, interests: foundInterests});
                                                }
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }
        }
    } else {
        res.redirect('/');
    }
    
});


// Announcements Page
app.get('/announcements', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            Post.find({isAnnouncement: true}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                if (findPostError) {
                    console.log(findPostError);
                } else {
                    let authors = [];
                    for (let post of foundPosts) {
                        authors.push(post.author);
                    }
                    User.find({username:{$in: authors}}).exec(function(findUserError, foundUsers) {
                        if (findUserError) {
                            console.log(findUserError);
                        } else {
                            Interest.find({approved: true}).exec(function (findInterestError, foundInterests) {
                                if (findInterestError) {
                                    res.redirect('error');
                                } else {
                                    if (foundInterests) {
                                        res.render('announcements', {user: req.session.user, posts: foundPosts, users: foundUsers, interests: foundInterests});
                                    }
                                }
                            });
        
                        }
                    });
                }
            });
        }
    } else {
        res.redirect('/');
    }
});


// Explore Page
app.get("/explore", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            User.find({isBanned: {$ne: true}, username: {$ne: req.session.user.username}}).exec(function(findPostError, foundUsers) {
                if (findPostError) {
                    console.log(findPostError);
                } else {
                    res.render('explore', {user: req.session.user, users: foundUsers});
                }
            });
        }
    } else {
        res.redirect('/');
    }
});


// Popular Page
app.get('/popular', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            Post.find({isVisible: true}).sort({likes: -1}).exec(function(findPostError, foundPosts) {
                foundPosts = sortPopular(foundPosts, 0, foundPosts.length - 1);
                if (findPostError) {
                    console.log(findPostError);
                } else {
                    let authors = [];
                    for (let post of foundPosts) {
                        authors.push(post.author);
                    }
                    User.find({username:{$in: authors}}).exec(function(findUserError, foundUsers) {
                        if (findUserError) {
                            console.log(findUserError);
                        } else {
                            Interest.find({approved: true}).exec(function (findInterestError, foundInterests) {
                                if (findInterestError) {
                                    res.redirect('error');
                                } else {
                                    if (foundInterests) {    
                                        res.render('popular', {user: req.session.user, posts: foundPosts, users: foundUsers, interests: foundInterests});
                                    }
                                }
                            });
                            
                        }
                    });
                }
            });
        }
    } else {
        res.redirect('/');
    }
});

function sortPopular(posts, start, end) {
    if (start < end) {
        let pivot = posts[end].likes.length - posts[end].dislikes.length;
        let i = (start - 1);
        let swapTemp;

        for (let j = start; j < end; j++) {
            if ((posts[j].likes.length - posts[j].dislikes.length) >= pivot) {
                i++;

                swapTemp = posts[i];
                posts[i] = posts[j];
                posts[j] = swapTemp;
            }
        }

        swapTemp = posts[i+1];
        posts[i+1] = posts[end];
        posts[end] = swapTemp;

        posts = sortPopular(posts, start, i)
        posts = sortPopular(posts, i + 2, end)
    }

    return posts;
}


// Logout
app.get('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/login');
});


// Profile Interactions
app.get('/changePic', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            res.render('changePic', {user: req.session.user, invalidURL: false});
        }
    } else {
        res.redirect('/');
    }
    
});

app.post("/changePic", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            if (isImageUrl(req.body.picture)) {
                User.findByIdAndUpdate(req.session.user._id, {picture: req.body.picture}, {new: true}, function (error, updatedUser) {
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
            } else {
                res.render('changePic', {user: req.session.user, invalidURL: true});
            }
        }
    } else {
        res.redirect('/');
    }
});

app.get('/editBio', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            res.render('editBio', {user: req.session.user});
        }
    } else {
        res.redirect('/');
    }
});

app.post("/editBio", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
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
        }
    } else {
        res.redirect('/');
    }
});

app.get('/editInterests', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            res.render('editInterests', {user: req.session.user});
        }
    } else {
        res.redirect('/');
    }
});

app.get("/delete/userint/:interest", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
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
        }
    } else {
        res.redirect('/');
    }
});


app.get('/followers/:username', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const username = req.params.username;
            User.findOne({username: username}, function(error, foundUser) {
                if (error) {
                    console.log(error);
                } else {
                    res.render('followers', {user: req.session.user, profileUser: foundUser});
                }
            });
        }
    } else {
        res.redirect('/');
    }
});

app.get('/following/:username', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const username = req.params.username;
            User.findOne({username: username}, function(error, foundUser) {
                if (error) {
                    console.log(error);
                } else {
                    res.render('following', {user: req.session.user, profileUser: foundUser});
                }
            });
        }
    } else {
        res.redirect('/');
    }
    
});


// User Interactions
app.get("/follow/username/:username", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
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
        }
    } else {
        res.redirect('/');
    }
});

app.get("/unfollow/username/:username", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
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
        }
    } else {
        res.redirect('/');
    }
});


// Post Interactions

// REDUNDANT FUNCTION
// app.get('/makePost', function (req, res) {
//     if (req.session.user) {
//         if (req.session.user.isBanned) {
//             res.render('ban', {user: req.session.user, banned: req.session.user});
//         } else {
//             res.redirect("profile");
//         }
//     } else {
//         res.redirect('/');
//     }
// });

app.post("/makePost",(req,res)=> {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            if (req.body.interest == "Other") {
                if (req.body.addInterest.length>0) {
                    Interest.countDocuments({name: req.body.addInterest}, function(error, count){
                        if (error) {
                            console.log(error);
                        } else if (count > 0){
                            const newPost = new Post({
                                author: req.body.username,
                                text: req.body.postContent,
                                interest: req.body.addInterest,
                                master: true,
                                date: new Date(),
                                isReported: false,
                                isVisible: true,
                                isAnnouncement: false
                            });
                            User.findOne({username: req.session.user.username}, function(erro, foundUser) {
                                if (erro) {
                                    res.redirect('error');
                                } else {
                                    if (foundUser) {
                                        let newInterest = true;
                                        for (let i = 0; i < foundUser.interests.length; i++) {
                                            if (foundUser.interests[i] == req.body.interest) {
                                                newInterest = false;
                                                break;
                                            }
                                        }
                                        if (newInterest) {
                                            foundUser.interests.push(req.body.interest);
                                            foundUser.save(function (err) {
                                                if (err) {
                                                    res.redirect('error');
                                                } else {
                                                    req.session.user = foundUser;
                                                    newPost.save(function(saveError) {
                                                        if (saveError) {
                                                            console.log(saveError);
                                                        } else {
                                                            res.redirect('profile');
                                                        }
                                                    });
                                                }
                                            });
                                        } else {
                                            newPost.save(function(saveError) {
                                                if (saveError) {
                                                    console.log(saveError);
                                                } else {
                                                    res.redirect('profile');
                                                }
                                            });
                                        }
                                    } else {
                                        res.redirect('error');
                                    }
                                }
                            });
                        } else {
                            //add tag
                            if (req.session.user.isAdmin){
                                //auto approve interests submitted by admins
                                const addInterest = new Interest({
                                    name: req.body.addInterest,
                                    approved: true
                                });
                                addInterest.save(function(saveError) {
                                    if(saveError){
                                        console.log(saveError);
                                    }else{
                                        const newPost = new Post({
                                            author: req.body.username,
                                            text: req.body.postContent,
                                            interest: req.body.addInterest,
                                            master: true,
                                            date: new Date(),
                                            isReported: false,
                                            isVisible: true,
                                            isAnnouncement: false
                                        });
                                        User.findOne({username: req.session.user.username}, function(erro, foundUser) {
                                            if (erro) {
                                                res.redirect('error');
                                            } else {
                                                if (foundUser) {
                                                    let newInterest = true;
                                                    for (let i = 0; i < foundUser.interests.length; i++) {
                                                        if (foundUser.interests[i] == req.body.addInterest) {
                                                            newInterest = false;
                                                            break;
                                                        }
                                                    }
                                                    if (newInterest) {
                                                        foundUser.interests.push(req.body.addInterest);
                                                        foundUser.save(function (err) {
                                                            if (err) {
                                                                res.redirect('error');
                                                            } else {
                                                                req.session.user = foundUser;
                                                                newPost.save(function(saveErro) {
                                                                    if (saveErro) {
                                                                        console.log(saveErro);
                                                                    } else {
                                                                        res.redirect('profile');
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        newPost.save(function(saveErro) {
                                                            if (saveErro) {
                                                                console.log(saveErro);
                                                            } else {
                                                                res.redirect('profile');
                                                            }
                                                        });
                                                    }
                                                } else {
                                                    res.redirect('error');
                                                }
                                            }
                                        });
                                    }
                                });
                            } else {
                                const addInterest = new Interest({
                                    name: req.body.addInterest,
                                    approved: false
                                });
                                addInterest.save(function(saveError) {
                                    if(saveError){
                                        console.log(saveError);
                                    }else{
                                        const newPost = new Post({
                                            author: req.body.username,
                                            text: req.body.postContent,
                                            interest: req.body.addInterest,
                                            master: true,
                                            date: new Date(),
                                            isReported: false,
                                            isVisible: true,
                                            isAnnouncement: false
                                        });
                                        User.findOne({username: req.session.user.username}, function(erro, foundUser) {
                                            if (erro) {
                                                res.redirect('error');
                                            } else {
                                                if (foundUser) {
                                                    let newInterest = true;
                                                    for (let i = 0; i < foundUser.interests.length; i++) {
                                                        if (foundUser.interests[i] == req.body.interest) {
                                                            newInterest = false;
                                                            break;
                                                        }
                                                    }
                                                    if (newInterest) {
                                                        foundUser.interests.push(req.body.interest);
                                                        foundUser.save(function (err) {
                                                            if (err) {
                                                                res.redirect('error');
                                                            } else {
                                                                req.session.user = foundUser;
                                                                newPost.save(function(saveErro) {
                                                                    if (saveErro) {
                                                                        console.log(saveErro);
                                                                    } else {
                                                                        res.redirect('profile');
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        newPost.save(function(saveErro) {
                                                            if (saveErro) {
                                                                console.log(saveErro);
                                                            } else {
                                                                res.redirect('profile');
                                                            }
                                                        });
                                                    }
                                                } else {
                                                    res.redirect('error');
                                                }
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                }
            }
            else {
                const newPost = new Post({
                    author: req.body.username,
                    text: req.body.postContent,
                    interest: req.body.interest,
                    master: true,
                    date: new Date(),
                    isReported: false,
                    isVisible: true,
                    isAnnouncement: false
                });
                User.findOne({username: req.session.user.username}, function(error, foundUser) {
                    if (error) {
                        res.redirect('error');
                    } else {
                        if (foundUser) {
                            let newInterest = true;
                            for (let i = 0; i < foundUser.interests.length; i++) {
                                if (foundUser.interests[i] == req.body.interest) {
                                    newInterest = false;
                                    break;
                                }
                            }
                            if (newInterest) {
                                foundUser.interests.push(req.body.interest);
                                foundUser.save(function (err) {
                                    if (err) {
                                        res.redirect('error');
                                    } else {
                                        req.session.user = foundUser;
                                        newPost.save(function(saveError) {
                                            if (saveError) {
                                                console.log(saveError);
                                            } else {
                                                res.redirect('profile');
                                            }
                                        });
                                    }
                                });
                            } else {
                                newPost.save(function(saveError) {
                                    if (saveError) {
                                        console.log(saveError);
                                    } else {
                                        res.redirect('profile');
                                    }
                                });
                            }
                        } else {
                            res.redirect('error');
                        }
                    }
                });
            }
        }
    } else {
        res.redirect('/');
    } 
});

app.post("/makeAnnouncement",(req,res)=> {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            if (req.session.user.isAdmin) {
                if (req.body.interest == "Other") {
                    if (req.body.addInterest.length>0) {
                        Interest.countDocuments({name: req.body.addInterest}, function(error, count){
                            if (error) {
                                console.log(error);
                            } else if (count > 0){
                                const newPost = new Post({
                                    author: req.body.username,
                                    text: req.body.postContent,
                                    interest: req.body.addInterest,
                                    master: true,
                                    date: new Date(),
                                    isReported: false,
                                    isVisible: true,
                                    isAnnouncement: true
                                });
                                User.findOne({username: req.session.user.username}, function(erro, foundUser) {
                                    if (erro) {
                                        res.redirect('error');
                                    } else {
                                        if (foundUser) {
                                            let newInterest = true;
                                            for (let i = 0; i < foundUser.interests.length; i++) {
                                                if (foundUser.interests[i] == req.body.interest) {
                                                    newInterest = false;
                                                    break;
                                                }
                                            }
                                            if (newInterest) {
                                                foundUser.interests.push(req.body.interest);
                                                foundUser.save(function (err) {
                                                    if (err) {
                                                        res.redirect('error');
                                                    } else {
                                                        req.session.user = foundUser;
                                                        newPost.save(function(saveError) {
                                                            if (saveError) {
                                                                console.log(saveError);
                                                            } else {
                                                                res.redirect('announcements');
                                                            }
                                                        });
                                                    }
                                                });
                                            } else {
                                                newPost.save(function(saveError) {
                                                    if (saveError) {
                                                        console.log(saveError);
                                                    } else {
                                                        res.redirect('announcements');
                                                    }
                                                });
                                            }
                                        } else {
                                            res.redirect('error');
                                        }
                                    }
                                });
                            } else {
                                const addInterest = new Interest({
                                    name: req.body.addInterest,
                                    approved: true
                                });
                                addInterest.save(function(saveError) {
                                    if(saveError){
                                        console.log(saveError);
                                    }else{
                                        const newPost = new Post({
                                            author: req.body.username,
                                            text: req.body.postContent,
                                            interest: req.body.addInterest,
                                            master: true,
                                            date: new Date(),
                                            isReported: false,
                                            isVisible: true,
                                            isAnnouncement: true
                                        });
                                        User.findOne({username: req.session.user.username}, function(erro, foundUser) {
                                            if (erro) {
                                                res.redirect('error');
                                            } else {
                                                if (foundUser) {
                                                    let newInterest = true;
                                                    for (let i = 0; i < foundUser.interests.length; i++) {
                                                        if (foundUser.interests[i] == req.body.addInterest) {
                                                            newInterest = false;
                                                            break;
                                                        }
                                                    }
                                                    if (newInterest) {
                                                        foundUser.interests.push(req.body.addInterest);
                                                        foundUser.save(function (err) {
                                                            if (err) {
                                                                res.redirect('error');
                                                            } else {
                                                                req.session.user = foundUser;
                                                                newPost.save(function(saveErro) {
                                                                    if (saveErro) {
                                                                        console.log(saveErro);
                                                                    } else {
                                                                        res.redirect('announcements');
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        newPost.save(function(saveErro) {
                                                            if (saveErro) {
                                                                console.log(saveErro);
                                                            } else {
                                                                res.redirect('announcements');
                                                            }
                                                        });
                                                    }
                                                } else {
                                                    res.redirect('error');
                                                }
                                            }
                                        });
                                    }
                                });
                            
                            }
                        });
                    }
                }
                else {
                    const newPost = new Post({
                        author: req.body.username,
                        text: req.body.postContent,
                        interest: req.body.interest,
                        master: true,
                        date: new Date(),
                        isReported: false,
                        isVisible: true,
                        isAnnouncement: true
                    });
                    User.findOne({username: req.session.user.username}, function(error, foundUser) {
                        if (error) {
                            res.redirect('error');
                        } else {
                            if (foundUser) {
                                let newInterest = true;
                                for (let i = 0; i < foundUser.interests.length; i++) {
                                    if (foundUser.interests[i] == req.body.interest) {
                                        newInterest = false;
                                        break;
                                    }
                                }
                                if (newInterest) {
                                    foundUser.interests.push(req.body.interest);
                                    foundUser.save(function (err) {
                                        if (err) {
                                            res.redirect('error');
                                        } else {
                                            req.session.user = foundUser;
                                            newPost.save(function(saveError) {
                                                if (saveError) {
                                                    console.log(saveError);
                                                } else {
                                                    res.redirect('announcements');
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    newPost.save(function(saveError) {
                                        if (saveError) {
                                            console.log(saveError);
                                        } else {
                                            res.redirect('announcements');
                                        }
                                    });
                                }
                            } else {
                                res.redirect('error');
                            }
                        }
                    });
                }
            } else {
                res.redirect('error');
            }
        }
    } else {
        res.redirect('/');
    } 
});


// Interest Page
app.get('/interest/:interest', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            Post.find({isVisible: true, interest: req.params.interest}).exec(function(findPostError, foundPosts) {
                if (findPostError) {
                    console.log(findPostError);
                } else {
                    authors = []
                    for (post of foundPosts) {
                        authors.push(post.author);
                    }
                    User.find({$or: [{username:{$in: authors}}, {interest: {$all: [req.params.interest]}}]}).exec(function(findUserError, foundUsers) {
                        if (findUserError) {
                            console.log(findUserError);
                        } else {
                            res.render('interest', {user: req.session.user, pageInterest: req.params.interest, posts: foundPosts, users: foundUsers});
                        }
                    });
                }
            });
        }
    } else {
        res.redirect('/');
    }
});


app.post("/searchPost", (req,res)=>{
   //db.posts.find({$text: {$search: "comment reply"}, isVisible: true}, {score: {$meta: "textScore"}}).sort({score: {$meta: "textScore"}});
   if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            Post.find({$text: {$search: req.body.keywords}, author: {$ne: req.session.user.username}, isVisible: true}, {score: {$meta: "textScore"}}).sort({score: {$meta: "textScore"}}).exec(function(findPostError, foundPosts) {
                if (findPostError) {
                    console.log(findPostError);
                } else {
                    res.render('searchPostResults', {user: req.session.user, keywords: req.body.keywords, posts: foundPosts});
                }
            });
        }
    } else {
        res.redirect('/');
    }
});

app.get("/viewPost/postId/:postId", (req,res)=>{
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
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
        }
    } else {
        res.redirect('/');
    }
    
});

// Deprecated?
// app.post('/viewPost', (req, res) => {
//     if (req.session.user) {
//         if (req.session.user.isBanned) {
//             res.render('ban', {user: req.session.user, banned: req.session.user});
//         } else {
//             const user = req.body.user;
//             const postId = req.body.postId; 
//             Post.findOne({_id: mongoose.Types.ObjectId(postId)}, function(findPostError, foundPost) {
//                 if (findPostError) {
//                     console.log(findPostError);
//                 } else {
//                     if (foundPost) {
//                         res.render('post', {postJSON: foundPost, user: user});
//                     }
//                 }  
//             });
//         }
//     } else {
//         res.redirect('/');
//     }
// });

app.get("/like/postId/:postId", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.status(403).render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const user = req.session.user.username;
            const postId = req.params.postId;
            if (!mongoose.Types.ObjectId.isValid(postId)) {
                res.status(400).render('error', {user: req.session.user});
            } else {
                Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) {
                    if (findPostError) {
                        console.log(findPostError);
                        res.status(500).render('error', {user: req.session.user});
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
                                res.status(500).render('error', {user: req.session.user});
                            } else {
                                res.redirect('back');
                            }
                        });
                    }
                }));
            }
        }
    } else {
        res.status(401).render('error');
    }
});

app.get("/unlike/postId/:postId", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.status(403).render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const user = req.session.user.username;
            const postId = req.params.postId;
            if (!mongoose.Types.ObjectId.isValid(postId)) {
                res.status(400).render('error', {user: req.session.user});
            } else {
                Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) {
                    if (findPostError) {
                        console.log(findPostError);
                        res.status(500).render('error', {user: req.session.user});
                    } else {
                        if (foundPost.likes.includes(user)) {
                            foundPost.likes.remove(user);
                        }
                        foundPost.save(function(saveError) {
                            if (saveError) {
                                console.log(saveError);
                                res.status(500).render('error', {user: req.session.user});
                            } else {
                                res.redirect('back');
                            }
                        });
                    }
                }));
            }
        }
    } else {
        res.status(401).render('error');
    }
});

app.get("/dislike/postId/:postId", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.status(403).render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const user = req.session.user.username;
            const postId = req.params.postId;
            if (!mongoose.Types.ObjectId.isValid(postId)) {
                res.status(400).render('error', {user: req.session.user});
            } else {
                Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) {
                    if (findPostError) {
                        console.log(findPostError);
                        res.status(500).render('error', {user: req.session.user});
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
                                res.status(500).render('error', {user: req.session.user});
                            } else {
                                res.redirect('back');
                            }
                        });
                    }
                }));    
            }
        }
    } else {
        res.status(401).render('error');
    }
});

app.get("/undislike/postId/:postId", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.status(403).render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const user = req.session.user.username;
            const postId = req.params.postId;
            if (!mongoose.Types.ObjectId.isValid(postId)) {
                res.status(400).render('error', {user: req.session.user});
            } else {
                Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) {
                    if (findPostError) {
                        console.log(findPostError);
                        res.status(500).render('error', {user: req.session.user});
                    } else {
                        if (foundPost.dislikes.includes(user)) {
                            foundPost.dislikes.remove(user);
                        }
                        foundPost.save(function(saveError) {
                            if (saveError) {
                                console.log(saveError);
                                res.status(500).render('error', {user: req.session.user});
                            } else {
                                res.redirect('back');
                            }
                        });
                    }
                }));
            }
        }
    } else {
        res.status(401).render('error');
    }
});

app.post("/makeComment", (req,res)=>{
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            Post.findOne({_id: mongoose.Types.ObjectId(req.body.parentPost)}, function(error, post){
                if (error){
                    console.log(error);
                    res.redirect('error');
                }
                else {
                    if (post) {
                        const newPost = new Post({
                            author: req.body.username,
                            text: req.body.postContent,
                            interest: post.interest,
                            master: false,
                            date: new Date(),
                            isReported: false,
                            isVisible: true
                        });
                        newPost.save();
                        post.comments.push(newPost);
                        post.save();
                        res.redirect("back");
                    }
                }
            });
        }
    } else {
        res.redirect('/');
    }
});

app.get("/delete/postId/:postId", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const postId = req.params.postId;
            Post.findOne({_id: mongoose.Types.ObjectId(postId)}, function(error, post){
                if (error){
                    console.log(error);
                    res.redirect('error');
                }
                else {
                    if (post) {
                        if (req.session.user.username == post.author || req.session.user.isAdmin) {
                            Post.deleteOne({_id: mongoose.Types.ObjectId(postId)}, (function(deletePostError) {
                                if (deletePostError) {
                                    console.log(deletePostError);
                                } else {
                                    res.redirect('back');
                                }
                            }));
                        }
                    }
                }
            });
        }
    } else {
        res.redirect('/');
    }
    
});

app.get("/report/postId/:postId", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const postId = req.params.postId;
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
        }
    } else {
        res.redirect('/');
    }
});

app.get("/ignore/postId/:postId", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const postId = req.params.postId;
            Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(reportPostError, reportPost) {
                if (reportPostError) {
                    console.log(reportPostError);
                } else {
                    reportPost.isReported=false;
                    reportPost.save(function(saveError) {
                        if (saveError) {
                            console.log(saveError);
                        } else {
                            res.redirect('back');
                        }
                    });
                }
            }));
        }
    } else {
        res.redirect('/');
    }
});


// Admin Functionalities
app.get("/viewReportedPosts", (req,res)=>{
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            if (req.session.user.isAdmin) {
                Post.find({isReported: true}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                    if (findPostError) {
                        console.log(findPostError);
                    } else {
                        res.render('reportedPosts', {user: req.session.user, posts: foundPosts});
                    }
                });
            } else {
                res.redirect('error');
            }
        }
    } else {
        res.redirect('/');
    }
});

app.get("/viewBannedUsers", (req, res)=> {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            if (req.session.user.isAdmin) {
                User.find({isBanned: {$eq: true}}).exec(function(findPostError, foundUsers) {
                    if (findPostError) {
                        console.log(findPostError);
                    } else {
                        res.render('bannedUsers', {users: foundUsers});
                    }
                });
            } else {
                res.redirect('error');
            }
        }
    } else {
        res.redirect('/');
    }
});

app.get("/ban/username/:username", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            if (req.session.user.isAdmin) {
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
            } else {
                res.redirect('error');
            }
        }
    } else {
        res.redirect('/');
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

app.get("/viewInterestSubmissions", (req,res)=>{
    Interest.find({approved: false}, function(error, foundTags){
        if(error){
            console.log(error);
        }else{
            res.render('viewInterestSubmissions', {tags: foundTags});
        }
    });
});

app.get("/approve/tag/:id", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            if (req.session.user.isAdmin) {
                Interest.findByIdAndUpdate(req.params.id, {approved: true}, function(error){
                    if(error){
                        console.log(error);
                    }else{
                        res.redirect('back');
                    }
                });
            } else {
                res.redirect('error');
            }
        }
    } else {
        res.redirect('/');
    }
});

app.get("/reject/tag/:id", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            if (req.session.user.isAdmin) {
                Interest.deleteOne({_id: req.params.id}, (function(deleteTagError) {
                    if (deleteTagError) {
                        console.log(deleteTagError);
                        res.redirect('error');
                    } else {
                        res.redirect('back');
                    }
                }));
            } else {
                res.redirect('error');
            }
        }
    } else {
        res.redirect('/');
    }
});


app.all("*", (req, res) => {
    if (req.session.user) {
        if (req.session.user.isBanned) {
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            res.render('error', {user: req.session.user});
        }
    } else {
        res.status(404).render('error');
    }
});


// Run Site
// app.listen(port, () => console.log('Node server listening on port 6969!'));
module.exports = {app: app, mongoose: mongoose, User: User, Post: Post, Interest: Interest};