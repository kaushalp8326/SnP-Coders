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
app.use(session({           //setting up client session
    cookieName: 'session',
    secret: 'AAKL',
    duration: 30 * 60 * 1000,         //user will be auto logged out if they do not log in for this duration
    activeDuration: 5 * 60 * 1000,      //user will be auto logged out if they are inactive on the page for this duration
  }));

// module.exports = app;


mongoose.connect('mongodb+srv://snpAdmin:s&pCoders@wsm.cuhkw.mongodb.net/test', {useNewUrlParser: true, useUnifiedTopology: true});


const userSchema = { //schema in MongoDB for user
    username: String,   //username 
    email: String,      //email account for user
    password: String,   //hashed password for user
    isAdmin: Boolean,   //boolean for admin
    isBanned: Boolean,  //boolean for if user is banned by admin
    picture: String,    //string of URL for profile picture
    bio: String,        //string containing user bio
    joined: Date,       //date account was made
    following: [String],    //array of usernames of users that this person follows
    followers: [String],    //array of usernames of users that follow this person
    interests: [String]     //array of interests that this user has 
};

const postSchema = { //schema in MongoDB for a post
    text: String, //text contents of the post
    author: String, //username of the post author
    likes: [String], //list of usernames who liked the post
    dislikes: [String], //list of users who disliked the post
    master: Boolean, //if master is true, this is the original post, else it is a comment
    date: Date, //date the post was made
    interest: String, //name of the interest
    isReported: Boolean, //boolean for if the post is reported by another user
    isVisible: Boolean, //if boolean if false, post will not be seen
    isAnnouncement: Boolean, //if true, it has been made by an admin and will be on announcements page
    comments: [{type: mongoose.Types.ObjectId, ref: "Post"}] //list of posts that are replies to the post
};

const interestSchema = { //schema in MongoDB for an interest
    name: String, //interest name
    approved: Boolean //boolean to see if the interest is approved by an admin
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
    let registerFail = checkValidCredentials(req.body.email, req.body.username, req.body.password);  //list of reasons why register fails
    User.findOne({email: req.body.email}, function(error, foundEmail) { //checks if there is already an existing account for that username
        if (error) {
            console.log(error);
            res.redirect('register');
        } else {
            if (foundEmail) { //if email is found, then an account already exists with that email
                registerFail.push("Email is already taken."); //push error message to registerFail
            }
            User.findOne({username: req.body.username}, function(erro, foundUser) { //checks if there is an existing account for that username
                if (erro) {
                    console.log(erro);
                    res.redirect('register');
                } else { //if a username is found, return error message since that username already exists
                    if (foundUser) {
                        registerFail.push("Username is already taken."); //push error message to registerFail
                    }
                    if (registerFail.length == 0) { //if all are valid entries
                        bcrypt.hash(req.body.password, saltRounds, function(hashError, hash){ //hash password with bcrypt
                            if (hashError) {
                                console.log(hashError);
                                res.redirect('register');
                            } else { //if hash successful, we will make a new user in the DB
                                const newUser = new User({
                                    username: req.body.username,
                                    email: req.body.email,
                                    password: hash,
                                    joined: new Date()
                                });
                                newUser.save(function(saveError) { //save user to db
                                    if (saveError) {
                                        console.log(saveError);
                                        res.redirect('register');
                                    } else {
                                        req.session.user = newUser;
                                        Post.find({author: req.session.user.username}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                                            if (findPostError) {
                                                console.log(findPostError);
                                            } else {
                                                res.redirect('/home'); //redirect user to the home page
                                            }
                                        });
                                    }
                                });
                            } 
                        });
                    } else { //if there was an invalid field or error, set status to 406 and reload register with registerFail contents
                        res.status(406).render("register", {registerFail: registerFail});
                    }
                }
            });
        }
    });
});

// Function checks for valid credentials to create account
function checkValidCredentials(email, username, password) {
    let registerFail = [];
    if (!/[a-z]/i.test(email)) { //checks input for valid email format
        validEmail = false;
        registerFail.push("Please enter an email.");
    }

    if (!/[a-z]/i.test(username)) { //checks input for valid username format
        validUsername = false;
        registerFail.push("Please enter a username.");
    }

    if (!/[a-z]/i.test(password)) { //checks input for valid password format
        validPassword = false;
        registerFail.push("Please enter a password.");
    }

    return registerFail
}

// Login Pages
app.get('/login', (req, res) => {
    if (req.session.user) { //logs in with session user (cookie) info if it exists
        if (req.session.user.isBanned) { //if user is banned,redirect to the banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            res.redirect('home'); //goes to home page for user
        }
    }
    else { //if no session user, load the login page
        res.render('login');
    }
});

// Login function
app.post("/login", (req,res)=> { 
    const email = req.body.email; //get request email
    const password = req.body.password; //get request password
    User.findOne({email: email}, function(findUserError, foundUser){ //find user account in DB
        if (findUserError) {
            console.log(findUserError); //if error, log error and redirect to login
            res.redirect('login');
        } else {
            if (foundUser) { //if user is found in DB
                bcrypt.compare(password, foundUser.password, function(compareError, result) {//hash password and compare
                    if (compareError) { 
                        console.log(compareError);
                        res.redirect('login');
                    } else {
                        if (result === true) { //if passwords match, we will check to see if the user is bannned
                            if (foundUser.isBanned) { //if banned, render banned page
                                res.render('ban', {user: foundUser, banned: foundUser}); 
                            } else {
                                req.session.user = foundUser; //set session user to the user that signed in
                                res.redirect('home');
                            }
                        } else {
                            res.render('login', {loginfail: 'Failed login attempt'});
                        }
                    }
                });
            } else {
                res.render('login', {loginfail: 'Failed login attempt'}); //render login again with failed login info
            }
        }
    });
});


// Home Page
app.get('/home', (req, res) => {
    if (req.session.user) { //if session user exists
        if (req.session.user.isBanned) { //check if user is banned
            res.render('ban', {user: req.session.user, banned: req.session.user}); //render banned page
        } else {
            //find all posts made by users that this user follows
            Post.find({isVisible: true, author: {$in: req.session.user.following}}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                if (findPostError) {
                    console.log(findPostError);
                    res.redirect('error');
                } else {
                    let authors = []; //list of post authors
                    for (let post of foundPosts) { 
                        authors.push(post.author); //push usernames of authors to this list
                    }
                    User.find({username:{$in: authors}}).exec(function(findUserError, foundUsers) { //find users of these posts
                        if (findUserError) {
                            console.log(findUserError);
                            res.redirect('error');
                        } else {
                            //find the interests that all these users have
                            Interest.find({approved: true}).exec(function (findInterestError, foundInterests) {
                                if (findInterestError) {
                                    res.redirect('error');
                                } else {
                                    if (foundInterests) { //take found interests lists and use it to render the interest buttons the home page
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
    else { //if no session user, no one is signed in so we go to the landing page
        res.redirect('/');
    }
});


//Profile Pages

//default profile page
app.get('/profile', function (req, res) { //goes to the profile page of the session user
    if (req.session.user) { //if session user exists
        if (req.session.user.isBanned) { //if user is banned, redirect to banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else { //redirect to profile page of session user by calling get profile/:profile
            res.redirect('/profile/' + req.session.user.username); 
        }
    } else { //if no session user, no one is signed in so we go to the landing page
        res.redirect('/');
    }
});

//loads the profile of any user on the site
app.get('/profile/:profile', (req, res) => { 
    if (req.session.user) { //if session user exists
        if (req.session.user.isBanned) { //if user is banned, redirect to banned page
            res.redirect('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const username = req.params.profile; //username in the parameter of the request, i.e: profile/stevesmith, username = stevesmith
            if (req.params.profile == req.session.user.username) { //if the username is the same as the session user, load userPage ejs
                Post.find({author: req.session.user.username, isVisible: true}).sort({date: -1}).exec(function(findPostError, foundPosts) { //find all posts by session user
                    if (findPostError) {
                        console.log(findPostError);
                        res.redirect('../error');
                    } else { //find all approved interests
                        Interest.find({approved: true}).exec(function (findInterestError, foundInterests) {
                            if (findInterestError) {
                                res.redirect('../error');
                            } else {
                                if (foundInterests) { //render the page with the session user info, posts, and interests
                                    res.render('userPage', {user: req.session.user, posts: foundPosts, interests: foundInterests});
                                }
                            }
                        });
                    }
                });
            } else {//if this is not the profile of the session user
                User.findOne({username: username}, function(error, foundUser) { //find the user in the DB
                    if (error) {
                        console.log(error);
                        res.redirect('../error');
                    } else {
                        if(foundUser == null){ //if the user does not exist, then redirect to error page
                            res.redirect('../error');
                        }
                        Post.find({author: username, isVisible: true}).sort({date: -1}).exec(function(findPostError, foundPosts) { //if the user is found, then find all their posts
                            if (findPostError) {
                                console.log(findPostError);
                            } else {
                                if (foundUser) {
                                    //find all interests that are approved
                                    Interest.find({approved: true}).exec(function (findInterestError, foundInterests) {
                                        if (findInterestError) {
                                            res.redirect('../error');
                                        } else {
                                            if (foundInterests) { //if user is banned, load banned page
                                                if (foundUser.isBanned) {
                                                    res.render('ban', {user: req.session.user, banned: foundUser});
                                                } else { //render profile with user info, posts, and interests
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
    } else { //redirect to landing page if no session user
        res.redirect('/');
    }
    
});


// Announcements Page
app.get('/announcements', (req, res) => {
    if (req.session.user) {//if session user exists
        if (req.session.user.isBanned) {//if user is banned, redirect to banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else { //find all posts that have isAnnouncment == true
            Post.find({isAnnouncement: true}).sort({date: -1}).exec(function(findPostError, foundPosts) {
                if (findPostError) {
                    console.log(findPostError);
                } else {
                    let authors = []; //list of authors
                    for (let post of foundPosts) { //add post authors to authors []
                        authors.push(post.author); 
                    }
                    User.find({username:{$in: authors}}).exec(function(findUserError, foundUsers) { //find users who made these announcements
                        if (findUserError) {
                            console.log(findUserError);
                        } else {
                            Interest.find({approved: true}).exec(function (findInterestError, foundInterests) { //get list of approved interests
                                if (findInterestError) {
                                    res.redirect('error');
                                } else {
                                    if (foundInterests) { //render announcements with session user info, posts, post authors, and interests
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
        res.redirect('/'); //no session user so redirect to landing page
    }
});


// Explore Page
app.get("/explore", (req, res) => { //loads the explore page
    if (req.session.user) {//if session user exists
        if (req.session.user.isBanned) { //if user is banned, redirect to banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else { //find all unbanned users 
            User.find({isBanned: {$ne: true}, username: {$ne: req.session.user.username}}).exec(function(findPostError, foundUsers) {
                if (findPostError) {
                    console.log(findPostError);
                } else { //load explore page with users
                    res.render('explore', {user: req.session.user, users: foundUsers});
                }
            });
        }
    } else { //no session user so redirect to landing page
        res.redirect('/');
    }
});


// Popular Page
app.get('/popular', (req, res) => {
    if (req.session.user) { //if session user exists
        if (req.session.user.isBanned) { // if user is banned, redirect to banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            Post.find({isVisible: true}).sort({likes: -1}).exec(function(findPostError, foundPosts) {//find all visible posts
                foundPosts = sortPopular(foundPosts, 0, foundPosts.length - 1); //calls sortPopular method to sort posts by karma
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
        res.redirect('/'); //no session user so redirect to landing page
    }
});

function sortPopular(posts, start, end) { //quicksort algorithm that sorts posts by karma
    if (start < end) {
        let pivot = posts[end].likes.length - posts[end].dislikes.length;
        let i = (start - 1);
        let swapTemp;

        for (let j = start; j < end; j++) {//iterate from the start to the end
            if ((posts[j].likes.length - posts[j].dislikes.length) >= pivot) { //if karma is greater than or equal to the pivot value, swap with posts at i and increment
                i++;

                swapTemp = posts[i];
                posts[i] = posts[j];
                posts[j] = swapTemp;
            }
        }

        swapTemp = posts[i+1]; //swap pivot with element at i+i so all values less than pivot are left, and all greater than or equal to are on the right
        posts[i+1] = posts[end];
        posts[end] = swapTemp;

        posts = sortPopular(posts, start, i) //recursive quicksort on left
        posts = sortPopular(posts, i + 2, end) //recursive quicksort on right
    }

    return posts;
}


// Logout
app.get('/logout', (req, res) => {
    req.session.reset(); //reset session info
    res.redirect('/login'); //redirect to login
});


// Profile Interactions
app.get('/changePic', (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else { //render change pic page
            res.render('changePic', {user: req.session.user, invalidURL: false});
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
    
});

app.post("/changePic", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            if (isImageUrl(req.body.picture)) { //make sure the string entered is the url of an image
                User.findByIdAndUpdate(req.session.user._id, {picture: req.body.picture}, {new: true}, function (error, updatedUser) { //update user in DB with new profile picture
                    if (error) {
                        console.log(error);
                    }
                    else {
                        if (updatedUser) {
                            req.session.user = updatedUser; //update the session user information
                            res.redirect("/profile"); //redirect user to their profile page
                        }
                    }
                });
            } else { //retrun to change pic page and notify user of invalid image url
                res.render('changePic', {user: req.session.user, invalidURL: true}); 
            }
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});

app.get('/editBio', (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else { //render edit bio page
            res.render('editBio', {user: req.session.user});
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});

app.post("/editBio", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            User.findByIdAndUpdate(req.session.user._id, {bio: req.body.bio}, {new: true}, function (error, updatedUser) { //update user in DB with new bio
                if (error) {
                    console.log(error);
                }
                else {
                    if (updatedUser) {
                        req.session.user = updatedUser; //update the session user information
                        res.redirect("/profile"); //redirect user to their profile page
                    }
                }
            });
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});

app.get('/editInterests', (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else { //render edit interest page
            res.render('editInterests', {user: req.session.user});
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});

app.get("/delete/userint/:interest", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const uint = req.params.interest;
            User.findOne({username: req.session.user.username}, (function(error, foundUser) { //find user who is deleting their interest
                if (error) {
                    console.log(error);
                } else {
                    if(foundUser){
                        foundUser.interests.remove(uint); //remove interest from user interests array
                        foundUser.save(function (saveError){ //save user to database
                            if(saveError){
                                console.log(saveError);
                            }
                            else{
                                req.session.user = foundUser; //update the session user information
                                res.redirect('back'); //redirect user to previous page
                            }
                        });
                    }   
                }
            }));
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});


app.get('/followers/:username', (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const username = req.params.username;
            User.findOne({username: username}, function(error, foundUser) { //find user account in DB
                if (error) {
                    console.log(error);
                } else { //render followers page of the user
                    res.render('followers', {user: req.session.user, profileUser: foundUser});
                }
            });
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});

app.get('/following/:username', (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const username = req.params.username;
            User.findOne({username: username}, function(error, foundUser) { //find user account in DB
                if (error) { 
                    console.log(error);
                } else { //render following page of the user
                    res.render('following', {user: req.session.user, profileUser: foundUser});
                }
            });
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});


// User Interactions
app.get("/follow/username/:username", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const username = req.params.username;
            User.findOne({username: username}, function(error, foundUser) { //find user to follow in DB
                if (!foundUser.followers.includes(req.session.user.username)) { //add session user to list of followers of found user
                    foundUser.followers.push(req.session.user.username);
                }
                User.findOne({username: req.session.user.username}, function(err, foundClient) { //find session user account in DB
                    if (err) {
                        console.log(err);
                    }
                    else {
                        if (foundClient) { //check session user exists in DB
                            if (!foundClient.following.includes(foundUser.username)) { //add user to follow in list of following of session user
                                foundClient.following.push(foundUser.username);
                                foundClient.save(function (saveError) { //save session user to DB
                                    if (saveError) {
                                        console.log(saveError);
                                    } else {
                                        foundUser.save(function (saveErr) { //save followed user to DB
                                            if (saveErr) {
                                                console.log(saveErr);
                                            } else {
                                                req.session.user = foundClient; //update the session user information
                                                res.redirect('back'); //redirect user to previous page
                                            }
                                        });
                                    }
                                });
                            } else {
                                res.redirect('back');
                            }
                        }
                    }
                });
                
            });
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});

app.get("/unfollow/username/:username", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const username = req.params.username;
            User.findOne({username: username}, function(error, foundUser) { //find user to unfollow in DB
                if (foundUser.followers.includes(req.session.user.username)) { //remove session user from list of followers of found user
                    foundUser.followers.remove(req.session.user.username);
                }
                User.findOne({username: req.session.user.username}, function(err, foundClient) { //find session user account in DB
                    if (err) {
                        console.log(err);
                    }
                    else {
                        if (foundClient) { //check session user exists in DB
                            if (foundClient.following.includes(foundUser.username)) { //remove user to unfollow from list of following of session user
                                foundClient.following.remove(foundUser.username);
                                foundClient.save(function (saveError) { //save session user to DB
                                    if (saveError) {
                                        console.log(saveError);
                                    } else {
                                        foundUser.save(function (saveErr) { //save unfollowed user to DB
                                            if (saveErr) {
                                                console.log(saveErr);
                                            } else {
                                                req.session.user = foundClient; //update the session user information
                                                res.redirect('back'); //redirect user to previous page
                                            }
                                        });
                                    }
                                });
                            } else {
                                res.redirect('back');
                            }
                        }
                    }
                });
            });
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
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
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            if (req.body.interest == "Other") { //check if interest of the post is "Other"
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
            } else { //create new post with given interest
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
                User.findOne({username: req.session.user.username}, function(error, foundUser) { //find session user in DB
                    if (error) {
                        res.redirect('error');
                    } else {
                        if (foundUser) { //check session user exists in DB
                            let newInterest = true;
//Can't we just do an includes here?
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
        res.redirect('/'); //no session user so redirect to landing page
    } 
});

app.post("/makeAnnouncement",(req,res)=> {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
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
        res.redirect('/'); //no session user so redirect to landing page
    } 
});


// Interest Page
app.get('/interest/:interest', (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            Post.find({isVisible: true, interest: req.params.interest}).exec(function(findPostError, foundPosts) { //find posts tagged with given interest
                if (findPostError) {
                    console.log(findPostError);
                } else {
                    authors = [] //array containing authors of found posts
                    for (post of foundPosts) { //find author of each post
                        authors.push(post.author);
                    }
                    User.find({$or: [{username:{$in: authors}}, {interest: {$all: [req.params.interest]}}]}).exec(function(findUserError, foundUsers) { //find users tagged with given interest
                        if (findUserError) {
                            console.log(findUserError);
                        } else {
                            res.render('interest', {user: req.session.user, pageInterest: req.params.interest, posts: foundPosts, users: foundUsers}); //render interest page
                        }
                    });
                }
            });
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});


app.post("/searchPost", (req,res)=>{
   //db.posts.find({$text: {$search: "comment reply"}, isVisible: true}, {score: {$meta: "textScore"}}).sort({score: {$meta: "textScore"}});
   if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            Post.find({$text: {$search: req.body.keywords}, author: {$ne: req.session.user.username}, isVisible: true}, {score: {$meta: "textScore"}}).sort({score: {$meta: "textScore"}}).exec(function(findPostError, foundPosts) { //find posts matching search conditions
                if (findPostError) {
                    console.log(findPostError);
                } else {
                    res.render('searchPostResults', {user: req.session.user, keywords: req.body.keywords, posts: foundPosts}); //render search post results page
                }
            });
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});

app.get("/viewPost/postId/:postId", (req,res)=>{
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const postId = req.params.postId;
            Post.findOne({_id: mongoose.Types.ObjectId(postId)}).populate('comments').exec(function(err, post) { //find post with given ID in DB
                if (err) {
                    console.log(err);
                } else {
                    if (post) {
                        res.render('viewPost', {post: post, user: req.session.user}); //render post page
                    }
                }
            });
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
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
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.status(403).render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const user = req.session.user.username;
            const postId = req.params.postId;
            if (!mongoose.Types.ObjectId.isValid(postId)) { //check ID of given post is valid
                res.status(400).render('error', {user: req.session.user});
            } else {
                Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) { //find post with given ID in DB
                    if (findPostError) {
                        console.log(findPostError);
                        res.status(500).render('error', {user: req.session.user});
                    } else {
                        if (foundPost.dislikes.includes(user)) { //remove username from dislikes of post if previously disliked
                            foundPost.dislikes.remove(user);
                        }
                        if (!foundPost.likes.includes(user)) { //add username to likes of post if not previously liked
                            foundPost.likes.push(user);
                        }
                        foundPost.save(function(saveError) { //save post to DB
                            if (saveError) {
                                console.log(saveError);
                                res.status(500).render('error', {user: req.session.user});
                            } else {
                                res.redirect('back'); //load previous page
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
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.status(403).render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const user = req.session.user.username;
            const postId = req.params.postId;
            if (!mongoose.Types.ObjectId.isValid(postId)) { //check ID of given post is valid
                res.status(400).render('error', {user: req.session.user});
            } else {
                Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) { //find post with given ID in DB
                    if (findPostError) {
                        console.log(findPostError);
                        res.status(500).render('error', {user: req.session.user});
                    } else {
                        if (foundPost.likes.includes(user)) { //remove username from likes of post if previously liked
                            foundPost.likes.remove(user);
                        }
                        foundPost.save(function(saveError) { //save post to DB
                            if (saveError) {
                                console.log(saveError);
                                res.status(500).render('error', {user: req.session.user});
                            } else {
                                res.redirect('back'); //load previous page
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
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.status(403).render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const user = req.session.user.username;
            const postId = req.params.postId;
            if (!mongoose.Types.ObjectId.isValid(postId)) { //check ID of given post is valid
                res.status(400).render('error', {user: req.session.user});
            } else {
                Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) { //find post with given ID in DB
                    if (findPostError) {
                        console.log(findPostError);
                        res.status(500).render('error', {user: req.session.user});
                    } else {
                        if (foundPost.likes.includes(user)) { //remove username from likes of post if previously liked
                            foundPost.likes.remove(user);
                        }
                        if (!foundPost.dislikes.includes(user)) { //add username to dislikes of post if not previously disliked
                            foundPost.dislikes.push(user);
                        }
                        foundPost.save(function(saveError) { //save post to DB
                            if (saveError) {
                                console.log(saveError);
                                res.status(500).render('error', {user: req.session.user});
                            } else {
                                res.redirect('back'); //load previous page
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
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.status(403).render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const user = req.session.user.username;
            const postId = req.params.postId;
            if (!mongoose.Types.ObjectId.isValid(postId)) { //check ID of given post is valid
                res.status(400).render('error', {user: req.session.user});
            } else {
                Post.findOne({_id: mongoose.Types.ObjectId(postId)}, (function(findPostError, foundPost) { //find post with given ID in DB
                    if (findPostError) {
                        console.log(findPostError);
                        res.status(500).render('error', {user: req.session.user});
                    } else {
                        if (foundPost.dislikes.includes(user)) { //remove username from dislikes of post if previously disliked
                            foundPost.dislikes.remove(user);
                        }
                        foundPost.save(function(saveError) { //save post to DB
                            if (saveError) {
                                console.log(saveError);
                                res.status(500).render('error', {user: req.session.user});
                            } else {
                                res.redirect('back'); //load previous page
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
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
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
        res.redirect('/'); //no session user so redirect to landing page
    }
});

app.get("/delete/postId/:postId", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
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
        res.redirect('/'); //no session user so redirect to landing page
    }
    
});

app.get("/report/postId/:postId", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            const postId = req.params.postId;
            if (!mongoose.Types.ObjectId.isValid(postId)) {
                res.status(400).render('error', {user: req.session.user});
            } else {
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
        }
    } else {
        res.status(401).render('error');
    }
});

app.get("/ignore/postId/:postId", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
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
        res.redirect('/'); //no session user so redirect to landing page
    }
});


// Admin Functionalities
app.get("/viewReportedPosts", (req,res)=>{
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
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
                res.status(403).render('error');
            }
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});

app.get("/viewBannedUsers", (req, res)=> {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
            if (req.session.user.isAdmin) {
                User.find({isBanned: {$eq: true}}).exec(function(findPostError, foundUsers) {
                    if (findPostError) {
                        console.log(findPostError);
                    } else {
                        res.render('bannedUsers', {user: req.session.user, users: foundUsers});
                    }
                });
            } else {
                res.redirect('error');
            }
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
    }
});

app.get("/ban/username/:username", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
            res.render('ban', {user: req.session.user, banned: req.session.user});
        } else {
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
                res.status(403).render('error');
            }
        }
    } else {
        res.redirect('/'); //no session user so redirect to landing page
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
        res.status(403).render('error');
    }
});

app.get("/viewInterestSubmissions", (req,res)=>{
    Interest.find({approved: false}, function(error, foundTags){
        if(error){
            console.log(error);
        }else{
            res.render('viewInterestSubmissions', {user: req.session.user, tags: foundTags});
        }
    });
});

app.get("/approve/tag/:id", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
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
        res.redirect('/'); //no session user so redirect to landing page
    }
});

app.get("/reject/tag/:id", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
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
        res.redirect('/'); //no session user so redirect to landing page
    }
});


app.all("*", (req, res) => {
    if (req.session.user) { //make sure session user exists
        if (req.session.user.isBanned) { //if banned, render banned page
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